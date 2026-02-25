from rest_framework import serializers

from .models import Notification, NotificationPreference


class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = [
            'id',
            'level',
            'title',
            'message',
            'module',
            'link',
            'is_read',
            'created_at',
            'dedup_key',
        ]
        read_only_fields = fields


class NotificationPreferenceSerializer(serializers.ModelSerializer):
    class Meta:
        model = NotificationPreference
        fields = [
            'id',
            'email_overdue_invoices',
            'email_stock_alerts',
            'email_overdue_purchases',
            'in_app_enabled',
        ]
        read_only_fields = ['id']
