from django.core.management.base import BaseCommand

from hr.models import Employee


class Command(BaseCommand):
    help = 'Met à jour le statut familial des employés existants'

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Simulation sans modifications réelles',
        )

    def handle(self, *args, **options):
        dry_run = options['dry_run']

        # Récupérer tous les employés
        employees = Employee.objects.all()
        count = employees.count()

        self.stdout.write(f'Mise à jour de {count} employés...')

        # Configurations par défaut pour chaque employé
        for employee in employees:
            # Définir des valeurs par défaut
            employee.marital_status = 'single'  # Par défaut célibataire
            employee.dependent_children = 0  # Par défaut 0 enfants

            if dry_run:
                self.stdout.write(
                    f"[SIMULATION] L'employé {employee.full_name} aurait été mis à jour"
                )
            else:
                employee.save(update_fields=['marital_status', 'dependent_children'])
                self.stdout.write(f"L'employé {employee.full_name} a été mis à jour")

        self.stdout.write(
            self.style.SUCCESS(
                f'{"SIMULATION de la mise" if dry_run else "Mise"} à jour de {count} employés terminée'
            )
        )
