from rest_framework import serializers
from django.contrib.auth.models import User
from .models import (
    Tag, Industry, Company, Contact, SalesStage, 
    Opportunity, ActivityType, Activity, StageHistory
)


class UserSerializer(serializers.ModelSerializer):
    """Serializer for User objects (used in nested relationships)."""
    full_name = serializers.SerializerMethodField()
    
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'full_name']
    
    def get_full_name(self, obj):
        return f"{obj.first_name} {obj.last_name}" if obj.first_name or obj.last_name else obj.username


class TagSerializer(serializers.ModelSerializer):
    class Meta:
        model = Tag
        fields = ['id', 'name', 'color']


class IndustrySerializer(serializers.ModelSerializer):
    class Meta:
        model = Industry
        fields = ['id', 'name']


# Company Serializers
class CompanyListSerializer(serializers.ModelSerializer):
    industry_name = serializers.ReadOnlyField(source='industry.name')
    assigned_to_name = serializers.ReadOnlyField(source='assigned_to.username')
    contact_count = serializers.SerializerMethodField()
    opportunity_count = serializers.SerializerMethodField()
    
    class Meta:
        model = Company
        fields = [
            'id', 'name', 'industry_name', 'phone', 'email', 
            'website', 'city', 'country', 'score', 
            'assigned_to_name', 'contact_count', 'opportunity_count'
        ]
    
    def get_contact_count(self, obj):
        return obj.contacts.count()
    
    def get_opportunity_count(self, obj):
        return obj.opportunities.count()


class CompanyDetailSerializer(serializers.ModelSerializer):
    industry = IndustrySerializer(read_only=True)
    industry_id = serializers.PrimaryKeyRelatedField(
        queryset=Industry.objects.all(), source='industry', write_only=True, allow_null=True
    )
    created_by = UserSerializer(read_only=True)
    assigned_to = UserSerializer(read_only=True)
    assigned_to_id = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.all(), source='assigned_to', write_only=True, allow_null=True
    )
    tags = TagSerializer(many=True, read_only=True)
    tag_ids = serializers.PrimaryKeyRelatedField(
        queryset=Tag.objects.all(), source='tags', write_only=True, many=True, required=False
    )
    
    class Meta:
        model = Company
        fields = '__all__'
        extra_kwargs = {
            'created_at': {'read_only': True},
            'updated_at': {'read_only': True},
        }
    
    def create(self, validated_data):
        tags = validated_data.pop('tags', [])
        company = Company.objects.create(**validated_data)
        
        if tags:
            company.tags.set(tags)
        
        return company
    
    def update(self, instance, validated_data):
        tags = validated_data.pop('tags', None)
        
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        
        instance.save()
        
        if tags is not None:
            instance.tags.set(tags)
        
        return instance


# Contact Serializers
class ContactListSerializer(serializers.ModelSerializer):
    company_name = serializers.ReadOnlyField(source='company.name')
    assigned_to_name = serializers.ReadOnlyField(source='assigned_to.username')
    full_name = serializers.SerializerMethodField()
    
    class Meta:
        model = Contact
        fields = [
            'id', 'full_name', 'email', 'phone', 'mobile',
            'company_name', 'title', 'source', 'assigned_to_name',
            'is_active', 'created_at'
        ]
    
    def get_full_name(self, obj):
        return f"{obj.first_name} {obj.last_name}"


class ContactDetailSerializer(serializers.ModelSerializer):
    company = CompanyListSerializer(read_only=True)
    company_id = serializers.PrimaryKeyRelatedField(
        queryset=Company.objects.all(), source='company', write_only=True
    )
    created_by = UserSerializer(read_only=True)
    assigned_to = UserSerializer(read_only=True)
    assigned_to_id = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.all(), source='assigned_to', write_only=True, allow_null=True
    )
    tags = TagSerializer(many=True, read_only=True)
    tag_ids = serializers.PrimaryKeyRelatedField(
        queryset=Tag.objects.all(), source='tags', write_only=True, many=True, required=False
    )
    
    class Meta:
        model = Contact
        fields = '__all__'
        extra_kwargs = {
            'created_at': {'read_only': True},
            'updated_at': {'read_only': True},
        }
    
    def create(self, validated_data):
        tags = validated_data.pop('tags', [])
        contact = Contact.objects.create(**validated_data)
        
        if tags:
            contact.tags.set(tags)
        
        return contact
    
    def update(self, instance, validated_data):
        tags = validated_data.pop('tags', None)
        
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        
        instance.save()
        
        if tags is not None:
            instance.tags.set(tags)
        
        return instance


class SalesStageSerializer(serializers.ModelSerializer):
    class Meta:
        model = SalesStage
        fields = '__all__'


class ActivityTypeSerializer(serializers.ModelSerializer):
    class Meta:
        model = ActivityType
        fields = '__all__'


# Opportunity Serializers
class OpportunityListSerializer(serializers.ModelSerializer):
    company_name = serializers.ReadOnlyField(source='company.name')
    stage_name = serializers.ReadOnlyField(source='stage.name')
    stage_color = serializers.ReadOnlyField(source='stage.color')
    assigned_to_name = serializers.ReadOnlyField(source='assigned_to.username')
    is_closed = serializers.ReadOnlyField()
    is_won = serializers.ReadOnlyField()
    
    class Meta:
        model = Opportunity
        fields = [
            'id', 'name', 'company_name', 'stage_name', 'stage_color',
            'amount', 'currency', 'probability', 'expected_close_date',
            'assigned_to_name', 'is_closed', 'is_won', 'created_at'
        ]


class OpportunityDetailSerializer(serializers.ModelSerializer):
    company = CompanyListSerializer(read_only=True)
    company_id = serializers.PrimaryKeyRelatedField(
        queryset=Company.objects.all(), source='company', write_only=True
    )
    stage = SalesStageSerializer(read_only=True)
    stage_id = serializers.PrimaryKeyRelatedField(
        queryset=SalesStage.objects.all(), source='stage', write_only=True
    )
    contacts = ContactListSerializer(many=True, read_only=True)
    contact_ids = serializers.PrimaryKeyRelatedField(
        queryset=Contact.objects.all(), source='contacts', write_only=True, many=True, required=False
    )
    created_by = UserSerializer(read_only=True)
    assigned_to = UserSerializer(read_only=True)
    assigned_to_id = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.all(), source='assigned_to', write_only=True, allow_null=True
    )
    tags = TagSerializer(many=True, read_only=True)
    tag_ids = serializers.PrimaryKeyRelatedField(
        queryset=Tag.objects.all(), source='tags', write_only=True, many=True, required=False
    )
    is_closed = serializers.ReadOnlyField()
    is_won = serializers.ReadOnlyField()
    is_lost = serializers.ReadOnlyField()
    weighted_amount = serializers.ReadOnlyField()
    
    class Meta:
        model = Opportunity
        fields = '__all__'
        extra_kwargs = {
            'created_at': {'read_only': True},
            'updated_at': {'read_only': True},
            'closed_date': {'read_only': True},
        }
    
    def create(self, validated_data):
        tags = validated_data.pop('tags', [])
        contacts = validated_data.pop('contacts', [])
        opportunity = Opportunity.objects.create(**validated_data)
        
        if tags:
            opportunity.tags.set(tags)
        
        if contacts:
            opportunity.contacts.set(contacts)
        
        return opportunity
    
    def update(self, instance, validated_data):
        tags = validated_data.pop('tags', None)
        contacts = validated_data.pop('contacts', None)
        old_stage = instance.stage
        
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        
        # If stage changed, add to stage history
        if 'stage' in validated_data and old_stage != instance.stage:
            # If changing to a won/lost stage, set closed_date
            if instance.stage.is_won or instance.stage.is_lost:
                instance.closed_date = instance.updated_at
            
            # Record stage history
            StageHistory.objects.create(
                opportunity=instance,
                from_stage=old_stage,
                to_stage=instance.stage,
                changed_by=self.context['request'].user if 'request' in self.context else None
            )
        
        instance.save()
        
        if tags is not None:
            instance.tags.set(tags)
        
        if contacts is not None:
            instance.contacts.set(contacts)
        
        return instance


# Activity Serializers
class ActivityListSerializer(serializers.ModelSerializer):
    activity_type_name = serializers.ReadOnlyField(source='activity_type.name')
    activity_type_icon = serializers.ReadOnlyField(source='activity_type.icon')
    activity_type_color = serializers.ReadOnlyField(source='activity_type.color')
    company_name = serializers.ReadOnlyField(source='company.name')
    opportunity_name = serializers.ReadOnlyField(source='opportunity.name')
    assigned_to_name = serializers.ReadOnlyField(source='assigned_to.username')
    contact_names = serializers.SerializerMethodField()
    
    class Meta:
        model = Activity
        fields = [
            'id', 'subject', 'activity_type_name', 'activity_type_icon', 'activity_type_color',
            'start_date', 'end_date', 'status', 'company_name', 'opportunity_name',
            'assigned_to_name', 'contact_names'
        ]
    
    def get_contact_names(self, obj):
        return [f"{contact.first_name} {contact.last_name}" for contact in obj.contacts.all()]


class ActivityDetailSerializer(serializers.ModelSerializer):
    activity_type = ActivityTypeSerializer(read_only=True)
    activity_type_id = serializers.PrimaryKeyRelatedField(
        queryset=ActivityType.objects.all(), source='activity_type', write_only=True
    )
    company = CompanyListSerializer(read_only=True)
    company_id = serializers.PrimaryKeyRelatedField(
        queryset=Company.objects.all(), source='company', write_only=True, allow_null=True
    )
    opportunity = OpportunityListSerializer(read_only=True)
    opportunity_id = serializers.PrimaryKeyRelatedField(
        queryset=Opportunity.objects.all(), source='opportunity', write_only=True, allow_null=True
    )
    contacts = ContactListSerializer(many=True, read_only=True)
    contact_ids = serializers.PrimaryKeyRelatedField(
        queryset=Contact.objects.all(), source='contacts', write_only=True, many=True, required=False
    )
    created_by = UserSerializer(read_only=True)
    assigned_to = UserSerializer(read_only=True)
    assigned_to_id = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.all(), source='assigned_to', write_only=True, allow_null=True
    )
    
    class Meta:
        model = Activity
        fields = '__all__'
        extra_kwargs = {
            'created_at': {'read_only': True},
            'updated_at': {'read_only': True},
            'completed_date': {'read_only': True},
        }
    
    def create(self, validated_data):
        contacts = validated_data.pop('contacts', [])
        activity = Activity.objects.create(**validated_data)
        
        if contacts:
            activity.contacts.set(contacts)
        
        return activity
    
    def update(self, instance, validated_data):
        contacts = validated_data.pop('contacts', None)
        
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        
        instance.save()
        
        if contacts is not None:
            instance.contacts.set(contacts)
        
        return instance


class StageHistorySerializer(serializers.ModelSerializer):
    opportunity = OpportunityListSerializer(read_only=True)
    from_stage = SalesStageSerializer(read_only=True)
    to_stage = SalesStageSerializer(read_only=True)
    changed_by = UserSerializer(read_only=True)
    
    class Meta:
        model = StageHistory
        fields = '__all__'
