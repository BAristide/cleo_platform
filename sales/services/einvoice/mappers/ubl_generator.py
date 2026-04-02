"""
Générateur UBL 2.1 — Partagé MA et FR (Phase 2-3).
Stub : structure de base prête à être complétée dès publication des specs DGI/xHub.
"""

import logging
from xml.etree import ElementTree as ET

logger = logging.getLogger(__name__)

# Namespaces UBL 2.1
UBL_NAMESPACES = {
    'ubl': 'urn:oasis:names:specification:ubl:schema:xsd:Invoice-2',
    'cac': 'urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2',
    'cbc': 'urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2',
}


def build_ubl_invoice(invoice) -> str:
    """
    Génère un document UBL 2.1 Invoice en XML.
    Retourne le XML en chaîne de caractères.
    """
    try:
        root = ET.Element(
            'Invoice',
            {
                'xmlns': UBL_NAMESPACES['ubl'],
                'xmlns:cac': UBL_NAMESPACES['cac'],
                'xmlns:cbc': UBL_NAMESPACES['cbc'],
            },
        )

        # En-tête UBL
        ET.SubElement(root, 'cbc:UBLVersionID').text = '2.1'
        ET.SubElement(root, 'cbc:ID').text = invoice.number or ''
        ET.SubElement(root, 'cbc:IssueDate').text = (
            str(invoice.date) if invoice.date else ''
        )
        ET.SubElement(root, 'cbc:InvoiceTypeCode').text = '380'  # Commercial Invoice

        # Devise
        if invoice.currency:
            ET.SubElement(root, 'cbc:DocumentCurrencyCode').text = invoice.currency.code

        # Fournisseur (AccountingSupplierParty)
        supplier_party = ET.SubElement(root, 'cac:AccountingSupplierParty')
        party = ET.SubElement(supplier_party, 'cac:Party')
        party_name = ET.SubElement(party, 'cac:PartyName')
        ET.SubElement(party_name, 'cbc:Name').text = 'EC Intelligence'

        # Client (AccountingCustomerParty)
        customer_party = ET.SubElement(root, 'cac:AccountingCustomerParty')
        cust_party = ET.SubElement(customer_party, 'cac:Party')
        cust_name = ET.SubElement(cust_party, 'cac:PartyName')
        ET.SubElement(cust_name, 'cbc:Name').text = (
            invoice.company.name if invoice.company else ''
        )

        # Total
        monetary_total = ET.SubElement(root, 'cac:LegalMonetaryTotal')
        ET.SubElement(
            monetary_total,
            'cbc:TaxExclusiveAmount',
            currencyID=invoice.currency.code if invoice.currency else '',
        ).text = str(invoice.subtotal or 0)
        ET.SubElement(
            monetary_total,
            'cbc:TaxInclusiveAmount',
            currencyID=invoice.currency.code if invoice.currency else '',
        ).text = str(invoice.total or 0)
        ET.SubElement(
            monetary_total,
            'cbc:PayableAmount',
            currencyID=invoice.currency.code if invoice.currency else '',
        ).text = str(invoice.amount_due or 0)

        xml_str = ET.tostring(root, encoding='unicode', xml_declaration=False)
        return f'<?xml version="1.0" encoding="UTF-8"?>\n{xml_str}'

    except Exception as e:
        logger.warning(
            f'[UBL Generator] Erreur génération UBL pour {invoice.number}: {e}'
        )
        return None
