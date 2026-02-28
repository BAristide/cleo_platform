"""
Données de démonstration : Maroc (MA)
Entreprise fictive : TechnoSolaire Maroc — Intégrateur solaire à Casablanca.
"""

import logging
from datetime import date, timedelta
from decimal import Decimal

logger = logging.getLogger(__name__)


def load_demo_data():
    """Charge les données de démonstration pour le pack Maroc."""
    from django.contrib.auth import get_user_model

    from accounting.models import (
        Account,
        FiscalPeriod,
        Journal,
        JournalEntry,
        JournalEntryLine,
    )
    from catalog.models import Product
    from core.models import Currency
    from crm.models import Company, Contact
    from hr.models import Department, Employee, JobTitle
    from sales.models import BankAccount, Quote, QuoteItem

    User = get_user_model()
    logger.info('Chargement des données de démonstration — Pack MA')

    admin_user = User.objects.filter(is_superuser=True).first()
    if not admin_user:
        logger.warning('Aucun superuser trouvé — démo non chargée')
        return

    mad = Currency.objects.filter(code='MAD').first()
    if not mad:
        logger.warning('Devise MAD non trouvée — démo non chargée')
        return

    bank, _ = BankAccount.objects.get_or_create(
        rib='021 780 000 1234 5678 9012 34',
        defaults={
            'bank_name': 'Attijariwafa Bank',
            'name': 'Compte Principal MAD',
            'swift': 'BCMAMAMC',
            'currency': mad,
            'is_default': True,
        },
    )

    clients_data = [
        {
            'company': {
                'name': 'Marjane Holding',
                'phone': '+212 522 654 321',
                'email': 'achats@marjane.ma',
                'city': 'Casablanca',
                'country': 'Maroc',
            },
            'contact': {
                'first_name': 'Karim',
                'last_name': 'Bennani',
                'title': 'Directeur des Achats',
                'email': 'k.bennani@marjane.ma',
                'phone': '+212 661 234 567',
            },
        },
        {
            'company': {
                'name': 'OCP Group',
                'phone': '+212 523 391 000',
                'email': 'procurement@ocpgroup.ma',
                'city': 'Khouribga',
                'country': 'Maroc',
            },
            'contact': {
                'first_name': 'Fatima',
                'last_name': 'El Amrani',
                'title': 'Responsable Énergie',
                'email': 'f.elamrani@ocpgroup.ma',
                'phone': '+212 662 345 678',
            },
        },
        {
            'company': {
                'name': 'Renault Maroc',
                'phone': '+212 536 688 000',
                'email': 'maintenance@renault.ma',
                'city': 'Tanger',
                'country': 'Maroc',
            },
            'contact': {
                'first_name': 'Youssef',
                'last_name': 'Cherkaoui',
                'title': 'Chef de Projet Industriel',
                'email': 'y.cherkaoui@renault.ma',
                'phone': '+212 663 456 789',
            },
        },
    ]

    companies = []
    contacts = []
    for data in clients_data:
        comp, _ = Company.objects.get_or_create(
            name=data['company']['name'],
            defaults={**data['company'], 'created_by': admin_user},
        )
        companies.append(comp)
        cont, _ = Contact.objects.get_or_create(
            email=data['contact']['email'],
            defaults={**data['contact'], 'company': comp, 'created_by': admin_user},
        )
        contacts.append(cont)

    products_data = [
        {
            'reference': 'SOL-PAN-001',
            'name': 'Panneau solaire monocristallin 400W',
            'unit_price': Decimal('3500.00'),
            'tax_rate': Decimal('20.00'),
        },
        {
            'reference': 'SOL-INV-001',
            'name': 'Onduleur hybride 5kW',
            'unit_price': Decimal('12000.00'),
            'tax_rate': Decimal('20.00'),
        },
        {
            'reference': 'SOL-BAT-001',
            'name': 'Batterie lithium 10kWh',
            'unit_price': Decimal('25000.00'),
            'tax_rate': Decimal('20.00'),
        },
        {
            'reference': 'SOL-STR-001',
            'name': 'Structure de montage toiture',
            'unit_price': Decimal('4500.00'),
            'tax_rate': Decimal('20.00'),
        },
        {
            'reference': 'SOL-SRV-001',
            'name': 'Installation et mise en service',
            'unit_price': Decimal('8000.00'),
            'tax_rate': Decimal('20.00'),
        },
    ]

    products = []
    for p in products_data:
        prod, _ = Product.objects.get_or_create(
            reference=p['reference'], defaults={**p, 'currency': mad}
        )
        products.append(prod)

    today = date.today()
    quotes_data = [
        {
            'company': companies[0],
            'contact': contacts[0],
            'date': today - timedelta(days=15),
            'items': [
                {
                    'product': products[0],
                    'quantity': 20,
                    'unit_price': Decimal('3500.00'),
                    'tax_rate': Decimal('20.00'),
                },
                {
                    'product': products[1],
                    'quantity': 2,
                    'unit_price': Decimal('12000.00'),
                    'tax_rate': Decimal('20.00'),
                },
                {
                    'product': products[4],
                    'quantity': 1,
                    'unit_price': Decimal('8000.00'),
                    'tax_rate': Decimal('20.00'),
                },
            ],
        },
        {
            'company': companies[1],
            'contact': contacts[1],
            'date': today - timedelta(days=7),
            'items': [
                {
                    'product': products[0],
                    'quantity': 50,
                    'unit_price': Decimal('3500.00'),
                    'tax_rate': Decimal('20.00'),
                },
                {
                    'product': products[2],
                    'quantity': 5,
                    'unit_price': Decimal('25000.00'),
                    'tax_rate': Decimal('20.00'),
                },
                {
                    'product': products[3],
                    'quantity': 50,
                    'unit_price': Decimal('4500.00'),
                    'tax_rate': Decimal('20.00'),
                },
            ],
        },
        {
            'company': companies[2],
            'contact': contacts[2],
            'date': today - timedelta(days=3),
            'items': [
                {
                    'product': products[1],
                    'quantity': 4,
                    'unit_price': Decimal('12000.00'),
                    'tax_rate': Decimal('20.00'),
                },
                {
                    'product': products[4],
                    'quantity': 2,
                    'unit_price': Decimal('8000.00'),
                    'tax_rate': Decimal('20.00'),
                },
            ],
        },
    ]

    for qdata in quotes_data:
        items = qdata.pop('items')
        quote = Quote.objects.create(
            currency=mad, exchange_rate=Decimal('1.0000'), bank_account=bank, **qdata
        )
        for item in items:
            QuoteItem.objects.create(quote=quote, **item)

    dept_tech, _ = Department.objects.get_or_create(
        name='Technique', defaults={'code': 'TECH'}
    )
    dept_comm, _ = Department.objects.get_or_create(
        name='Commercial', defaults={'code': 'COMM'}
    )
    dept_admin, _ = Department.objects.get_or_create(
        name='Administration', defaults={'code': 'ADMIN'}
    )

    jt_tech, _ = JobTitle.objects.get_or_create(
        name='Ingénieur Solaire', defaults={'department': dept_tech}
    )
    jt_comm, _ = JobTitle.objects.get_or_create(
        name='Commercial Terrain', defaults={'department': dept_comm}
    )
    jt_admin, _ = JobTitle.objects.get_or_create(
        name='Responsable Administratif',
        defaults={'department': dept_admin, 'is_management': True},
    )

    for emp_data in [
        {
            'employee_id': 'EMP-001',
            'first_name': 'Ahmed',
            'last_name': 'Tazi',
            'email': 'a.tazi@technosolaire.ma',
            'hire_date': date(2023, 3, 1),
            'job_title': jt_tech,
            'department': dept_tech,
        },
        {
            'employee_id': 'EMP-002',
            'first_name': 'Salma',
            'last_name': 'Idrissi',
            'email': 's.idrissi@technosolaire.ma',
            'hire_date': date(2023, 6, 15),
            'job_title': jt_comm,
            'department': dept_comm,
        },
        {
            'employee_id': 'EMP-003',
            'first_name': 'Omar',
            'last_name': 'Benslimane',
            'email': 'o.benslimane@technosolaire.ma',
            'hire_date': date(2022, 9, 1),
            'job_title': jt_admin,
            'department': dept_admin,
        },
    ]:
        Employee.objects.get_or_create(
            employee_id=emp_data['employee_id'], defaults=emp_data
        )

    journal_ventes = Journal.objects.filter(code='VEN').first()
    if journal_ventes:
        acc_client = Account.objects.filter(code='411').first()
        acc_ventes = Account.objects.filter(code='711').first()
        acc_tva_col = Account.objects.filter(code='4455').first()
        if acc_client and acc_ventes and acc_tva_col:
            for i, (desc, ht) in enumerate(
                [
                    ('Facture Marjane — Installation solaire', Decimal('102000.00')),
                    ('Facture OCP — Fourniture panneaux', Decimal('300000.00')),
                ],
                1,
            ):
                tva = ht * Decimal('0.20')
                ttc = ht + tva
                entry, created = JournalEntry.objects.get_or_create(
                    ref=f'VE-DEMO-{i:03d}',
                    defaults={
                        'journal_id': journal_ventes,
                        'date': today - timedelta(days=30 - i * 10),
                        'period_id': FiscalPeriod.objects.filter(
                            start_date__lte=today - timedelta(days=30 - i * 10),
                            end_date__gte=today - timedelta(days=30 - i * 10),
                        ).first(),
                        'name': f'VE-DEMO-{i:03d}',
                        'narration': desc,
                        'state': 'posted',
                        'created_by': admin_user,
                    },
                )
                if created:
                    JournalEntryLine.objects.create(
                        entry_id=entry,
                        account_id=acc_client,
                        debit=ttc,
                        credit=Decimal('0'),
                        name=desc,
                    )
                    JournalEntryLine.objects.create(
                        entry_id=entry,
                        account_id=acc_ventes,
                        debit=Decimal('0'),
                        credit=ht,
                        name=desc,
                    )
                    JournalEntryLine.objects.create(
                        entry_id=entry,
                        account_id=acc_tva_col,
                        debit=Decimal('0'),
                        credit=tva,
                        name='TVA collectée 20%',
                    )

    logger.info('Données de démonstration MA chargées')
