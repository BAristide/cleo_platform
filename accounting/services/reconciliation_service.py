"""Service de rapprochement bancaire automatique."""

from datetime import timedelta
from decimal import Decimal

from django.db.models import Q

from accounting.models import JournalEntryLine


class BankReconciliationService:
    """
    Service pour le rapprochement automatique et les suggestions
    entre lignes de relevé bancaire et écritures comptables.
    """

    # Tolérance en jours pour le matching par date
    DATE_TOLERANCE_DAYS = 3
    # Seuil de score pour le rapprochement automatique
    AUTO_RECONCILE_THRESHOLD = 90

    def get_bank_account_ids(self, statement):
        """Récupère les comptes comptables liés au journal bancaire du relevé."""
        journal = statement.journal_id
        # Le journal bancaire a un default_debit_account et/ou default_credit_account
        account_ids = set()
        if (
            hasattr(journal, 'default_debit_account_id')
            and journal.default_debit_account_id
        ):
            account_ids.add(journal.default_debit_account_id)
        if (
            hasattr(journal, 'default_credit_account_id')
            and journal.default_credit_account_id
        ):
            account_ids.add(journal.default_credit_account_id)
        # Fallback : chercher les comptes de classe 5 (trésorerie)
        if not account_ids:
            from accounting.models import Account

            bank_accounts = Account.objects.filter(
                code__startswith='5', is_active=True
            ).values_list('id', flat=True)
            account_ids.update(bank_accounts)
        return list(account_ids)

    def get_candidate_entry_lines(self, statement_line, account_ids=None):
        """
        Trouve les JournalEntryLine candidates pour le rapprochement.
        Critères : non lettrées, sur un compte bancaire, dans la fenêtre de date.
        """
        date_min = statement_line.date - timedelta(days=self.DATE_TOLERANCE_DAYS)
        date_max = statement_line.date + timedelta(days=self.DATE_TOLERANCE_DAYS)

        filters = Q(
            is_reconciled=False,
            entry_id__state='posted',
        )

        if account_ids:
            filters &= Q(account_id__in=account_ids)

        # Filtrer par fenêtre de date (date de l'écriture)
        filters &= Q(entry_id__date__gte=date_min, entry_id__date__lte=date_max)

        # Filtrer par montant compatible
        amount = statement_line.amount
        if amount >= 0:
            # Encaissement → on cherche des débits sur le compte banque
            filters &= Q(debit__gt=0)
        else:
            # Décaissement → on cherche des crédits sur le compte banque
            filters &= Q(credit__gt=0)

        return JournalEntryLine.objects.filter(filters).select_related(
            'entry_id', 'account_id', 'partner_id'
        )

    def score_match(self, statement_line, entry_line):
        """
        Calcule un score de correspondance entre 0 et 100.
        Critères pondérés :
        - Montant exact : 50 points
        - Date exacte : 20 points (dégressif avec la distance)
        - Même partenaire : 15 points
        - Référence similaire : 15 points
        """
        score = 0
        amount = abs(statement_line.amount)
        entry_amount = entry_line.debit if entry_line.debit > 0 else entry_line.credit

        # 1. Score montant (50 pts max)
        if amount == entry_amount:
            score += 50
        else:
            diff_pct = abs(amount - entry_amount) / max(amount, Decimal('0.01')) * 100
            if diff_pct <= 1:
                score += 40
            elif diff_pct <= 5:
                score += 20

        # 2. Score date (20 pts max)
        entry_date = entry_line.entry_id.date
        days_diff = abs((statement_line.date - entry_date).days)
        if days_diff == 0:
            score += 20
        elif days_diff == 1:
            score += 15
        elif days_diff <= 3:
            score += 10

        # 3. Score partenaire (15 pts)
        if (
            statement_line.partner_id
            and entry_line.partner_id
            and statement_line.partner_id == entry_line.partner_id
        ):
            score += 15

        # 4. Score référence (15 pts)
        if statement_line.ref and entry_line.ref:
            ref_sl = statement_line.ref.strip().upper()
            ref_el = entry_line.ref.strip().upper()
            if ref_sl == ref_el:
                score += 15
            elif ref_sl in ref_el or ref_el in ref_sl:
                score += 10

        return score

    def get_suggestions(self, statement_line, account_ids=None, max_results=10):
        """
        Retourne les suggestions de rapprochement triées par score décroissant.
        """
        candidates = self.get_candidate_entry_lines(statement_line, account_ids)
        scored = []

        for entry_line in candidates:
            score = self.score_match(statement_line, entry_line)
            if score >= 20:  # Seuil minimum pour suggérer
                scored.append(
                    {
                        'entry_line_id': entry_line.id,
                        'entry_id': entry_line.entry_id.id,
                        'entry_name': entry_line.entry_id.name,
                        'entry_date': entry_line.entry_id.date.isoformat(),
                        'account_code': entry_line.account_id.code,
                        'account_name': entry_line.account_id.name,
                        'name': entry_line.name,
                        'ref': entry_line.ref or '',
                        'partner_name': entry_line.partner_id.name
                        if entry_line.partner_id
                        else None,
                        'debit': float(entry_line.debit),
                        'credit': float(entry_line.credit),
                        'amount': float(entry_line.debit - entry_line.credit),
                        'score': score,
                    }
                )

        scored.sort(key=lambda x: x['score'], reverse=True)
        return scored[:max_results]

    def reconcile_line(self, statement_line, entry_line_ids):
        """
        Rapproche une ligne de relevé avec des lignes d'écritures.
        """
        entry_lines = JournalEntryLine.objects.filter(id__in=entry_line_ids)

        if not entry_lines.exists():
            raise ValueError("Aucune ligne d'écriture trouvée")

        # Lier les lignes d'écritures à la ligne de relevé
        statement_line.journal_entry_line_ids.set(entry_lines)
        statement_line.is_reconciled = True
        statement_line.save(update_fields=['is_reconciled'])

        return statement_line

    def unreconcile_line(self, statement_line):
        """Annule le rapprochement d'une ligne de relevé."""
        statement_line.journal_entry_line_ids.clear()
        statement_line.is_reconciled = False
        statement_line.save(update_fields=['is_reconciled'])
        return statement_line

    def auto_reconcile(self, statement):
        """
        Rapprochement automatique : rapproche les lignes avec un score >= seuil.
        Retourne le nombre de lignes rapprochées.
        """
        account_ids = self.get_bank_account_ids(statement)
        unreconciled = statement.lines.filter(is_reconciled=False)

        reconciled_count = 0
        for line in unreconciled:
            suggestions = self.get_suggestions(line, account_ids, max_results=1)
            if suggestions and suggestions[0]['score'] >= self.AUTO_RECONCILE_THRESHOLD:
                best = suggestions[0]
                try:
                    self.reconcile_line(line, [best['entry_line_id']])
                    reconciled_count += 1
                except Exception:
                    continue

        return reconciled_count
