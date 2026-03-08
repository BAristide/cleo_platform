from rest_framework import serializers

from .models import CompanySetup, CoreSettings, Currency, EmailSettings


class CurrencySerializer(serializers.ModelSerializer):
    thousand_separator = serializers.CharField(
        max_length=1,
        required=False,
        allow_blank=True,
        trim_whitespace=False,
    )

    class Meta:
        model = Currency
        fields = '__all__'


class CoreSettingsSerializer(serializers.ModelSerializer):
    class Meta:
        model = CoreSettings
        fields = [
            'id',
            'language',
            'timezone',
            'date_format',
            'time_format',
            'default_payment_term',
            'invoice_prefix',
            'quote_prefix',
            'order_prefix',
            'decimal_precision',
            'auto_archive_documents',
            'archive_after_days',
        ]
        read_only_fields = ['id']


class EmailSettingsSerializer(serializers.ModelSerializer):
    """Serializer pour la configuration SMTP. Le mot de passe est masqué en lecture."""

    email_host_password = serializers.CharField(
        write_only=True, required=False, allow_blank=True
    )
    password_is_set = serializers.SerializerMethodField()

    class Meta:
        model = EmailSettings
        fields = [
            'id',
            'email_host',
            'email_port',
            'email_use_tls',
            'email_host_user',
            'email_host_password',
            'default_from_email',
            'password_is_set',
        ]
        read_only_fields = ['id']

    def get_password_is_set(self, obj):
        return bool(obj.email_host_password)

    def update(self, instance, validated_data):
        # Si le mot de passe n'est pas fourni, on conserve l'existant
        if 'email_host_password' not in validated_data:
            validated_data.pop('email_host_password', None)
        elif validated_data.get('email_host_password') == '':
            # Chaîne vide = pas de changement
            validated_data.pop('email_host_password')
        return super().update(instance, validated_data)


# ── Localization Packs — Serializers ─────────────────────────────────


class SetupStatusSerializer(serializers.Serializer):
    """Retourne l'état du setup."""

    setup_completed = serializers.BooleanField()
    accounting_pack = serializers.CharField(allow_null=True)
    country_code = serializers.CharField(allow_null=True)
    company_name = serializers.CharField(allow_null=True)
    is_locked = serializers.BooleanField()


class LocalePackInfoSerializer(serializers.Serializer):
    """Détails d'un pack de localisation disponible."""

    code = serializers.CharField()
    name = serializers.CharField()
    country_name = serializers.CharField()
    accounting_pack = serializers.CharField()
    chart_of_accounts = serializers.CharField()
    default_currency = serializers.CharField()
    taxes_summary = serializers.CharField()
    legal_id_labels = serializers.ListField(child=serializers.CharField())
    payroll_fixture = serializers.CharField()


class CompanySetupSerializer(serializers.ModelSerializer):
    """Serializer pour la création de CompanySetup."""

    install_demo = serializers.BooleanField(
        write_only=True, required=False, default=False
    )
    legal_ids = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = CompanySetup
        fields = [
            'id',
            'company_name',
            'country_code',
            'accounting_pack',
            'address_line1',
            'address_line2',
            'city',
            'postal_code',
            'country',
            'phone',
            'email',
            'website',
            'legal_id_1_label',
            'legal_id_1_value',
            'legal_id_2_label',
            'legal_id_2_value',
            'legal_id_3_label',
            'legal_id_3_value',
            'legal_id_4_label',
            'legal_id_4_value',
            'logo',
            'bank_name',
            'bank_account',
            'bank_swift',
            'setup_completed',
            'setup_date',
            'is_locked',
            'install_demo',
            'legal_ids',
        ]
        read_only_fields = ['id', 'setup_completed', 'setup_date', 'is_locked']
        extra_kwargs = {
            'country_code': {'required': False},
            'accounting_pack': {'required': False},
            'address_line1': {'required': False},
            'address_line2': {'required': False},
            'city': {'required': False},
            'postal_code': {'required': False},
            'country': {'required': False},
            'phone': {'required': False},
            'email': {'required': False},
            'website': {'required': False},
            'legal_id_1_label': {'required': False},
            'legal_id_1_value': {'required': False},
            'legal_id_2_label': {'required': False},
            'legal_id_2_value': {'required': False},
            'legal_id_3_label': {'required': False},
            'legal_id_3_value': {'required': False},
            'legal_id_4_label': {'required': False},
            'legal_id_4_value': {'required': False},
            'bank_name': {'required': False},
            'bank_account': {'required': False},
            'bank_swift': {'required': False},
        }

    def get_legal_ids(self, obj):
        return obj.get_legal_ids()


class CompanyInfoSerializer(serializers.ModelSerializer):
    """Serializer pour lecture/mise à jour des infos entreprise post-setup."""

    legal_ids = serializers.SerializerMethodField(read_only=True)
    currency_code = serializers.SerializerMethodField(read_only=True)
    currency_symbol = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = CompanySetup
        fields = [
            'id',
            'company_name',
            'accounting_pack',
            'country_code',
            'address_line1',
            'address_line2',
            'city',
            'postal_code',
            'country',
            'phone',
            'email',
            'website',
            'legal_id_1_label',
            'legal_id_1_value',
            'legal_id_2_label',
            'legal_id_2_value',
            'legal_id_3_label',
            'legal_id_3_value',
            'legal_id_4_label',
            'legal_id_4_value',
            'logo',
            'bank_name',
            'bank_account',
            'bank_swift',
            'is_locked',
            'legal_ids',
            'currency_code',
            'currency_symbol',
        ]
        read_only_fields = ['id', 'accounting_pack', 'country_code', 'is_locked']

    def get_legal_ids(self, obj):
        return obj.get_legal_ids()

    def get_currency_code(self, obj):
        default = Currency.objects.filter(is_default=True).first()
        return default.code if default else ''

    def get_currency_symbol(self, obj):
        default = Currency.objects.filter(is_default=True).first()
        return default.symbol if default else ''
