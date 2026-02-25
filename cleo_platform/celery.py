import os

from celery import Celery
from celery.schedules import crontab

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'cleo_platform.settings')

app = Celery('cleo_platform')
app.config_from_object('django.conf:settings', namespace='CELERY')
app.autodiscover_tasks()

# ── Tâches planifiées ────────────────────────────────────────
app.conf.beat_schedule = {
    'check-overdue-invoices-daily': {
        'task': 'notifications.tasks.check_overdue_invoices',
        'schedule': crontab(hour=8, minute=0),
    },
    'check-stock-alerts-daily': {
        'task': 'notifications.tasks.check_stock_alerts',
        'schedule': crontab(hour=7, minute=0),
    },
    'check-overdue-supplier-invoices-daily': {
        'task': 'notifications.tasks.check_overdue_supplier_invoices',
        'schedule': crontab(hour=8, minute=30),
    },
    'check-overdue-purchase-orders-daily': {
        'task': 'notifications.tasks.check_overdue_purchase_orders',
        'schedule': crontab(hour=9, minute=0),
    },
}
