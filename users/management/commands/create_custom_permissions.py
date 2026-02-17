from django.apps import apps
from django.contrib.auth.models import Permission
from django.contrib.contenttypes.models import ContentType
from django.core.management.base import BaseCommand


class Command(BaseCommand):
    help = (
        'Crée des permissions personnalisées pour les actions clés dans chaque module'
    )

    def handle(self, *args, **options):
        self.stdout.write('Création des permissions personnalisées...')

        # Dictionnaire des modules et leurs permissions spécifiques
        custom_permissions = {
            'hr': [
                ('can_approve_mission', 'Can approve mission'),
                ('can_approve_training_plan', 'Can approve training plan'),
                ('can_approve_availability', 'Can approve availability request'),
            ],
            'sales': [
                ('can_create_quote', 'Can create quote'),
                ('can_convert_quote_to_order', 'Can convert quote to order'),
                ('can_convert_to_invoice', 'Can convert to invoice'),
                ('can_approve_discount', 'Can approve discount'),
            ],
            'accounting': [
                ('can_validate_entry', 'Can validate accounting entry'),
                ('can_reconcile', 'Can reconcile accounts'),
                ('can_close_period', 'Can close fiscal period'),
            ],
            'payroll': [
                ('can_calculate_payroll', 'Can calculate payroll'),
                ('can_validate_payroll', 'Can validate payroll'),
                ('can_generate_payslips', 'Can generate payslips'),
            ],
        }

        # Créer les permissions pour chaque module
        for app_label, perms in custom_permissions.items():
            # Obtenir un ContentType pour ce module
            try:
                # Convertir le générateur en liste et vérifier s'il n'est pas vide
                model_list = list(apps.get_app_config(app_label).get_models())

                if not model_list:
                    self.stdout.write(
                        self.style.WARNING(
                            f"Aucun modèle trouvé pour l'application {app_label}"
                        )
                    )
                    continue

                # Utiliser le ContentType du premier modèle trouvé
                ct = ContentType.objects.get_for_model(model_list[0])

                # Créer chaque permission
                for codename, name in perms:
                    permission, created = Permission.objects.get_or_create(
                        codename=codename, content_type=ct, defaults={'name': name}
                    )

                    if created:
                        self.stdout.write(
                            f'Permission créée: {permission.name} ({app_label}.{codename})'
                        )
                    else:
                        self.stdout.write(
                            f'Permission existante: {permission.name} ({app_label}.{codename})'
                        )

            except LookupError:
                self.stdout.write(
                    self.style.ERROR(f"Application '{app_label}' introuvable")
                )

        self.stdout.write(
            self.style.SUCCESS('Toutes les permissions personnalisées ont été créées')
        )
