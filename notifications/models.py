from django.contrib.auth.models import User
from django.db import models
from django.utils.translation import gettext_lazy as _


class Notification(models.Model):
    """Notification in-app pour un utilisateur."""

    class Level(models.TextChoices):
        INFO = 'info', _('Information')
        WARNING = 'warning', _('Attention')
        CRITICAL = 'critical', _('Critique')
        SUCCESS = 'success', _('Succès')

    class Module(models.TextChoices):
        SALES = 'sales', _('Ventes')
        PURCHASING = 'purchasing', _('Achats')
        INVENTORY = 'inventory', _('Stocks')
        HR = 'hr', _('RH')
        PAYROLL = 'payroll', _('Paie')
        ACCOUNTING = 'accounting', _('Comptabilité')
        CRM = 'crm', _('CRM')
        RECRUITMENT = 'recruitment', _('Recrutement')
        SYSTEM = 'system', _('Système')

    user = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name='notifications'
    )
    level = models.CharField(max_length=20, choices=Level.choices, default=Level.INFO)
    title = models.CharField(max_length=200)
    message = models.TextField()
    module = models.CharField(
        max_length=50, choices=Module.choices, default=Module.SYSTEM
    )
    link = models.CharField(max_length=300, blank=True, default='')
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    dedup_key = models.CharField(
        max_length=200,
        blank=True,
        default='',
        help_text='Clé unique pour éviter les notifications en double',
    )

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user', 'is_read', '-created_at']),
            models.Index(fields=['dedup_key']),
        ]
        verbose_name = _('Notification')
        verbose_name_plural = _('Notifications')

    def __str__(self):
        return f'[{self.level}] {self.title} → {self.user.username}'


class NotificationPreference(models.Model):
    """Préférences de notification par utilisateur."""

    user = models.OneToOneField(
        User, on_delete=models.CASCADE, related_name='notification_preferences'
    )
    email_overdue_invoices = models.BooleanField(
        default=True, verbose_name=_('Email : factures échues')
    )
    email_stock_alerts = models.BooleanField(
        default=True, verbose_name=_('Email : alertes stock')
    )
    email_overdue_purchases = models.BooleanField(
        default=True, verbose_name=_('Email : achats en retard')
    )
    in_app_enabled = models.BooleanField(
        default=True, verbose_name=_('Notifications in-app')
    )

    class Meta:
        verbose_name = _('Préférence de notification')
        verbose_name_plural = _('Préférences de notification')

    def __str__(self):
        return f'Prefs notif — {self.user.username}'
