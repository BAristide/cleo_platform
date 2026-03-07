# hr/management/commands/load_public_holidays.py
from django.core.management.base import BaseCommand

from hr.models import PublicHoliday


class Command(BaseCommand):
    help = 'Charge les jours feries initiaux pour un pack de localisation donne'

    def add_arguments(self, parser):
        parser.add_argument(
            '--pack',
            type=str,
            required=True,
            help='Code du pack : MA, OHADA ou FR',
        )
        parser.add_argument(
            '--force',
            action='store_true',
            help='Met a jour le country_code des enregistrements existants',
        )

    def handle(self, *args, **options):
        from core.views import _get_public_holidays_for_pack

        pack = options['pack'].upper()
        holidays = _get_public_holidays_for_pack(pack)

        if not holidays:
            self.stdout.write(
                self.style.WARNING(f'Aucun jours feries definis pour le pack {pack}.')
            )
            return

        created = updated = 0
        for h in holidays:
            obj, is_new = PublicHoliday.objects.get_or_create(
                name=h['name'],
                date=h['date'],
                defaults={
                    'is_recurring': h['is_recurring'],
                    'country_code': pack,
                },
            )
            if is_new:
                created += 1
            elif options['force']:
                obj.country_code = pack
                obj.save(update_fields=['country_code'])
                updated += 1

        self.stdout.write(
            self.style.SUCCESS(
                f'{created} jours feries crees, {updated} mis a jour (pack {pack})'
            )
        )
