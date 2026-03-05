"""
Commande : link_employees_users
Relie les employes existants sans compte Django a un User,
en appliquant la meme logique que le signal employee_post_save.
A executer une seule fois apres la migration vers v3.17.0.
"""

from django.core.management.base import BaseCommand
from django.db import transaction


class Command(BaseCommand):
    help = 'Cree et relie les comptes utilisateur Django pour les employes sans compte.'

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Afficher les actions sans les executer.',
        )

    @transaction.atomic
    def handle(self, *args, **options):
        from hr.models import Employee
        from hr.signals import _create_or_link_user

        dry_run = options['dry_run']

        if dry_run:
            self.stdout.write('[DRY-RUN] Aucune modification ne sera effectuee.')

        candidates = Employee.objects.filter(
            user__isnull=True,
            email__isnull=False,
        ).exclude(email='')

        self.stdout.write(f'Employes sans compte utilisateur : {candidates.count()}')

        success = 0
        errors = 0

        for emp in candidates:
            self.stdout.write(f'  Traitement : {emp.full_name} <{emp.email}>')

            if dry_run:
                self.stdout.write(f'    [DRY-RUN] Compte serait cree pour {emp.email}')
                continue

            try:
                _create_or_link_user(emp)
                emp.refresh_from_db()

                if emp.user:
                    mcp = emp.user.profile.must_change_password
                    self.stdout.write(
                        f'    OK : user={emp.user.username} | '
                        f'must_change_password={mcp}'
                    )
                    success += 1
                else:
                    self.stdout.write(f'    ECHEC : aucun user cree pour {emp.email}')
                    errors += 1

            except Exception as e:
                self.stdout.write(f'    ERREUR : {e}')
                errors += 1

        if not dry_run:
            self.stdout.write(
                f'\nResultat : {success} comptes crees/relies, {errors} erreurs.'
            )
