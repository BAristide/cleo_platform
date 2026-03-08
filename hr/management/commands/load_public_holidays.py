# hr/management/commands/load_public_holidays.py
from django.core.management.base import BaseCommand

from hr.models import PublicHoliday


class Command(BaseCommand):
    help = 'Charge les jours feries initiaux pour un pays donne'

    def add_arguments(self, parser):
        parser.add_argument(
            '--pack',
            type=str,
            required=True,
            help='Code pays (CI, MA, FR, SN, etc.) ou ancien code pack (OHADA)',
        )
        parser.add_argument(
            '--force',
            action='store_true',
            help='Met a jour le country_code des enregistrements existants',
        )

    def handle(self, *args, **options):
        from core.views import _get_public_holidays_for_country

        pack = options['pack'].upper()
        # Rétrocompatibilité : OHADA → CI
        _legacy = {'OHADA': 'CI'}
        country_code = _legacy.get(pack, pack)

        holidays = _get_public_holidays_for_country(country_code)

        if not holidays:
            self.stdout.write(
                self.style.WARNING(
                    f'Aucun jours feries definis pour le pays {country_code}.'
                )
            )
            return

        created = updated = 0
        for h in holidays:
            obj, is_new = PublicHoliday.objects.get_or_create(
                name=h['name'],
                date=h['date'],
                defaults={
                    'is_recurring': h['is_recurring'],
                    'country_code': country_code,
                },
            )
            if is_new:
                created += 1
            elif options['force']:
                obj.country_code = country_code
                obj.save(update_fields=['country_code'])
                updated += 1

        self.stdout.write(
            self.style.SUCCESS(
                f'{created} jours feries crees, {updated} mis a jour (pays {country_code})'
            )
        )
