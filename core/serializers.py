from rest_framework import serializers

from .models import Company, CoreSettings, Currency


class CurrencySerializer(serializers.ModelSerializer):
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
