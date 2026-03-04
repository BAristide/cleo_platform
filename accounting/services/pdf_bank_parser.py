"""
Service de parsing de relevés bancaires PDF.
Stratégie multicouche : pdfplumber → tabula → OCR
Pack-agnostique — aucune référence à un pays, devise ou plan comptable.
"""

import hashlib
import re
from datetime import datetime
from decimal import Decimal, InvalidOperation
from io import BytesIO

# ── Heuristiques de colonnes (francophones, pack-agnostiques) ─────────────────

DATE_COLUMNS = {
    'date',
    'date opération',
    'date operation',
    'date op.',
    'date op',
    'date valeur',
    'dt',
    'dte',
}
LABEL_COLUMNS = {
    'libellé',
    'libelle',
    'désignation',
    'designation',
    'description',
    'détail',
    'detail',
    'nature',
    'opération',
    'operation',
    'motif',
}
REF_COLUMNS = {
    'réf',
    'ref',
    'référence',
    'reference',
    'n° opération',
    'n° op',
    'numéro',
    'numero',
    'id',
}
DEBIT_COLUMNS = {
    'débit',
    'debit',
    'montant débit',
    'montant debit',
    'retraits',
    'sorties',
    'retrait',
    'sortie',
}
CREDIT_COLUMNS = {
    'crédit',
    'credit',
    'montant crédit',
    'montant credit',
    'versements',
    'entrées',
    'entrees',
    'versement',
    'entrée',
    'entree',
}
AMOUNT_COLUMNS = {
    'montant',
    'amount',
    'solde mouvement',
    'mouvement',
}

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
}

DATE_FORMATS = [
    '%d/%m/%Y',
    '%d-%m-%Y',
    '%d.%m.%Y',
    '%d/%m/%y',
    '%d-%m-%y',
    '%d.%m.%y',
    '%Y-%m-%d',
]


# ── Utilitaires ───────────────────────────────────────────────────────────────


def parse_amount(raw: str) -> Decimal:
    """Convertit une chaîne de montant francophone en Decimal signé."""
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
    """Parse une date francophone en objet date. Retourne None si non parsable."""
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
    """Génère une référence de dédoublonnage déterministe (pack-agnostique)."""
    raw = f'{date.isoformat()}|{str(name).strip()[:50]}|{amount}'
    return f'PDF-{hashlib.md5(raw.encode()).hexdigest()[:12].upper()}'


def _normalize_header(h) -> str:
    if not h:
        return ''
    return str(h).lower().strip().replace('\n', ' ').replace('  ', ' ')


def _detect_columns(headers: list) -> dict:
    """Détecte les indices sémantiques depuis une liste d'en-têtes."""
    mapping = {}
    normalized = [_normalize_header(h) for h in headers]
    for i, h in enumerate(normalized):
        if h in DATE_COLUMNS and 'date' not in mapping:
            mapping['date'] = i
        elif h in LABEL_COLUMNS and 'label' not in mapping:
            mapping['label'] = i
        elif h in REF_COLUMNS and 'ref' not in mapping:
            mapping['ref'] = i
        elif h in DEBIT_COLUMNS and 'debit' not in mapping:
            mapping['debit'] = i
        elif h in CREDIT_COLUMNS and 'credit' not in mapping:
            mapping['credit'] = i
        elif h in AMOUNT_COLUMNS and 'amount' not in mapping:
            mapping['amount'] = i
    return mapping


def _is_skip_row(row_values) -> bool:
    combined = ' '.join(str(v).lower() for v in row_values if v)
    return any(kw in combined for kw in SKIP_KEYWORDS)


def _extract_from_table(table: list) -> list:
    """Extrait les transactions depuis un tableau (liste de listes)."""
    if not table or len(table) < 2:
        return []

    headers = table[0]
    col = _detect_columns(headers)

    has_date = 'date' in col
    has_label = 'label' in col
    has_amount = 'amount' in col or 'debit' in col or 'credit' in col

    if not (has_date and has_label and has_amount):
        return []

    transactions = []

    for row in table[1:]:
        if not row or len(row) < 2:
            continue
        if _is_skip_row(row):
            continue

        txn_date = parse_date(
            row[col['date']] if 'date' in col and col['date'] < len(row) else None
        )
        if not txn_date:
            continue

        label = (
            str(row[col['label']] or '').strip()
            if 'label' in col and col['label'] < len(row)
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
                str(row[col['credit']] or '') if col['credit'] < len(row) else ''
            )
            if d != 0:
                amount = -abs(d)
            elif c != 0:
                amount = abs(c)
            else:
                continue
        elif 'debit' in col:
            amount = -abs(
                parse_amount(
                    str(row[col['debit']] or '') if col['debit'] < len(row) else ''
                )
            )
            if amount == 0:
                continue
        elif 'credit' in col:
            amount = abs(
                parse_amount(
                    str(row[col['credit']] or '') if col['credit'] < len(row) else ''
                )
            )
            if amount == 0:
                continue
        elif 'amount' in col:
            amount = parse_amount(
                str(row[col['amount']] or '') if col['amount'] < len(row) else ''
            )
            if amount == 0:
                continue

        if 'ref' in col and col['ref'] < len(row):
            ref = str(row[col['ref']] or '').strip() or generate_ref(
                txn_date, label, amount
            )
        else:
            ref = generate_ref(txn_date, label, amount)

        transactions.append(
            {'date': txn_date, 'name': label, 'ref': ref, 'amount': amount}
        )

    return transactions


def _detect_balances(text: str):
    """Tente de détecter les soldes dans le texte brut. Retourne (start, end)."""
    t = text.lower()
    b_start = None
    b_end = None

    for p in [
        r'solde\s+(?:initial|ancien|pr[eé]c[eé]dent|report[eé]|d[eé]but)[:\s]+([0-9\s.,]+)',
        r'ancien\s+solde[:\s]+([0-9\s.,]+)',
    ]:
        m = re.search(p, t)
        if m:
            v = parse_amount(m.group(1))
            if v != 0:
                b_start = v
                break

    for p in [
        r'solde\s+(?:final|nouveau|cl[oô]tur[eé]|[aà]\s+la\s+fin)[:\s]+([0-9\s.,]+)',
        r'nouveau\s+solde[:\s]+([0-9\s.,]+)',
    ]:
        m = re.search(p, t)
        if m:
            v = parse_amount(m.group(1))
            if v != 0:
                b_end = v
                break

    return b_start, b_end


# ── Parsers ───────────────────────────────────────────────────────────────────


def _parse_pdfplumber(raw: bytes) -> dict:
    import pdfplumber  # noqa: PLC0415

    transactions = []
    full_text = ''

    with pdfplumber.open(BytesIO(raw)) as pdf:
        for page in pdf.pages:
            full_text += page.extract_text() or ''
            for table in page.extract_tables() or []:
                if table:
                    transactions.extend(_extract_from_table(table))

    b_start, b_end = _detect_balances(full_text)
    confidence = (
        'high' if len(transactions) >= 3 else ('medium' if transactions else 'low')
    )

    return {
        'transactions': transactions,
        'balance_start': b_start,
        'balance_end': b_end,
        'parser_used': 'pdfplumber',
        'confidence': confidence,
    }


def _parse_tabula(raw: bytes) -> dict:
    import tabula  # noqa: PLC0415

    tmp = '/tmp/cleo_bs_parse.pdf'
    with open(tmp, 'wb') as f:
        f.write(raw)

    dfs = tabula.read_pdf(tmp, pages='all', multiple_tables=True, silent=True)
    transactions = []

    for df in dfs or []:
        if df is not None and not df.empty:
            table = [list(df.columns)] + [list(r) for r in df.itertuples(index=False)]
            transactions.extend(_extract_from_table(table))

    confidence = (
        'high' if len(transactions) >= 3 else ('medium' if transactions else 'low')
    )

    return {
        'transactions': transactions,
        'balance_start': None,
        'balance_end': None,
        'parser_used': 'tabula',
        'confidence': confidence,
    }


def _parse_ocr(raw: bytes) -> dict:
    import pytesseract  # noqa: PLC0415
    from pdf2image import convert_from_bytes  # noqa: PLC0415

    images = convert_from_bytes(raw, dpi=200)
    full_text = ''
    for img in images:
        full_text += pytesseract.image_to_string(img, lang='fra') + '\n'

    # Extraction heuristique ligne par ligne pour l'OCR
    transactions = []
    date_line = re.compile(
        r'^(\d{2}[/.\-]\d{2}[/.\-]\d{2,4})\s+(.+?)(?:\s+([\d\s.,]+))?$'
    )
    for line in full_text.split('\n'):
        line = line.strip()
        if not line or _is_skip_row([line]):
            continue
        m = date_line.match(line)
        if not m:
            continue
        d = parse_date(m.group(1))
        if not d:
            continue
        label = m.group(2).strip()
        amount = parse_amount(m.group(3) or '')
        if amount == 0:
            continue
        transactions.append(
            {
                'date': d,
                'name': label,
                'ref': generate_ref(d, label, amount),
                'amount': amount,
            }
        )

    b_start, b_end = _detect_balances(full_text)

    return {
        'transactions': transactions,
        'balance_start': b_start,
        'balance_end': b_end,
        'parser_used': 'ocr',
        'confidence': 'low',
    }


# ── Interface publique ────────────────────────────────────────────────────────


class PDFBankParser:
    """
    Service d'extraction de transactions depuis un relevé bancaire PDF.
    Stratégie de fallback : pdfplumber → tabula → OCR
    Pack-agnostique : aucune référence à un pays, devise ou plan comptable.
    """

    @staticmethod
    def parse(pdf_file) -> dict:
        """
        Parse un relevé bancaire PDF.

        Args:
            pdf_file: BytesIO, TemporaryUploadedFile, ou bytes

        Returns:
            dict avec clés : transactions, balance_start, balance_end,
                             parser_used, confidence

        Raises:
            ValueError: si aucune transaction n'a pu être extraite
        """
        if isinstance(pdf_file, bytes):
            raw = pdf_file
        else:
            raw = pdf_file.read()
            if hasattr(pdf_file, 'seek'):
                pdf_file.seek(0)

        errors = []

        for parser_fn, name in [
            (_parse_pdfplumber, 'pdfplumber'),
            (_parse_tabula, 'tabula'),
            (_parse_ocr, 'ocr'),
        ]:
            try:
                result = parser_fn(raw)
                if result['transactions']:
                    return result
                errors.append(f'{name}: 0 transaction extraite')
            except ImportError:
                errors.append(f'{name}: non installé')
            except Exception as exc:
                errors.append(f'{name}: {exc}')

        raise ValueError(
            "Impossible d'extraire les transactions du PDF. "
            f'Détails : {" | ".join(errors)}'
        )
