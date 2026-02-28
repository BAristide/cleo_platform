"""
Données de démonstration : France (FR)
Entreprise fictive : InnoVert SAS — Éditeur de solutions GreenTech à Lyon.
"""

import logging
from datetime import date, timedelta
from decimal import Decimal

logger = logging.getLogger(__name__)


def load_demo_data():
    """Charge les données de démonstration pour le pack France."""
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
    logger.info('Chargement des données de démonstration — Pack FR')

    admin_user = User.objects.filter(is_superuser=True).first()
    if not admin_user:
        logger.warning('Aucun superuser trouvé — démo non chargée')
        return

    eur = Currency.objects.filter(code='EUR').first()
    if not eur:
        logger.warning('Devise EUR non trouvée — démo non chargée')
        return

    bank, _ = BankAccount.objects.get_or_create(
        iban='FR76 3000 6000 0012 3456 7890 189',
        defaults={
            'bank_name': 'Société Générale',
            'name': 'Compte Principal EUR',
            'swift': 'SOGEFRPP',
            'rib': '30006000001234567890189',
            'currency': eur,
            'is_default': True,
        },
    )

    clients_data = [
        {
            'company': {
                'name': 'Schneider Electric France',
                'phone': '+33 1 41 29 70 00',
                'email': 'achats@se.com',
                'city': 'Rueil-Malmaison',
                'country': 'France',
            },
            'contact': {
                'first_name': 'Claire',
                'last_name': 'Dupont',
                'title': 'Directrice Innovation',
                'email': 'c.dupont@se.com',
                'phone': '+33 6 12 34 56 78',
            },
        },
        {
            'company': {
                'name': 'Veolia Environnement',
                'phone': '+33 1 71 75 00 00',
                'email': 'solutions@veolia.com',
                'city': 'Aubervilliers',
                'country': 'France',
            },
            'contact': {
                'first_name': 'Thomas',
                'last_name': 'Martin',
                'title': 'Responsable Projets Smart City',
                'email': 't.martin@veolia.com',
                'phone': '+33 6 23 45 67 89',
            },
        },
        {
            'company': {
                'name': 'Engie Solutions',
                'phone': '+33 1 44 22 00 00',
                'email': 'digital@engie.com',
                'city': 'La Défense',
                'country': 'France',
            },
            'contact': {
                'first_name': 'Sophie',
                'last_name': 'Bernard',
                'title': 'Chef de Projet Digital',
                'email': 's.bernard@engie.com',
                'phone': '+33 6 34 56 78 90',
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
            'reference': 'GRN-IOT-001',
            'name': "Capteur IoT qualité de l'air",
            'unit_price': Decimal('890.00'),
            'tax_rate': Decimal('20.00'),
        },
        {
            'reference': 'GRN-PLT-001',
            'name': 'Plateforme monitoring énergie (licence annuelle)',
            'unit_price': Decimal('4500.00'),
            'tax_rate': Decimal('20.00'),
        },
        {
            'reference': 'GRN-API-001',
            'name': 'API données environnementales (forfait)',
            'unit_price': Decimal('2200.00'),
            'tax_rate': Decimal('20.00'),
        },
        {
            'reference': 'GRN-AUD-001',
            'name': 'Audit énergétique bâtiment',
            'unit_price': Decimal('3800.00'),
            'tax_rate': Decimal('20.00'),
        },
        {
            'reference': 'GRN-FOR-001',
            'name': 'Formation Transition Écologique (journée)',
            'unit_price': Decimal('1500.00'),
            'tax_rate': Decimal('20.00'),
        },
    ]

    products = []
    for p in products_data:
        prod, _ = Product.objects.get_or_create(
            reference=p['reference'], defaults={**p, 'currency': eur}
        )
        products.append(prod)

    today = date.today()
    quotes_data = [
        {
            'company': companies[0],
            'contact': contacts[0],
            'date': today - timedelta(days=18),
            'items': [
                {
                    'product': products[0],
                    'quantity': 100,
                    'unit_price': Decimal('890.00'),
                    'tax_rate': Decimal('20.00'),
                },
                {
                    'product': products[1],
                    'quantity': 1,
                    'unit_price': Decimal('4500.00'),
                    'tax_rate': Decimal('20.00'),
                },
                {
                    'product': products[2],
                    'quantity': 1,
                    'unit_price': Decimal('2200.00'),
                    'tax_rate': Decimal('20.00'),
                },
            ],
        },
        {
            'company': companies[1],
            'contact': contacts[1],
            'date': today - timedelta(days=8),
            'items': [
                {
                    'product': products[0],
                    'quantity': 200,
                    'unit_price': Decimal('890.00'),
                    'tax_rate': Decimal('20.00'),
                },
                {
                    'product': products[3],
                    'quantity': 5,
                    'unit_price': Decimal('3800.00'),
                    'tax_rate': Decimal('20.00'),
                },
                {
                    'product': products[4],
                    'quantity': 10,
                    'unit_price': Decimal('1500.00'),
                    'tax_rate': Decimal('20.00'),
                },
            ],
        },
        {
            'company': companies[2],
            'contact': contacts[2],
            'date': today - timedelta(days=2),
            'items': [
                {
                    'product': products[1],
                    'quantity': 3,
                    'unit_price': Decimal('4500.00'),
                    'tax_rate': Decimal('20.00'),
                },
                {
                    'product': products[4],
                    'quantity': 5,
                    'unit_price': Decimal('1500.00'),
                    'tax_rate': Decimal('20.00'),
                },
            ],
        },
    ]

    for qdata in quotes_data:
        items = qdata.pop('items')
        quote = Quote.objects.create(
            currency=eur, exchange_rate=Decimal('1.0000'), bank_account=bank, **qdata
        )
        for item in items:
            QuoteItem.objects.create(quote=quote, **item)

    dept_rnd, _ = Department.objects.get_or_create(name='R&D', defaults={'code': 'RND'})
    dept_comm, _ = Department.objects.get_or_create(
        name='Commercial', defaults={'code': 'COMM'}
    )
    dept_daf, _ = Department.objects.get_or_create(name='DAF', defaults={'code': 'DAF'})

    jt_dev, _ = JobTitle.objects.get_or_create(
        name='Développeur IoT', defaults={'department': dept_rnd}
    )
    jt_comm, _ = JobTitle.objects.get_or_create(
        name='Ingénieur Commercial', defaults={'department': dept_comm}
    )
    jt_daf, _ = JobTitle.objects.get_or_create(
        name='Responsable Administratif et Financier',
        defaults={'department': dept_daf, 'is_management': True},
    )

    for emp_data in [
        {
            'employee_id': 'EMP-001',
            'first_name': 'Julien',
            'last_name': 'Moreau',
            'email': 'j.moreau@innovert.fr',
            'hire_date': date(2023, 2, 1),
            'job_title': jt_dev,
            'department': dept_rnd,
        },
        {
            'employee_id': 'EMP-002',
            'first_name': 'Camille',
            'last_name': 'Leroy',
            'email': 'c.leroy@innovert.fr',
            'hire_date': date(2023, 5, 15),
            'job_title': jt_comm,
            'department': dept_comm,
        },
        {
            'employee_id': 'EMP-003',
            'first_name': 'Marc',
            'last_name': 'Petit',
            'email': 'm.petit@innovert.fr',
            'hire_date': date(2022, 10, 1),
            'job_title': jt_daf,
            'department': dept_daf,
        },
    ]:
        Employee.objects.get_or_create(
            employee_id=emp_data['employee_id'], defaults=emp_data
        )

    journal_ventes = Journal.objects.filter(code='VEN').first()
    if journal_ventes:
        acc_client = Account.objects.filter(code='411').first()
        acc_ventes = (
            Account.objects.filter(code='706').first()
            or Account.objects.filter(code='701').first()
        )
        acc_tva_col = Account.objects.filter(code='44571').first()
        if acc_client and acc_ventes and acc_tva_col:
            for i, (desc, ht) in enumerate(
                [
                    ('Facture Schneider — Capteurs IoT', Decimal('95700.00')),
                    ('Facture Veolia — Audit & Formation', Decimal('34000.00')),
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

    logger.info('Données de démonstration FR chargées')
