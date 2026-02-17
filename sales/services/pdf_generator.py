import os
from datetime import datetime

from django.conf import settings
from django.template.loader import render_to_string
from django.utils import timezone
from weasyprint import CSS, HTML


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

        # Récupérer les lignes du devis
        items = quote.quoteitem_set.all()

        context = {
            'quote': quote,
            'company': quote.company,
            'contact': quote.contact,
            'items': items,
            'generated_at': timezone.now(),
            'company_info': {
                'name': 'ECINTELLIGENCE',
                'address': 'La Marina Casablanca | Tour Oceanes 3 Bureau 03 Rez-De-Jardin',
                'city': 'Casablanca',
                'country': 'Maroc',
                'email': 'infos@ecintelligence.ma',
                'phone': '+(212) 5220 48-727/0666 366 018',
                'rc': '393329',
                'if_number': '25018675',
                'patente': '350424929',
                'ice': '00203009000092',
            },
        }

        # Rendre le HTML à partir du modèle
        html_string = render_to_string('sales/quote_pdf.html', context)

        # Chemin du fichier PDF
        pdf_dir = PDFGenerator.get_pdf_directory()
        pdf_filename = PDFGenerator.get_pdf_filename(quote)
        pdf_path = os.path.join(pdf_dir, pdf_filename)

        # Générer le PDF avec des marges réduites
        HTML(string=html_string).write_pdf(
            pdf_path,
            stylesheets=[
                CSS(string='@page { size: A4; margin: 1cm }'),  # Marges réduites à 1cm
                CSS(
                    filename=os.path.join(
                        settings.STATIC_ROOT, 'sales/css/pdf_styles.css'
                    )
                ),
            ],
        )

        # Mettre à jour le document
        quote.pdf_file = os.path.join('sales', 'pdf', pdf_filename)
        quote.save(update_fields=['pdf_file'])

        return pdf_path

    @staticmethod
    def generate_order_pdf(order):
        """Génère un PDF pour une commande"""

        # Récupérer les lignes de la commande
        items = order.orderitem_set.all()

        context = {
            'order': order,
            'company': order.company,
            'contact': order.contact,
            'items': items,
            'generated_at': timezone.now(),
            'company_info': {
                'name': 'ECINTELLIGENCE',
                'address': 'La Marina Casablanca | Tour Oceanes 3 Bureau 03 Rez-De-Jardin',
                'city': 'Casablanca',
                'country': 'Maroc',
                'email': 'infos@ecintelligence.ma',
                'phone': '+(212) 5220 48-727/0666 366 018',
                'rc': '393329',
                'if_number': '25018675',
                'patente': '350424929',
                'ice': '00203009000092',
            },
        }

        # Rendre le HTML à partir du modèle
        html_string = render_to_string('sales/order_pdf.html', context)

        # Chemin du fichier PDF
        pdf_dir = PDFGenerator.get_pdf_directory()
        pdf_filename = PDFGenerator.get_pdf_filename(order)
        pdf_path = os.path.join(pdf_dir, pdf_filename)

        # Générer le PDF avec des marges réduites
        HTML(string=html_string).write_pdf(
            pdf_path,
            stylesheets=[
                CSS(string='@page { size: A4; margin: 1cm }'),  # Marges réduites à 1cm
                CSS(
                    filename=os.path.join(
                        settings.STATIC_ROOT, 'sales/css/pdf_styles.css'
                    )
                ),
            ],
        )

        # Mettre à jour le document
        order.pdf_file = os.path.join('sales', 'pdf', pdf_filename)
        order.save(update_fields=['pdf_file'])

        return pdf_path

    @staticmethod
    def generate_invoice_pdf(invoice):
        """Génère un PDF pour une facture"""

        # Récupérer les lignes de la facture
        items = invoice.invoiceitem_set.all()

        # Récupérer les paiements associés
        payments = invoice.payment_set.all() if hasattr(invoice, 'payment_set') else []

        # Calculer les propriétés d'affichage pour les remises et autres attributs dérivés
        context = {
            'invoice': invoice,
            'company': invoice.company,
            'contact': invoice.contact,
            'items': items,
            'payments': payments,
            'generated_at': timezone.now(),
            'company_info': {
                'name': 'ECINTELLIGENCE',
                'address': 'La Marina Casablanca | Tour Oceanes 3 Bureau 03 Rez-De-Jardin',
                'city': 'Casablanca',
                'country': 'Maroc',
                'email': 'infos@ecintelligence.ma',
                'phone': '+(212) 5220 48-727/0666 366 018',
                'rc': '393329',
                'if_number': '25018675',
                'patente': '350424929',
                'ice': '00203009000092',
            },
            'payment_terms_labels': {
                'immediate': 'Paiement immédiat',
                '30_days': 'Paiement à 30 jours',
                '60_days': 'Paiement à 60 jours',
            },
        }

        # Ajouter les coordonnées bancaires si disponibles
        if invoice.bank_account:
            context['bank_account'] = invoice.bank_account

        # Ajouter les propriétés calculées pour la remise si non disponibles dans le modèle
        if hasattr(invoice, 'discount_percentage') and invoice.discount_percentage > 0:
            from decimal import Decimal

            if not hasattr(invoice, 'discount_amount'):
                # Calculer le montant de la remise si la propriété n'existe pas
                discount_amount = (
                    invoice.subtotal * invoice.discount_percentage
                ) / Decimal('100')
                context['discount_amount'] = discount_amount

            if not hasattr(invoice, 'subtotal_after_discount'):
                # Calculer le sous-total après remise si la propriété n'existe pas
                subtotal_after_discount = invoice.subtotal - context.get(
                    'discount_amount', Decimal('0')
                )
                context['subtotal_after_discount'] = subtotal_after_discount

        # Rendre le HTML à partir du modèle
        html_string = render_to_string('sales/invoice_pdf.html', context)

        # Chemin du fichier PDF
        pdf_dir = PDFGenerator.get_pdf_directory()
        pdf_filename = PDFGenerator.get_pdf_filename(invoice)
        pdf_path = os.path.join(pdf_dir, pdf_filename)

        # Générer le PDF avec des marges réduites
        HTML(string=html_string).write_pdf(
            pdf_path,
            stylesheets=[
                CSS(string='@page { size: A4; margin: 1cm }'),  # Marges réduites à 1cm
                CSS(
                    filename=os.path.join(
                        settings.STATIC_ROOT, 'sales/css/pdf_styles.css'
                    )
                ),
            ],
        )

        # Mettre à jour le document
        invoice.pdf_file = os.path.join('sales', 'pdf', pdf_filename)
        invoice.save(update_fields=['pdf_file'])

        return pdf_path
