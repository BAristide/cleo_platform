"""
Service de parsing de relevés bancaires PDF.
Stratégie : pdfplumber (extraction texte) + parsing heuristique par ancrage fin de ligne.
100% open-source, pack-agnostique, aucune API externe.
"""

import hashlib
import re
from datetime import datetime
from decimal import Decimal, InvalidOperation
from io import BytesIO

DATE_FORMATS = [
    '%d/%m/%Y',
    '%d-%m-%Y',
    '%d.%m.%Y',
    '%d/%m/%y',
    '%d-%m-%y',
    '%d.%m.%y',
    '%Y-%m-%d',
]

SKIP_KEYWORDS = {
    'solde',
    'report',
    'total',
    'sous-total',
    'sous total',
    'ancien solde',
    'nouveau solde',
    'balance',
    'à reporter',
    'total mouvements',
    'page',
}

DEBIT_KEYWORDS = {
    'prelevement',
    'prélévement',
    'commission',
    'com.',
    'vir.emis',
    'virement emis',
    'virement émis',
    'operation au debit',
    'opération au débit',
    'frais',
    'agios',
    'retrait',
    'paiement',
    'cheque emis',
    'chèque émis',
    'debit',
    'débit',
    'cotisation',
    'penalite',
    'pénalité',
}


def parse_amount(raw: str) -> Decimal:
    if not raw or not str(raw).strip():
        return Decimal('0')
    s = str(raw).strip()
    negative = False
    if s.startswith('(') and s.endswith(')'):
        negative = True
        s = s[1:-1]
    if s.startswith('-'):
        negative = True
        s = s[1:]
    s = s.replace('\xa0', '').replace('\u202f', '').replace(' ', '')
    if not s:
        return Decimal('0')
    if ',' in s and '.' in s:
        s = s.replace('.', '').replace(',', '.')
    elif ',' in s:
        s = s.replace(',', '.')
    s = re.sub(r'[^\d.]', '', s)
    if not s or s == '.':
        return Decimal('0')
    try:
        result = Decimal(s)
    except InvalidOperation:
        return Decimal('0')
    return -result if negative else result


def parse_date(raw):
    if not raw:
        return None
    s = str(raw).strip()
    for fmt in DATE_FORMATS:
        try:
            return datetime.strptime(s, fmt).date()
        except ValueError:
            continue
    return None


def generate_ref(date, name: str, amount: Decimal) -> str:
    raw = f'{date.isoformat()}|{str(name).strip()[:50]}|{amount}'
    return f'PDF-{hashlib.md5(raw.encode()).hexdigest()[:12].upper()}'


def _is_skip_row(row_values) -> bool:
    combined = ' '.join(str(v).lower() for v in row_values if v)
    return any(kw in combined for kw in SKIP_KEYWORDS)


def _detect_balances(text: str):
    t = text.lower()
    b_start = None
    b_end = None

    # (?<!\d) : ne pas demarrer au milieu d'un nombre (ex: evite 24 dans 2024)
    # (?!\d)  : ne pas finir au milieu d'un nombre
    AMOUNT_RE = re.compile(r'(?<!\d)\d{1,3}(?:\s\d{3})*[,.]\d{2}(?!\d)')

    def best_amount(line):
        candidates = AMOUNT_RE.findall(line)
        for raw in reversed(candidates):
            v = parse_amount(raw)
            if v > 0:
                return v
        return None

    for line in t.split('\n'):
        line = line.strip()
        if not line:
            continue
        if re.search(r'solde.{0,25}(depart|initial|ancien)', line):
            v = best_amount(line)
            if v:
                b_start = v
        elif re.search(r'solde.{0,25}(final|nouveau|cloture)', line):
            v = best_amount(line)
            if v:
                b_end = v

    return b_start, b_end


def _determine_sign(label: str, amount: Decimal) -> Decimal:
    """Détermine le signe du montant selon le libellé."""
    ll = label.lower()
    if any(kw in ll for kw in DEBIT_KEYWORDS):
        return -abs(amount)
    return abs(amount)


def _extract_from_tables(pages) -> list:
    """Extraction depuis tableaux structurés (PDF avec grilles)."""
    DATE_COLS = {
        'date',
        'date opération',
        'date operation',
        'date op.',
        'date valeur',
        'dt',
    }
    LABEL_COLS = {
        'libellé',
        'libelle',
        'désignation',
        'designation',
        'description',
        'nature',
        'opération',
        'operation',
    }
    DEBIT_COLS = {'débit', 'debit', 'retraits', 'sorties', 'retrait'}
    CREDIT_COLS = {'crédit', 'credit', 'versements', 'entrées', 'entrees', 'versement'}
    AMOUNT_COLS = {'montant', 'amount', 'mouvement'}

    transactions = []
    for page in pages:
        for table in page.extract_tables() or []:
            if not table or len(table) < 2:
                continue
            headers = [str(h or '').lower().strip() for h in table[0]]
            col = {}
            for i, h in enumerate(headers):
                if h in DATE_COLS and 'date' not in col:
                    col['date'] = i
                elif h in LABEL_COLS and 'label' not in col:
                    col['label'] = i
                elif h in DEBIT_COLS and 'debit' not in col:
                    col['debit'] = i
                elif h in CREDIT_COLS and 'credit' not in col:
                    col['credit'] = i
                elif h in AMOUNT_COLS and 'amount' not in col:
                    col['amount'] = i
            if 'date' not in col or 'label' not in col:
                continue
            for row in table[1:]:
                if not row or _is_skip_row(row):
                    continue
                txn_date = parse_date(
                    row[col['date']] if col['date'] < len(row) else None
                )
                if not txn_date:
                    continue
                label = (
                    str(row[col['label']] or '').strip()
                    if col['label'] < len(row)
                    else ''
                )
                if not label:
                    continue
                amount = Decimal('0')
                if 'debit' in col and 'credit' in col:
                    d = parse_amount(
                        str(row[col['debit']] or '') if col['debit'] < len(row) else ''
                    )
                    c = parse_amount(
                        str(row[col['credit']] or '')
                        if col['credit'] < len(row)
                        else ''
                    )
                    if d != 0:
                        amount = -abs(d)
                    elif c != 0:
                        amount = abs(c)
                    else:
                        continue
                elif 'amount' in col:
                    amount = parse_amount(
                        str(row[col['amount']] or '')
                        if col['amount'] < len(row)
                        else ''
                    )
                    if amount == 0:
                        continue
                    amount = _determine_sign(label, amount)
                else:
                    continue
                ref = generate_ref(txn_date, label, amount)
                transactions.append(
                    {'date': txn_date, 'name': label, 'ref': ref, 'amount': amount}
                )
    return transactions


def _extract_from_text(text: str) -> list:
    """
    Extraction depuis texte libre.
    Stratégie : ancrage sur DD MM YYYY + montant en FIN de ligne.
    Fonctionne même si le libellé contient des chiffres (ex: Akoley20).
    """
    transactions = []

    for line in text.split('\n'):
        line = line.strip()
        if not line or len(line) < 15:
            continue
        if _is_skip_row([line]):
            continue

        # Ancrage fin de ligne : cherche DD MM YYYY MONTANT$
        # Le $ force la recherche vers la fin — les chiffres du libellé sont ignorés
        m = re.search(
            r'(?:^|[^\d])(\d{1,2})\s+(\d{2})\s+(20\d{2})\s+(\d[\d\s.,]*)\s*$', line
        )
        if not m:
            # Fallback : DD/MM/YYYY LIBELLE MONTANT
            m2 = re.match(
                r'^(\d{2}[/.-]\d{2}[/.-]\d{2,4})\s+(.+?)\s+([+-]?[\d\s.,]+)$', line
            )
            if m2:
                txn_date = parse_date(m2.group(1))
                if not txn_date:
                    continue
                label = m2.group(2).strip()
                amount = _determine_sign(label, parse_amount(m2.group(3)))
                if amount == 0:
                    continue
                transactions.append(
                    {
                        'date': txn_date,
                        'name': label,
                        'ref': generate_ref(txn_date, label, amount),
                        'amount': amount,
                    }
                )
            continue

        dd, mm, yyyy = m.group(1).zfill(2), m.group(2).zfill(2), m.group(3)
        txn_date = parse_date(f'{dd}/{mm}/{yyyy}')
        if not txn_date:
            continue

        amount_raw = m.group(4).strip()
        amount = parse_amount(amount_raw)
        if amount == 0:
            continue

        # Tout ce qui précède la date matchée = code opération + libellé
        prefix = line[: m.start(1)].strip()

        # Supprime le code opération en tête (alphanum+espaces suivi de DD MM)
        label = re.sub(
            r'^[0-9A-Z][0-9A-Z\s]{1,14}\d{1,2}\s+\d{2}\s+', '', prefix
        ).strip()
        if not label:
            label = prefix
        if not label:
            continue

        amount = _determine_sign(label, amount)
        ref = generate_ref(txn_date, label, amount)
        transactions.append(
            {'date': txn_date, 'name': label, 'ref': ref, 'amount': amount}
        )

    return transactions


class PDFBankParser:
    """
    Service d'extraction de transactions depuis un relevé bancaire PDF.
    100% open-source — pdfplumber + heuristiques pack-agnostiques.
    Stratégie : tableaux structurés → texte libre ligne par ligne.
    """

    @staticmethod
    def parse(pdf_file) -> dict:
        if isinstance(pdf_file, bytes):
            raw = pdf_file
        else:
            raw = pdf_file.read()
            if hasattr(pdf_file, 'seek'):
                pdf_file.seek(0)

        import pdfplumber

        full_text = ''
        transactions = []

        try:
            with pdfplumber.open(BytesIO(raw)) as pdf:
                # Tentative 1 : tableaux structurés
                transactions = _extract_from_tables(pdf.pages)
                # Extraction texte pour soldes + fallback
                for page in pdf.pages:
                    full_text += (page.extract_text() or '') + '\n'
        except Exception as e:
            raise ValueError(f'Impossible de lire le PDF : {e}')

        # Tentative 2 : texte libre si aucun tableau
        if not transactions and full_text.strip():
            transactions = _extract_from_text(full_text)

        if not transactions:
            raise ValueError(
                'Aucune transaction extraite. '
                'Le PDF est peut-être scanné (image) — un outil OCR serait nécessaire.'
            )

        b_start, b_end = _detect_balances(full_text)
        confidence = 'high' if len(transactions) >= 3 else 'medium'

        return {
            'transactions': transactions,
            'balance_start': b_start,
            'balance_end': b_end,
            'parser_used': 'pdfplumber',
            'confidence': confidence,
        }
