from django.db import migrations


def add_expense_payable_mapping(apps, schema_editor):
    """
    Ajoute le rôle employee_expense_payable pour les instances existantes.
    Détecte le pack actif depuis les mappings déjà en base (ex: salary_expense).
    """
    import json
    import os
    from django.conf import settings

    AccountMapping = apps.get_model('accounting', 'AccountMapping')
    Account = apps.get_model('accounting', 'Account')

    # Si le rôle existe déjà, rien à faire
    if AccountMapping.objects.filter(role='employee_expense_payable').exists():
        return

    # Détecter le pack actif depuis un rôle existant stable (salary_expense)
    # MA=6171, OHADA=661, FR=641
    PACK_DETECTION = {
        '6171': 'MA',
        '661': 'OHADA',
        '641': 'FR',
    }

    active_pack = None
    try:
        salary_mapping = AccountMapping.objects.get(role='salary_expense')
        active_pack = PACK_DETECTION.get(salary_mapping.account.code)
    except AccountMapping.DoesNotExist:
        return  # Pas de setup effectué, les fixtures chargeront le rôle au prochain setup

    if not active_pack:
        return

    # Lire le code cible depuis la fixture du pack détecté
    fixture_path = os.path.join(
        settings.BASE_DIR, 'accounting', 'fixtures', f'mappings_{active_pack}.json'
    )
    if not os.path.exists(fixture_path):
        return

    with open(fixture_path, 'r', encoding='utf-8') as f:
        mappings = json.load(f)

    target = next(
        (m for m in mappings if m['role'] == 'employee_expense_payable'), None
    )
    if not target:
        return

    try:
        account = Account.objects.get(code=target['account_code'])
    except Account.DoesNotExist:
        return

    AccountMapping.objects.create(
        role='employee_expense_payable',
        account=account,
        description=target.get('description', 'Remboursements de frais au personnel'),
    )


def remove_expense_payable_mapping(apps, schema_editor):
    AccountMapping = apps.get_model('accounting', 'AccountMapping')
    AccountMapping.objects.filter(role='employee_expense_payable').delete()


class Migration(migrations.Migration):
    dependencies = [
        ('accounting', '0004_alter_accountmapping_id'),
    ]

    operations = [
        migrations.RunPython(
            add_expense_payable_mapping,
            remove_expense_payable_mapping,
        ),
    ]
