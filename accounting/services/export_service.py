import csv
import io
from datetime import datetime
from decimal import Decimal

from django.template.loader import render_to_string
from django.utils.translation import gettext_lazy as _
from lxml import etree

try:
    import xlsxwriter
except ImportError:
    xlsxwriter = None

try:
    from weasyprint import HTML
except ImportError:
    HTML = None

from ..models import Account, FiscalPeriod, Journal, JournalEntry, JournalEntryLine


class ImportExportService:
    """Service pour l'import/export de données comptables."""

    @staticmethod
    def export_journal_entries(start_date, end_date, journal_id=None, format='csv'):
        """
        Exporte les écritures comptables dans le format spécifié.

        Args:
            start_date (date): Date de début
            end_date (date): Date de fin
            journal_id (int, optional): ID du journal. Defaults to None.
            format (str, optional): Format d'export ('csv', 'excel', 'xml'). Defaults to 'csv'.

        Returns:
            bytes/str: Contenu de l'export

        Raises:
            ValueError: Si le format n'est pas supporté
        """
        # Filtrer les écritures
        entries = JournalEntry.objects.filter(
            date__gte=start_date, date__lte=end_date, state='posted'
        )

        if journal_id:
            entries = entries.filter(journal_id=journal_id)

        # Récupérer les lignes
        lines = JournalEntryLine.objects.filter(entry_id__in=entries).order_by(
            'entry_id__date', 'entry_id__id', 'id'
        )

        # Formater les données selon le format demandé
        if format == 'csv':
            return ImportExportService._export_to_csv(lines)
        elif format == 'excel':
            if not xlsxwriter:
                raise ValueError(_("Le module xlsxwriter n'est pas installé"))
            return ImportExportService._export_to_excel(lines)
        elif format == 'xml':
            return ImportExportService._export_to_xml(lines)
        else:
            raise ValueError(_("Format d'export non supporté: {}").format(format))

    @staticmethod
    def _export_to_csv(lines):
        """
        Exporte les lignes d'écritures au format CSV.

        Args:
            lines (QuerySet): QuerySet de JournalEntryLine

        Returns:
            str: Contenu CSV
        """
        output = io.StringIO()
        writer = csv.writer(output)

        # En-têtes
        headers = [
            _('Date'),
            _('Journal'),
            _('Numéro pièce'),
            _('Référence'),
            _('Compte'),
            _('Libellé'),
            _('Partenaire'),
            _('Débit'),
            _('Crédit'),
            _('Analytique'),
        ]
        writer.writerow(headers)

        # Lignes
        for line in lines:
            writer.writerow(
                [
                    line.entry_id.date.strftime('%d/%m/%Y'),
                    line.entry_id.journal_id.code,
                    line.entry_id.name,
                    line.entry_id.ref,
                    line.account_id.code,
                    line.name,
                    line.partner_id.name if line.partner_id else '',
                    str(line.debit),
                    str(line.credit),
                    line.analytic_account_id.code if line.analytic_account_id else '',
                ]
            )

        return output.getvalue()

    @staticmethod
    def _export_to_excel(lines):
        """
        Exporte les lignes d'écritures au format Excel.

        Args:
            lines (QuerySet): QuerySet de JournalEntryLine

        Returns:
            bytes: Contenu Excel
        """
        output = io.BytesIO()
        workbook = xlsxwriter.Workbook(output)
        worksheet = workbook.add_worksheet(_('Écritures'))

        # Formats
        header_format = workbook.add_format(
            {'bold': True, 'align': 'center', 'bg_color': '#D3D3D3'}
        )
        date_format = workbook.add_format({'num_format': 'dd/mm/yyyy'})
        number_format = workbook.add_format({'num_format': '#,##0.00'})

        # En-têtes
        headers = [
            _('Date'),
            _('Journal'),
            _('Numéro pièce'),
            _('Référence'),
            _('Compte'),
            _('Libellé'),
            _('Partenaire'),
            _('Débit'),
            _('Crédit'),
            _('Analytique'),
        ]

        for col, header in enumerate(headers):
            worksheet.write(0, col, header, header_format)

        # Largeur des colonnes
        worksheet.set_column(0, 0, 12)  # Date
        worksheet.set_column(1, 1, 10)  # Journal
        worksheet.set_column(2, 2, 15)  # Numéro pièce
        worksheet.set_column(3, 3, 15)  # Référence
        worksheet.set_column(4, 4, 15)  # Compte
        worksheet.set_column(5, 5, 30)  # Libellé
        worksheet.set_column(6, 6, 20)  # Partenaire
        worksheet.set_column(7, 8, 15)  # Débit/Crédit
        worksheet.set_column(9, 9, 15)  # Analytique

        # Lignes
        for row, line in enumerate(lines, 1):
            worksheet.write_datetime(
                row,
                0,
                datetime.combine(line.entry_id.date, datetime.min.time()),
                date_format,
            )
            worksheet.write(row, 1, line.entry_id.journal_id.code)
            worksheet.write(row, 2, line.entry_id.name)
            worksheet.write(row, 3, line.entry_id.ref)
            worksheet.write(row, 4, line.account_id.code)
            worksheet.write(row, 5, line.name)
            worksheet.write(row, 6, line.partner_id.name if line.partner_id else '')
            worksheet.write_number(row, 7, float(line.debit), number_format)
            worksheet.write_number(row, 8, float(line.credit), number_format)
            worksheet.write(
                row,
                9,
                line.analytic_account_id.code if line.analytic_account_id else '',
            )

        workbook.close()
        output.seek(0)
        return output.getvalue()

    @staticmethod
    def _export_to_xml(lines):
        """
        Exporte les lignes d'écritures au format XML.

        Args:
            lines (QuerySet): QuerySet de JournalEntryLine

        Returns:
            str: Contenu XML
        """
        root = etree.Element('JournalEntries')

        # Grouper les lignes par écriture
        entries_dict = {}
        for line in lines:
            entry_id = line.entry_id.id

            if entry_id not in entries_dict:
                entries_dict[entry_id] = {'entry': line.entry_id, 'lines': []}

            entries_dict[entry_id]['lines'].append(line)

        # Créer les éléments XML
        for entry_data in entries_dict.values():
            entry = entry_data['entry']
            entry_element = etree.SubElement(root, 'JournalEntry')

            etree.SubElement(entry_element, 'Date').text = entry.date.isoformat()
            etree.SubElement(entry_element, 'Journal').text = entry.journal_id.code
            etree.SubElement(entry_element, 'Number').text = entry.name
            etree.SubElement(entry_element, 'Reference').text = entry.ref
            etree.SubElement(entry_element, 'Narration').text = entry.narration

            lines_element = etree.SubElement(entry_element, 'Lines')

            for line in entry_data['lines']:
                line_element = etree.SubElement(lines_element, 'Line')

                etree.SubElement(
                    line_element, 'AccountCode'
                ).text = line.account_id.code
                etree.SubElement(line_element, 'Label').text = line.name
                etree.SubElement(line_element, 'Partner').text = (
                    line.partner_id.name if line.partner_id else ''
                )
                etree.SubElement(line_element, 'Debit').text = str(line.debit)
                etree.SubElement(line_element, 'Credit').text = str(line.credit)

                if line.analytic_account_id:
                    etree.SubElement(
                        line_element, 'AnalyticCode'
                    ).text = line.analytic_account_id.code

                if line.date_maturity:
                    etree.SubElement(
                        line_element, 'DueDate'
                    ).text = line.date_maturity.isoformat()

        # Formater le XML
        xml_string = etree.tostring(
            root, pretty_print=True, xml_declaration=True, encoding='UTF-8'
        )
        return xml_string

    @staticmethod
    def import_journal_entries(file_data, file_format='csv'):
        """
        Importe des écritures comptables depuis un fichier.

        Args:
            file_data (bytes): Contenu du fichier
            file_format (str, optional): Format du fichier ('csv', 'excel', 'xml'). Defaults to 'csv'.

        Returns:
            dict: Résultat de l'import

        Raises:
            ValueError: Si le format n'est pas supporté
        """
        if file_format == 'csv':
            return ImportExportService._import_from_csv(file_data)
        elif file_format == 'excel':
            if not xlsxwriter:
                raise ValueError(_("Le module xlsxwriter n'est pas installé"))
            return ImportExportService._import_from_excel(file_data)
        elif file_format == 'xml':
            return ImportExportService._import_from_xml(file_data)
        else:
            raise ValueError(_("Format d'import non supporté: {}").format(file_format))

    @staticmethod
    def _import_from_csv(file_data):
        """
        Importe des écritures depuis un fichier CSV.

        Args:
            file_data (bytes): Contenu du fichier CSV

        Returns:
            dict: Résultat de l'import
        """
        csv_file = io.StringIO(file_data.decode('utf-8'))
        reader = csv.DictReader(csv_file)

        # Vérifier les colonnes requises
        required_columns = [
            _('Date'),
            _('Journal'),
            _('Compte'),
            _('Libellé'),
            _('Débit'),
            _('Crédit'),
        ]
        missing_columns = [
            col for col in required_columns if col not in reader.fieldnames
        ]

        if missing_columns:
            return {
                'success': False,
                'errors': [
                    {
                        'type': 'missing_columns',
                        'message': _(
                            'Colonnes manquantes dans le fichier CSV: {}'
                        ).format(', '.join(missing_columns)),
                    }
                ],
            }

        # Traiter les lignes et créer les écritures
        entries = {}
        errors = []

        for row_num, row in enumerate(
            reader, 2
        ):  # 2 car la première ligne est l'en-tête
            try:
                # Récupérer les valeurs
                date_str = row[_('Date')]
                journal_code = row[_('Journal')]
                account_code = row[_('Compte')]
                label = row[_('Libellé')]
                debit_str = row[_('Débit')]
                credit_str = row[_('Crédit')]

                # Convertir les valeurs
                try:
                    date_value = datetime.strptime(date_str, '%d/%m/%Y').date()
                except ValueError:
                    raise ValueError(_('Format de date invalide: {}').format(date_str))

                try:
                    debit = float(debit_str.replace(',', '.')) if debit_str else 0
                except ValueError:
                    raise ValueError(
                        _('Format de débit invalide: {}').format(debit_str)
                    )

                try:
                    credit = float(credit_str.replace(',', '.')) if credit_str else 0
                except ValueError:
                    raise ValueError(
                        _('Format de crédit invalide: {}').format(credit_str)
                    )

                # Vérifier les données obligatoires
                if not journal_code:
                    raise ValueError(_('Journal non spécifié'))

                if not account_code:
                    raise ValueError(_('Compte non spécifié'))

                # Récupérer les objets depuis la base de données
                try:
                    journal = Journal.objects.get(code=journal_code)
                except Journal.DoesNotExist:
                    raise ValueError(_('Journal non trouvé: {}').format(journal_code))

                try:
                    account = Account.objects.get(code=account_code)
                except Account.DoesNotExist:
                    raise ValueError(_('Compte non trouvé: {}').format(account_code))

                # Créer ou récupérer l'écriture
                entry_key = f'{journal_code}_{date_value.isoformat()}'

                if entry_key not in entries:
                    # Déterminer la période fiscale
                    try:
                        period = FiscalPeriod.objects.get(
                            start_date__lte=date_value,
                            end_date__gte=date_value,
                            state='open',
                        )
                    except FiscalPeriod.DoesNotExist:
                        raise ValueError(
                            _('Période fiscale non trouvée pour la date: {}').format(
                                date_value
                            )
                        )

                    entries[entry_key] = {
                        'journal': journal,
                        'date': date_value,
                        'period': period,
                        'lines': [],
                    }

                # Ajouter la ligne
                entries[entry_key]['lines'].append(
                    {
                        'account': account,
                        'label': label,
                        'debit': Decimal(str(debit)),
                        'credit': Decimal(str(credit)),
                        'partner_code': row.get(_('Partenaire'), ''),
                        'analytic_code': row.get(_('Analytique'), ''),
                        'reference': row.get(_('Référence'), ''),
                    }
                )

            except ValueError as e:
                errors.append(
                    {'row': row_num, 'type': 'value_error', 'message': str(e)}
                )

        # Vérifier si toutes les écritures sont équilibrées
        for entry_key, entry_data in entries.items():
            total_debit = sum(line['debit'] for line in entry_data['lines'])
            total_credit = sum(line['credit'] for line in entry_data['lines'])

            if abs(total_debit - total_credit) > Decimal(
                '0.01'
            ):  # Tolérance pour les erreurs d'arrondi
                errors.append(
                    {
                        'entry': entry_key,
                        'type': 'unbalanced',
                        'message': _(
                            "L'écriture n'est pas équilibrée (débit: {}, crédit: {})"
                        ).format(total_debit, total_credit),
                    }
                )

        # S'il y a des erreurs, les retourner sans créer d'écritures
        if errors:
            return {'success': False, 'errors': errors}

        # Créer les écritures en base de données
        from django.contrib.auth.models import User
        from django.db import transaction

        created_entries = []

        with transaction.atomic():
            for entry_key, entry_data in entries.items():
                # Créer l'écriture
                entry = JournalEntry.objects.create(
                    name=entry_data['journal'].next_sequence(entry_data['date']),
                    journal_id=entry_data['journal'],
                    date=entry_data['date'],
                    period_id=entry_data['period'],
                    ref=entry_data['lines'][0].get('reference', ''),
                    narration=entry_data['lines'][0].get('label', ''),
                    is_manual=True,
                    created_by=User.objects.filter(
                        is_superuser=True
                    ).first(),  # À adapter selon l'utilisateur
                )

                # Créer les lignes
                for line_data in entry_data['lines']:
                    # Récupérer le partenaire
                    partner = None
                    if line_data['partner_code']:
                        from crm.models import Company

                        try:
                            partner = Company.objects.get(
                                code=line_data['partner_code']
                            )
                        except (Company.DoesNotExist, ImportError):
                            pass

                    # Récupérer le compte analytique
                    analytic_account = None
                    if line_data['analytic_code']:
                        try:
                            from ..models import AnalyticAccount

                            try:
                                analytic_account = AnalyticAccount.objects.get(
                                    code=line_data['analytic_code']
                                )
                            except AnalyticAccount.DoesNotExist:
                                pass
                        except ImportError:
                            pass

                    # Créer la ligne
                    JournalEntryLine.objects.create(
                        entry_id=entry,
                        account_id=line_data['account'],
                        name=line_data['label'],
                        partner_id=partner,
                        debit=line_data['debit'],
                        credit=line_data['credit'],
                        analytic_account_id=analytic_account,
                    )

                created_entries.append(entry)

        return {
            'success': True,
            'message': _('{} écritures importées avec succès').format(
                len(created_entries)
            ),
            'entries': [
                {'id': entry.id, 'name': entry.name} for entry in created_entries
            ],
        }

    @staticmethod
    def _import_from_excel(file_data):
        """
        Importe des écritures depuis un fichier Excel.

        Args:
            file_data (bytes): Contenu du fichier Excel

        Returns:
            dict: Résultat de l'import
        """
        # Utiliser pandas si disponible
        try:
            from io import BytesIO

            import pandas as pd

            df = pd.read_excel(BytesIO(file_data))
            csv_data = df.to_csv(encoding='utf-8')
            return ImportExportService._import_from_csv(csv_data.encode('utf-8'))
        except ImportError:
            return {
                'success': False,
                'errors': [
                    {
                        'type': 'missing_module',
                        'message': _("Le module pandas n'est pas installé"),
                    }
                ],
            }

    @staticmethod
    def _import_from_xml(file_data):
        """
        Importe des écritures depuis un fichier XML.

        Args:
            file_data (bytes): Contenu du fichier XML

        Returns:
            dict: Résultat de l'import
        """
        try:
            root = etree.fromstring(file_data)
        except Exception as e:
            return {
                'success': False,
                'errors': [
                    {
                        'type': 'xml_parse_error',
                        'message': _('Erreur lors du parsing XML: {}').format(str(e)),
                    }
                ],
            }

        entries = {}
        errors = []

        for entry_index, entry_elem in enumerate(root.xpath('//JournalEntry')):
            try:
                date_elem = entry_elem.find('Date')
                journal_elem = entry_elem.find('Journal')
                narration_elem = entry_elem.find('Narration')
                reference_elem = entry_elem.find('Reference')

                if date_elem is None or journal_elem is None:
                    raise ValueError(_('Éléments Date ou Journal manquants'))

                date_str = date_elem.text
                journal_code = journal_elem.text

                try:
                    date_value = datetime.strptime(date_str, '%Y-%m-%d').date()
                except ValueError:
                    raise ValueError(_('Format de date invalide: {}').format(date_str))

                try:
                    journal = Journal.objects.get(code=journal_code)
                except Journal.DoesNotExist:
                    raise ValueError(_('Journal non trouvé: {}').format(journal_code))

                # Déterminer la période fiscale
                try:
                    period = FiscalPeriod.objects.get(
                        start_date__lte=date_value,
                        end_date__gte=date_value,
                        state='open',
                    )
                except FiscalPeriod.DoesNotExist:
                    raise ValueError(
                        _('Période fiscale non trouvée pour la date: {}').format(
                            date_value
                        )
                    )

                # Créer l'entrée dans le dictionnaire
                entry_key = f'{journal_code}_{date_value.isoformat()}_{entry_index}'

                entries[entry_key] = {
                    'journal': journal,
                    'date': date_value,
                    'period': period,
                    'narration': narration_elem.text
                    if narration_elem is not None
                    else '',
                    'reference': reference_elem.text
                    if reference_elem is not None
                    else '',
                    'lines': [],
                }

                # Traiter les lignes
                for line_elem in entry_elem.xpath('.//Line'):
                    account_code_elem = line_elem.find('AccountCode')
                    label_elem = line_elem.find('Label')
                    debit_elem = line_elem.find('Debit')
                    credit_elem = line_elem.find('Credit')

                    if (
                        account_code_elem is None
                        or debit_elem is None
                        or credit_elem is None
                    ):
                        raise ValueError(
                            _('Éléments AccountCode, Debit ou Credit manquants')
                        )

                    account_code = account_code_elem.text

                    try:
                        account = Account.objects.get(code=account_code)
                    except Account.DoesNotExist:
                        raise ValueError(
                            _('Compte non trouvé: {}').format(account_code)
                        )

                    try:
                        debit = Decimal(debit_elem.text)
                    except Exception:
                        debit = Decimal('0.0')

                    try:
                        credit = Decimal(credit_elem.text)
                    except Exception:
                        credit = Decimal('0.0')

                    entries[entry_key]['lines'].append(
                        {
                            'account': account,
                            'label': label_elem.text if label_elem is not None else '',
                            'debit': debit,
                            'credit': credit,
                            'partner_code': '',
                            'analytic_code': line_elem.findtext('AnalyticCode', ''),
                            'reference': '',
                        }
                    )

            except ValueError as e:
                errors.append(
                    {'entry': entry_index, 'type': 'value_error', 'message': str(e)}
                )

        # Vérifier si toutes les écritures sont équilibrées
        for entry_key, entry_data in entries.items():
            total_debit = sum(line['debit'] for line in entry_data['lines'])
            total_credit = sum(line['credit'] for line in entry_data['lines'])

            if abs(total_debit - total_credit) > Decimal(
                '0.01'
            ):  # Tolérance pour les erreurs d'arrondi
                errors.append(
                    {
                        'entry': entry_key,
                        'type': 'unbalanced',
                        'message': _(
                            "L'écriture n'est pas équilibrée (débit: {}, crédit: {})"
                        ).format(total_debit, total_credit),
                    }
                )

        # S'il y a des erreurs, les retourner sans créer d'écritures
        if errors:
            return {'success': False, 'errors': errors}

        # Créer les écritures en base de données
        from django.contrib.auth.models import User
        from django.db import transaction

        created_entries = []

        with transaction.atomic():
            for entry_key, entry_data in entries.items():
                # Créer l'écriture
                entry = JournalEntry.objects.create(
                    name=entry_data['journal'].next_sequence(entry_data['date']),
                    journal_id=entry_data['journal'],
                    date=entry_data['date'],
                    period_id=entry_data['period'],
                    ref=entry_data['reference'],
                    narration=entry_data['narration'],
                    is_manual=True,
                    created_by=User.objects.filter(
                        is_superuser=True
                    ).first(),  # À adapter selon l'utilisateur
                )

                # Créer les lignes
                for line_data in entry_data['lines']:
                    # Récupérer le compte analytique
                    analytic_account = None
                    if line_data['analytic_code']:
                        try:
                            from ..models import AnalyticAccount

                            try:
                                analytic_account = AnalyticAccount.objects.get(
                                    code=line_data['analytic_code']
                                )
                            except AnalyticAccount.DoesNotExist:
                                pass
                        except ImportError:
                            pass

                    # Créer la ligne
                    JournalEntryLine.objects.create(
                        entry_id=entry,
                        account_id=line_data['account'],
                        name=line_data['label'],
                        debit=line_data['debit'],
                        credit=line_data['credit'],
                        analytic_account_id=analytic_account,
                    )

                created_entries.append(entry)

        return {
            'success': True,
            'message': _('{} écritures importées avec succès').format(
                len(created_entries)
            ),
            'entries': [
                {'id': entry.id, 'name': entry.name} for entry in created_entries
            ],
        }

    @staticmethod
    def export_ledger_to_excel(ledger_data):
        """
        Exporte les données du grand livre au format Excel.

        Args:
            ledger_data (dict): Données du grand livre

        Returns:
            bytes: Contenu Excel
        """
        if not xlsxwriter:
            raise ValueError(_("Le module xlsxwriter n'est pas installé"))

        output = io.BytesIO()
        workbook = xlsxwriter.Workbook(output)
        worksheet = workbook.add_worksheet(_('Grand Livre'))

        # Formats
        header_format = workbook.add_format(
            {'bold': True, 'align': 'center', 'bg_color': '#D3D3D3'}
        )
        date_format = workbook.add_format({'num_format': 'dd/mm/yyyy'})
        number_format = workbook.add_format({'num_format': '#,##0.00'})
        bold_format = workbook.add_format({'bold': True})

        # Titre
        worksheet.merge_range('A1:I1', _('Grand Livre'), bold_format)
        worksheet.merge_range(
            'A2:I2',
            _('Période du {} au {}').format(
                ledger_data['start_date'].strftime('%d/%m/%Y'),
                ledger_data['end_date'].strftime('%d/%m/%Y'),
            ),
            bold_format,
        )

        # En-têtes
        headers = [
            _('Date'),
            _('Journal'),
            _('Pièce'),
            _('Référence'),
            _('Partenaire'),
            _('Libellé'),
            _('Débit'),
            _('Crédit'),
            _('Solde'),
        ]

        row = 3

        for account_data in ledger_data['ledger']:
            account = account_data['account']

            # Titre du compte
            worksheet.merge_range(
                f'A{row}:I{row}', f'{account["code"]} - {account["name"]}', bold_format
            )
            row += 1

            # Solde initial
            worksheet.merge_range(f'A{row}:F{row}', _('Solde initial'), bold_format)
            worksheet.write(row - 1, 8, account_data['initial_balance'], number_format)
            row += 1

            # En-têtes des colonnes
            for col, header in enumerate(headers):
                worksheet.write(row - 1, col, header, header_format)
            row += 1

            # Lignes du compte
            for entry in account_data['entries']:
                worksheet.write_datetime(
                    row - 1,
                    0,
                    datetime.combine(entry['date'], datetime.min.time()),
                    date_format,
                )
                worksheet.write(row - 1, 1, entry['journal'])
                worksheet.write(row - 1, 2, entry['entry'])
                worksheet.write(row - 1, 3, entry['reference'])
                worksheet.write(row - 1, 4, entry['partner'])
                worksheet.write(row - 1, 5, entry['label'])
                worksheet.write_number(row - 1, 6, entry['debit'], number_format)
                worksheet.write_number(row - 1, 7, entry['credit'], number_format)
                worksheet.write_number(row - 1, 8, entry['balance'], number_format)
                row += 1

            # Solde final
            worksheet.merge_range(f'A{row}:F{row}', _('Solde final'), bold_format)
            worksheet.write(row - 1, 8, account_data['final_balance'], number_format)
            row += 2

        # Largeur des colonnes
        worksheet.set_column(0, 0, 12)  # Date
        worksheet.set_column(1, 1, 10)  # Journal
        worksheet.set_column(2, 2, 15)  # Pièce
        worksheet.set_column(3, 3, 15)  # Référence
        worksheet.set_column(4, 4, 20)  # Partenaire
        worksheet.set_column(5, 5, 30)  # Libellé
        worksheet.set_column(6, 8, 15)  # Débit/Crédit/Solde

        workbook.close()
        output.seek(0)
        return output.getvalue()

    @staticmethod
    def export_ledger_to_pdf(ledger_data):
        """
        Exporte les données du grand livre au format PDF.

        Args:
            ledger_data (dict): Données du grand livre

        Returns:
            bytes: Contenu PDF
        """
        if not HTML:
            raise ValueError(_("Le module weasyprint n'est pas installé"))

        # Préparer les données pour le template
        context = {
            'title': _('Grand Livre'),
            'start_date': ledger_data['start_date'],
            'end_date': ledger_data['end_date'],
            'ledger': ledger_data['ledger'],
            'date_format': '%d/%m/%Y',
        }

        # Rendre le HTML
        html_string = render_to_string(
            'accounting/reports/general_ledger.html', context
        )

        # Générer le PDF
        pdf_file = HTML(string=html_string).write_pdf()

        return pdf_file

    @staticmethod
    def export_balance_to_excel(balance_data):
        """
        Exporte les données de la balance au format Excel.

        Args:
            balance_data (dict): Données de la balance

        Returns:
            bytes: Contenu Excel
        """
        if not xlsxwriter:
            raise ValueError(_("Le module xlsxwriter n'est pas installé"))

        output = io.BytesIO()
        workbook = xlsxwriter.Workbook(output)
        worksheet = workbook.add_worksheet(_('Balance'))

        # Formats
        header_format = workbook.add_format(
            {'bold': True, 'align': 'center', 'bg_color': '#D3D3D3'}
        )
        number_format = workbook.add_format({'num_format': '#,##0.00'})
        bold_format = workbook.add_format({'bold': True})

        # Titre
        worksheet.merge_range('A1:F1', _('Balance des comptes'), bold_format)
        worksheet.merge_range(
            'A2:F2',
            _('Au {}').format(balance_data['date'].strftime('%d/%m/%Y')),
            bold_format,
        )

        # En-têtes
        headers = [
            _('Code'),
            _('Compte'),
            _('Débit'),
            _('Crédit'),
            _('Solde débiteur'),
            _('Solde créditeur'),
        ]

        for col, header in enumerate(headers):
            worksheet.write(3, col, header, header_format)

        # Lignes de la balance
        row = 4
        for item in balance_data['balance']:
            worksheet.write(row, 0, item['account']['code'])
            worksheet.write(row, 1, item['account']['name'])
            worksheet.write_number(row, 2, item['debit_sum'], number_format)
            worksheet.write_number(row, 3, item['credit_sum'], number_format)
            worksheet.write_number(row, 4, item['debit_balance'], number_format)
            worksheet.write_number(row, 5, item['credit_balance'], number_format)
            row += 1

        # Totaux
        worksheet.write(row, 0, '')
        worksheet.write(row, 1, _('Totaux'), bold_format)
        worksheet.write_number(row, 2, balance_data['total_debit_sum'], number_format)
        worksheet.write_number(row, 3, balance_data['total_credit_sum'], number_format)
        worksheet.write_number(
            row, 4, balance_data['total_debit_balance'], number_format
        )
        worksheet.write_number(
            row, 5, balance_data['total_credit_balance'], number_format
        )

        # Largeur des colonnes
        worksheet.set_column(0, 0, 15)  # Code
        worksheet.set_column(1, 1, 30)  # Compte
        worksheet.set_column(2, 5, 15)  # Montants

        workbook.close()
        output.seek(0)
        return output.getvalue()

    @staticmethod
    def export_balance_to_pdf(balance_data):
        """
        Exporte les données de la balance au format PDF.

        Args:
            balance_data (dict): Données de la balance

        Returns:
            bytes: Contenu PDF
        """
        if not HTML:
            raise ValueError(_("Le module weasyprint n'est pas installé"))

        # Préparer les données pour le template
        context = {
            'title': _('Balance des comptes'),
            'date': balance_data['date'],
            'balance': balance_data['balance'],
            'total_debit_sum': balance_data['total_debit_sum'],
            'total_credit_sum': balance_data['total_credit_sum'],
            'total_debit_balance': balance_data['total_debit_balance'],
            'total_credit_balance': balance_data['total_credit_balance'],
            'date_format': '%d/%m/%Y',
        }

        # Rendre le HTML
        html_string = render_to_string('accounting/reports/balance.html', context)

        # Générer le PDF
        pdf_file = HTML(string=html_string).write_pdf()

        return pdf_file

    @staticmethod
    def export_balance_sheet_to_excel(balance_sheet_data):
        """
        Exporte les données du bilan au format Excel.

        Args:
            balance_sheet_data (dict): Données du bilan

        Returns:
            bytes: Contenu Excel
        """
        if not xlsxwriter:
            raise ValueError(_("Le module xlsxwriter n'est pas installé"))

        output = io.BytesIO()
        workbook = xlsxwriter.Workbook(output)
        worksheet = workbook.add_worksheet(_('Bilan'))

        # Formats
        header_format = workbook.add_format(
            {'bold': True, 'align': 'center', 'bg_color': '#D3D3D3'}
        )
        number_format = workbook.add_format({'num_format': '#,##0.00'})
        bold_format = workbook.add_format({'bold': True})

        # Titre
        worksheet.merge_range('A1:C1', _('Bilan'), bold_format)
        worksheet.merge_range(
            'A2:C2',
            _('Au {}').format(balance_sheet_data['date'].strftime('%d/%m/%Y')),
            bold_format,
        )

        # En-têtes - Actif
        worksheet.merge_range('A4:C4', _('ACTIF'), header_format)
        worksheet.write(4, 0, _('Code'), header_format)
        worksheet.write(4, 1, _('Compte'), header_format)
        worksheet.write(4, 2, _('Montant'), header_format)

        # Lignes de l'actif
        row_actif = 5
        for item in balance_sheet_data['assets']:
            worksheet.write(row_actif, 0, item['account']['code'])
            worksheet.write(row_actif, 1, item['account']['name'])
            worksheet.write_number(row_actif, 2, item['balance'], number_format)
            row_actif += 1

        # Total actif
        worksheet.write(row_actif, 0, '')
        worksheet.write(row_actif, 1, _('Total Actif'), bold_format)
        worksheet.write_number(
            row_actif, 2, balance_sheet_data['total_assets'], number_format
        )
        row_actif += 2

        # En-têtes - Passif
        worksheet.merge_range(f'A{row_actif}:C{row_actif}', _('PASSIF'), header_format)
        row_actif += 1
        worksheet.write(row_actif, 0, _('Code'), header_format)
        worksheet.write(row_actif, 1, _('Compte'), header_format)
        worksheet.write(row_actif, 2, _('Montant'), header_format)
        row_actif += 1

        # Lignes du passif
        for item in balance_sheet_data['liabilities']:
            worksheet.write(row_actif, 0, item['account']['code'])
            worksheet.write(row_actif, 1, item['account']['name'])
            worksheet.write_number(row_actif, 2, item['balance'], number_format)
            row_actif += 1

        # Total passif
        worksheet.write(row_actif, 0, '')
        worksheet.write(row_actif, 1, _('Total Passif'), bold_format)
        worksheet.write_number(
            row_actif, 2, balance_sheet_data['total_liabilities'], number_format
        )

        # Largeur des colonnes
        worksheet.set_column(0, 0, 15)  # Code
        worksheet.set_column(1, 1, 40)  # Compte
        worksheet.set_column(2, 2, 15)  # Montant

        workbook.close()
        output.seek(0)
        return output.getvalue()

    @staticmethod
    def export_balance_sheet_to_pdf(balance_sheet_data):
        """
        Exporte les données du bilan au format PDF.

        Args:
            balance_sheet_data (dict): Données du bilan

        Returns:
            bytes: Contenu PDF
        """
        if not HTML:
            raise ValueError(_("Le module weasyprint n'est pas installé"))

        # Préparer les données pour le template
        context = {
            'title': _('Bilan'),
            'date': balance_sheet_data['date'],
            'assets': balance_sheet_data['assets'],
            'liabilities': balance_sheet_data['liabilities'],
            'total_assets': balance_sheet_data['total_assets'],
            'total_liabilities': balance_sheet_data['total_liabilities'],
            'difference': balance_sheet_data['difference'],
            'date_format': '%d/%m/%Y',
        }

        # Rendre le HTML
        html_string = render_to_string('accounting/reports/balance_sheet.html', context)

        # Générer le PDF
        pdf_file = HTML(string=html_string).write_pdf()

        return pdf_file

    @staticmethod
    def export_income_statement_to_excel(income_statement_data):
        """
        Exporte les données du compte de résultat au format Excel.

        Args:
            income_statement_data (dict): Données du compte de résultat

        Returns:
            bytes: Contenu Excel
        """
        if not xlsxwriter:
            raise ValueError(_("Le module xlsxwriter n'est pas installé"))

        output = io.BytesIO()
        workbook = xlsxwriter.Workbook(output)
        worksheet = workbook.add_worksheet(_('Compte de résultat'))

        # Formats
        header_format = workbook.add_format(
            {'bold': True, 'align': 'center', 'bg_color': '#D3D3D3'}
        )
        number_format = workbook.add_format({'num_format': '#,##0.00'})
        bold_format = workbook.add_format({'bold': True})

        # Titre
        worksheet.merge_range('A1:C1', _('Compte de résultat'), bold_format)
        worksheet.merge_range(
            'A2:C2',
            _('Période du {} au {}').format(
                income_statement_data['start_date'].strftime('%d/%m/%Y'),
                income_statement_data['end_date'].strftime('%d/%m/%Y'),
            ),
            bold_format,
        )

        # En-têtes - Charges
        worksheet.merge_range('A4:C4', _('CHARGES'), header_format)
        worksheet.write(4, 0, _('Code'), header_format)
        worksheet.write(4, 1, _('Compte'), header_format)
        worksheet.write(4, 2, _('Montant'), header_format)

        # Lignes des charges
        row = 5
        for item in income_statement_data['expenses']:
            worksheet.write(row, 0, item['account']['code'])
            worksheet.write(row, 1, item['account']['name'])
            worksheet.write_number(row, 2, item['balance'], number_format)
            row += 1

        # Total charges
        worksheet.write(row, 0, '')
        worksheet.write(row, 1, _('Total Charges'), bold_format)
        worksheet.write_number(
            row, 2, income_statement_data['total_expenses'], number_format
        )
        row += 2

        # En-têtes - Produits
        worksheet.merge_range(f'A{row}:C{row}', _('PRODUITS'), header_format)
        row += 1
        worksheet.write(row, 0, _('Code'), header_format)
        worksheet.write(row, 1, _('Compte'), header_format)
        worksheet.write(row, 2, _('Montant'), header_format)
        row += 1

        # Lignes des produits
        for item in income_statement_data['incomes']:
            worksheet.write(row, 0, item['account']['code'])
            worksheet.write(row, 1, item['account']['name'])
            worksheet.write_number(row, 2, item['balance'], number_format)
            row += 1

        # Total produits
        worksheet.write(row, 0, '')
        worksheet.write(row, 1, _('Total Produits'), bold_format)
        worksheet.write_number(
            row, 2, income_statement_data['total_incomes'], number_format
        )
        row += 2

        # Résultat
        worksheet.write(row, 0, '')
        worksheet.write(row, 1, _('RÉSULTAT'), bold_format)
        worksheet.write_number(row, 2, income_statement_data['result'], number_format)

        # Largeur des colonnes
        worksheet.set_column(0, 0, 15)  # Code
        worksheet.set_column(1, 1, 40)  # Compte
        worksheet.set_column(2, 2, 15)  # Montant

        workbook.close()
        output.seek(0)
        return output.getvalue()

    @staticmethod
    def export_income_statement_to_pdf(income_statement_data):
        """
        Exporte les données du compte de résultat au format PDF.

        Args:
            income_statement_data (dict): Données du compte de résultat

        Returns:
            bytes: Contenu PDF
        """
        if not HTML:
            raise ValueError(_("Le module weasyprint n'est pas installé"))

        # Préparer les données pour le template
        context = {
            'title': _('Compte de résultat'),
            'start_date': income_statement_data['start_date'],
            'end_date': income_statement_data['end_date'],
            'expenses': income_statement_data['expenses'],
            'incomes': income_statement_data['incomes'],
            'total_expenses': income_statement_data['total_expenses'],
            'total_incomes': income_statement_data['total_incomes'],
            'result': income_statement_data['result'],
            'date_format': '%d/%m/%Y',
        }

        # Rendre le HTML
        html_string = render_to_string(
            'accounting/reports/income_statement.html', context
        )

        # Générer le PDF
        pdf_file = HTML(string=html_string).write_pdf()

        return pdf_file

    @staticmethod
    def export_vat_declaration_to_excel(vat_data):
        """
        Exporte les données de la déclaration de TVA au format Excel.

        Args:
            vat_data (dict): Données de la déclaration de TVA

        Returns:
            bytes: Contenu Excel
        """
        if not xlsxwriter:
            raise ValueError(_("Le module xlsxwriter n'est pas installé"))

        output = io.BytesIO()
        workbook = xlsxwriter.Workbook(output)
        worksheet = workbook.add_worksheet(_('Déclaration TVA'))

        # Formats
        header_format = workbook.add_format(
            {'bold': True, 'align': 'center', 'bg_color': '#D3D3D3'}
        )
        number_format = workbook.add_format({'num_format': '#,##0.00'})
        bold_format = workbook.add_format({'bold': True})

        # Titre
        worksheet.merge_range('A1:C1', _('Déclaration de TVA'), bold_format)
        worksheet.merge_range(
            'A2:C2', _('Période: {}').format(vat_data['period']['name']), bold_format
        )

        # En-têtes - TVA Collectée
        row = 4
        worksheet.merge_range(f'A{row}:C{row}', _('TVA COLLECTÉE'), header_format)
        row += 1
        worksheet.write(row, 0, _('Taux'), header_format)
        worksheet.write(row, 1, _('Désignation'), header_format)
        worksheet.write(row, 2, _('Montant'), header_format)
        row += 1

        # Lignes de TVA collectée
        for item in vat_data['vat_collected']['details']:
            tax = item['tax']
            worksheet.write(row, 0, f'{tax["rate"]}%' if tax['rate'] else '')
            worksheet.write(row, 1, tax['name'])
            worksheet.write_number(row, 2, item['amount'], number_format)
            row += 1

        # Total TVA collectée
        worksheet.write(row, 0, '')
        worksheet.write(row, 1, _('Total TVA collectée'), bold_format)
        worksheet.write_number(
            row, 2, vat_data['vat_collected']['total'], number_format
        )
        row += 2

        # En-têtes - TVA Déductible
        worksheet.merge_range(f'A{row}:C{row}', _('TVA DÉDUCTIBLE'), header_format)
        row += 1
        worksheet.write(row, 0, _('Taux'), header_format)
        worksheet.write(row, 1, _('Désignation'), header_format)
        worksheet.write(row, 2, _('Montant'), header_format)
        row += 1

        # Lignes de TVA déductible
        for item in vat_data['vat_deductible']['details']:
            tax = item['tax']
            worksheet.write(row, 0, f'{tax["rate"]}%' if tax['rate'] else '')
            worksheet.write(row, 1, tax['name'])
            worksheet.write_number(row, 2, item['amount'], number_format)
            row += 1

        # Total TVA déductible
        worksheet.write(row, 0, '')
        worksheet.write(row, 1, _('Total TVA déductible'), bold_format)
        worksheet.write_number(
            row, 2, vat_data['vat_deductible']['total'], number_format
        )
        row += 2

        # Résultat
        if vat_data['is_credit']:
            result_label = _('Crédit de TVA')
        else:
            result_label = _('TVA à payer')

        worksheet.write(row, 0, '')
        worksheet.write(row, 1, result_label, bold_format)
        worksheet.write_number(row, 2, vat_data['absolute_vat_due'], number_format)

        # Largeur des colonnes
        worksheet.set_column(0, 0, 10)  # Taux
        worksheet.set_column(1, 1, 40)  # Désignation
        worksheet.set_column(2, 2, 15)  # Montant

        workbook.close()
        output.seek(0)
        return output.getvalue()

    @staticmethod
    def export_vat_declaration_to_pdf(vat_data):
        """
        Exporte les données de la déclaration de TVA au format PDF.

        Args:
            vat_data (dict): Données de la déclaration de TVA

        Returns:
            bytes: Contenu PDF
        """
        if not HTML:
            raise ValueError(_("Le module weasyprint n'est pas installé"))

        # Préparer les données pour le template
        context = {
            'title': _('Déclaration de TVA'),
            'period': vat_data['period'],
            'vat_collected': vat_data['vat_collected'],
            'vat_deductible': vat_data['vat_deductible'],
            'vat_due': vat_data['vat_due'],
            'is_credit': vat_data['is_credit'],
            'absolute_vat_due': vat_data['absolute_vat_due'],
            'date_format': '%d/%m/%Y',
        }

        # Rendre le HTML
        html_string = render_to_string(
            'accounting/reports/vat_declaration.html', context
        )

        # Générer le PDF
        pdf_file = HTML(string=html_string).write_pdf()

        return pdf_file
