from rest_framework import serializers

from .models import Company, CompanySetup, CoreSettings, Currency


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


class CompanySerializer(serializers.ModelSerializer):
    class Meta:
        model = Company
        fields = '__all__'


class CoreSettingsSerializer(serializers.ModelSerializer):
    class Meta:
        model = CoreSettings
        fields = '__all__'


# ── Localization Packs — Serializers ─────────────────────────────────


class SetupStatusSerializer(serializers.Serializer):
    """Retourne l'état du setup."""

    setup_completed = serializers.BooleanField()
    locale_pack = serializers.CharField(allow_null=True)
    company_name = serializers.CharField(allow_null=True)
    is_locked = serializers.BooleanField()


class LocalePackInfoSerializer(serializers.Serializer):
    """Détails d'un pack de localisation disponible."""

    code = serializers.CharField()
    name = serializers.CharField()
    country_name = serializers.CharField()
    chart_of_accounts = serializers.CharField()
    default_currency = serializers.CharField()
    taxes_summary = serializers.CharField()
    legal_id_labels = serializers.ListField(child=serializers.CharField())


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
            'locale_pack',
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
            'locale_pack',
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
        read_only_fields = ['id', 'locale_pack', 'country_code', 'is_locked']

    def get_legal_ids(self, obj):
        return obj.get_legal_ids()

    def get_currency_code(self, obj):
        default = Currency.objects.filter(is_default=True).first()
        return default.code if default else ''

    def get_currency_symbol(self, obj):
        default = Currency.objects.filter(is_default=True).first()
        return default.symbol if default else ''
