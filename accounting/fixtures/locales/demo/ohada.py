"""
Données de démonstration : OHADA (CI)
Entreprise fictive : AgroTech Abidjan — Fournisseur agro-industriel.
"""

import logging
from datetime import date, timedelta
from decimal import Decimal

logger = logging.getLogger(__name__)


def load_demo_data():
    """Charge les données de démonstration pour le pack OHADA."""
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
    logger.info('Chargement des données de démonstration — Pack OHADA')

    admin_user = User.objects.filter(is_superuser=True).first()
    if not admin_user:
        logger.warning('Aucun superuser trouvé — démo non chargée')
        return

    xof = Currency.objects.filter(code='XOF').first()
    if not xof:
        logger.warning('Devise XOF non trouvée — démo non chargée')
        return

    bank, _ = BankAccount.objects.get_or_create(
        rib='CI005 01234 012345678901 23',
        defaults={
            'bank_name': "Société Générale Côte d'Ivoire",
            'name': 'Compte Principal XOF',
            'swift': 'SGCICIAB',
            'currency': xof,
            'is_default': True,
        },
    )

    clients_data = [
        {
            'company': {
                'name': 'SIFCA Group',
                'phone': '+225 27 20 31 00 00',
                'email': 'achats@sifca.ci',
                'city': 'Abidjan',
                'country': "Côte d'Ivoire",
            },
            'contact': {
                'first_name': 'Adjoua',
                'last_name': 'Koné',
                'title': 'Directrice Supply Chain',
                'email': 'a.kone@sifca.ci',
                'phone': '+225 07 01 23 45 67',
            },
        },
        {
            'company': {
                'name': "Cargill Côte d'Ivoire",
                'phone': '+225 27 20 25 60 00',
                'email': 'procurement@cargill.ci',
                'city': 'San Pedro',
                'country': "Côte d'Ivoire",
            },
            'contact': {
                'first_name': 'Moussa',
                'last_name': 'Ouattara',
                'title': 'Responsable Approvisionnement',
                'email': 'm.ouattara@cargill.ci',
                'phone': '+225 05 02 34 56 78',
            },
        },
        {
            'company': {
                'name': 'Solibra (Groupe Castel)',
                'phone': '+225 27 21 75 10 00',
                'email': 'industrie@solibra.ci',
                'city': 'Abidjan',
                'country': "Côte d'Ivoire",
            },
            'contact': {
                'first_name': 'Awa',
                'last_name': 'Diallo',
                'title': 'Chef de Production',
                'email': 'a.diallo@solibra.ci',
                'phone': '+225 01 03 45 67 89',
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
            'reference': 'AGR-ENG-001',
            'name': 'Engrais NPK 15-15-15 (tonne)',
            'unit_price': Decimal('450000.00'),
            'tax_rate': Decimal('18.00'),
        },
        {
            'reference': 'AGR-PHY-001',
            'name': 'Produit phytosanitaire (bidon 20L)',
            'unit_price': Decimal('85000.00'),
            'tax_rate': Decimal('18.00'),
        },
        {
            'reference': 'AGR-SEM-001',
            'name': 'Semences certifiées cacao (kg)',
            'unit_price': Decimal('12000.00'),
            'tax_rate': Decimal('18.00'),
        },
        {
            'reference': 'AGR-MAT-001',
            'name': 'Pulvérisateur motorisé',
            'unit_price': Decimal('750000.00'),
            'tax_rate': Decimal('18.00'),
        },
        {
            'reference': 'AGR-SRV-001',
            'name': 'Analyse de sol (parcelle)',
            'unit_price': Decimal('150000.00'),
            'tax_rate': Decimal('18.00'),
        },
    ]

    products = []
    for p in products_data:
        prod, _ = Product.objects.get_or_create(
            reference=p['reference'], defaults={**p, 'currency': xof}
        )
        products.append(prod)

    today = date.today()
    quotes_data = [
        {
            'company': companies[0],
            'contact': contacts[0],
            'date': today - timedelta(days=20),
            'items': [
                {
                    'product': products[0],
                    'quantity': 10,
                    'unit_price': Decimal('450000.00'),
                    'tax_rate': Decimal('18.00'),
                },
                {
                    'product': products[1],
                    'quantity': 50,
                    'unit_price': Decimal('85000.00'),
                    'tax_rate': Decimal('18.00'),
                },
                {
                    'product': products[4],
                    'quantity': 5,
                    'unit_price': Decimal('150000.00'),
                    'tax_rate': Decimal('18.00'),
                },
            ],
        },
        {
            'company': companies[1],
            'contact': contacts[1],
            'date': today - timedelta(days=10),
            'items': [
                {
                    'product': products[2],
                    'quantity': 500,
                    'unit_price': Decimal('12000.00'),
                    'tax_rate': Decimal('18.00'),
                },
                {
                    'product': products[3],
                    'quantity': 3,
                    'unit_price': Decimal('750000.00'),
                    'tax_rate': Decimal('18.00'),
                },
            ],
        },
        {
            'company': companies[2],
            'contact': contacts[2],
            'date': today - timedelta(days=5),
            'items': [
                {
                    'product': products[0],
                    'quantity': 5,
                    'unit_price': Decimal('450000.00'),
                    'tax_rate': Decimal('18.00'),
                },
                {
                    'product': products[1],
                    'quantity': 20,
                    'unit_price': Decimal('85000.00'),
                    'tax_rate': Decimal('18.00'),
                },
            ],
        },
    ]

    for qdata in quotes_data:
        items = qdata.pop('items')
        quote = Quote.objects.create(
            currency=xof, exchange_rate=Decimal('1.0000'), bank_account=bank, **qdata
        )
        for item in items:
            QuoteItem.objects.create(quote=quote, **item)

    dept_agro, _ = Department.objects.get_or_create(
        name='Agronomie', defaults={'code': 'AGRO'}
    )
    dept_comm, _ = Department.objects.get_or_create(
        name='Commercial', defaults={'code': 'COMM'}
    )
    dept_log, _ = Department.objects.get_or_create(
        name='Logistique', defaults={'code': 'LOG'}
    )

    jt_agro, _ = JobTitle.objects.get_or_create(
        name='Ingénieur Agronome', defaults={'department': dept_agro}
    )
    jt_comm, _ = JobTitle.objects.get_or_create(
        name='Commercial Terrain', defaults={'department': dept_comm}
    )
    jt_log, _ = JobTitle.objects.get_or_create(
        name='Responsable Logistique',
        defaults={'department': dept_log, 'is_management': True},
    )

    for emp_data in [
        {
            'employee_id': 'EMP-001',
            'first_name': 'Kouadio',
            'last_name': 'Yao',
            'email': 'k.yao@agrotech-abj.ci',
            'hire_date': date(2023, 1, 15),
            'job_title': jt_agro,
            'department': dept_agro,
        },
        {
            'employee_id': 'EMP-002',
            'first_name': 'Aminata',
            'last_name': 'Touré',
            'email': 'a.toure@agrotech-abj.ci',
            'hire_date': date(2023, 4, 1),
            'job_title': jt_comm,
            'department': dept_comm,
        },
        {
            'employee_id': 'EMP-003',
            'first_name': 'Ibrahim',
            'last_name': 'Konaté',
            'email': 'i.konate@agrotech-abj.ci',
            'hire_date': date(2022, 7, 1),
            'job_title': jt_log,
            'department': dept_log,
        },
    ]:
        Employee.objects.get_or_create(
            employee_id=emp_data['employee_id'], defaults=emp_data
        )

    journal_ventes = Journal.objects.filter(code='VEN').first()
    if journal_ventes:
        acc_client = Account.objects.filter(code='411').first()
        acc_ventes = Account.objects.filter(code='701').first()
        acc_tva_col = Account.objects.filter(code='4431').first()
        if acc_client and acc_ventes and acc_tva_col:
            for i, (desc, ht) in enumerate(
                [
                    ('Facture SIFCA — Engrais campagne', Decimal('5500000.00')),
                    (
                        'Facture Cargill — Fourniture phytosanitaire',
                        Decimal('8250000.00'),
                    ),
                ],
                1,
            ):
                tva = ht * Decimal('0.18')
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
                        name='TVA collectée 18%',
                    )

    logger.info('Données de démonstration OHADA chargées')
