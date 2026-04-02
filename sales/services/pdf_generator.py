import os
from datetime import datetime

from django.conf import settings
from django.template.loader import render_to_string
from django.utils import timezone
from weasyprint import CSS, HTML

from core.services import get_company_context


class PDFGenerator:
    """Service pour générer des PDF à partir des documents de vente"""

    @staticmethod
    def get_pdf_directory():
        """Récupère ou crée le répertoire pour stocker les PDFs"""
        pdf_dir = os.path.join(settings.MEDIA_ROOT, 'sales', 'pdf')
        os.makedirs(pdf_dir, exist_ok=True)
        return pdf_dir

    @staticmethod
    def get_pdf_filename(document):
        """Génère un nom de fichier pour le PDF"""
        doc_type = document.__class__.__name__.lower()
        sanitized_number = document.number.replace('/', '_').replace(' ', '_')
        timestamp = datetime.now().strftime('%Y%m%d%H%M%S')
        return f'{doc_type}_{sanitized_number}_{timestamp}.pdf'

    @staticmethod
    def generate_quote_pdf(quote):
        """Génère un PDF pour un devis"""

        items = quote.quoteitem_set.all()

        context = {
            'quote': quote,
            'company': quote.company,
            'contact': quote.contact,
            'items': items,
            'generated_at': timezone.now(),
            'company_info': get_company_context(),
        }

        html_string = render_to_string('sales/quote_pdf.html', context)

        pdf_dir = PDFGenerator.get_pdf_directory()
        pdf_filename = PDFGenerator.get_pdf_filename(quote)
        pdf_path = os.path.join(pdf_dir, pdf_filename)

        HTML(string=html_string).write_pdf(
            pdf_path,
            stylesheets=[
                CSS(string='@page { size: A4; margin: 1cm }'),
                CSS(
                    filename=os.path.join(
                        settings.STATIC_ROOT, 'sales/css/pdf_styles.css'
                    )
                ),
            ],
        )

        quote.pdf_file = os.path.join('sales', 'pdf', pdf_filename)
        quote.save(update_fields=['pdf_file'])

        return pdf_path

    @staticmethod
    def generate_order_pdf(order):
        """Génère un PDF pour une commande"""

        items = order.orderitem_set.all()

        context = {
            'order': order,
            'company': order.company,
            'contact': order.contact,
            'items': items,
            'generated_at': timezone.now(),
            'company_info': get_company_context(),
        }

        html_string = render_to_string('sales/order_pdf.html', context)

        pdf_dir = PDFGenerator.get_pdf_directory()
        pdf_filename = PDFGenerator.get_pdf_filename(order)
        pdf_path = os.path.join(pdf_dir, pdf_filename)

        HTML(string=html_string).write_pdf(
            pdf_path,
            stylesheets=[
                CSS(string='@page { size: A4; margin: 1cm }'),
                CSS(
                    filename=os.path.join(
                        settings.STATIC_ROOT, 'sales/css/pdf_styles.css'
                    )
                ),
            ],
        )

        order.pdf_file = os.path.join('sales', 'pdf', pdf_filename)
        order.save(update_fields=['pdf_file'])

        return pdf_path

    @staticmethod
    def _get_einvoice_context(invoice):
        """
        Retourne le contexte e-invoicing pour le template PDF.
        Génère un QR code base64 si la facture est certifiée ou simulée.
        """
        if invoice.einvoice_status not in ('certified', 'simulated'):
            return {}
        try:
            import base64
            import io

            import qrcode

            url = invoice.einvoice_verification_url or '#simulation'
            qr = qrcode.make(url)
            buffer = io.BytesIO()
            qr.save(buffer, format='PNG')
            qr_b64 = base64.b64encode(buffer.getvalue()).decode()

            return {
                'einvoice_data': {
                    'qr_code_base64': qr_b64,
                    'reference': invoice.einvoice_reference,
                    'certified_at': invoice.einvoice_certified_at,
                    'mode': 'simulation'
                    if invoice.einvoice_status == 'simulated'
                    else 'production',
                    'verification_url': invoice.einvoice_verification_url,
                }
            }
        except Exception as e:
            import logging

            logging.getLogger(__name__).warning(f'QR code génération échouée : {e}')
            return {}

    @staticmethod
    def generate_invoice_pdf(invoice):
        """Génère un PDF pour une facture"""

        items = invoice.invoiceitem_set.all()
        payments = invoice.payment_set.all() if hasattr(invoice, 'payment_set') else []

        context = {
            'invoice': invoice,
            'company': invoice.company,
            'contact': invoice.contact,
            'items': items,
            'payments': payments,
            'generated_at': timezone.now(),
            'company_info': get_company_context(),
            'payment_terms_labels': {
                'immediate': 'Paiement immédiat',
                '30_days': 'Paiement à 30 jours',
                '60_days': 'Paiement à 60 jours',
            },
        }

        if invoice.bank_account:
            context['bank_account'] = invoice.bank_account

        if hasattr(invoice, 'discount_percentage') and invoice.discount_percentage > 0:
            from decimal import Decimal

            if not hasattr(invoice, 'discount_amount'):
                discount_amount = (
                    invoice.subtotal * invoice.discount_percentage
                ) / Decimal('100')
                context['discount_amount'] = discount_amount

            if not hasattr(invoice, 'subtotal_after_discount'):
                subtotal_after_discount = invoice.subtotal - context.get(
                    'discount_amount', Decimal('0')
                )
                context['subtotal_after_discount'] = subtotal_after_discount

        # Contexte e-invoicing (QR code + filigrane simulation)
        context.update(PDFGenerator._get_einvoice_context(invoice))

        html_string = render_to_string('sales/invoice_pdf.html', context)

        pdf_dir = PDFGenerator.get_pdf_directory()
        pdf_filename = PDFGenerator.get_pdf_filename(invoice)
        pdf_path = os.path.join(pdf_dir, pdf_filename)

        HTML(string=html_string).write_pdf(
            pdf_path,
            stylesheets=[
                CSS(string='@page { size: A4; margin: 1cm }'),
                CSS(
                    filename=os.path.join(
                        settings.STATIC_ROOT, 'sales/css/pdf_styles.css'
                    )
                ),
            ],
        )

        invoice.pdf_file = os.path.join('sales', 'pdf', pdf_filename)
        invoice.save(update_fields=['pdf_file'])

        return pdf_path
