from rest_framework import serializers
from django.contrib.auth.models import User, Group
from .models import UserProfile, UserRole, ModulePermission, ActivityLog
from hr.models import Employee
from hr.serializers import EmployeeListSerializer

class UserProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserProfile
        fields = ['phone', 'employee', 'password_changed_at', 'is_active']

class UserSerializer(serializers.ModelSerializer):
    profile = UserProfileSerializer(required=False)
    groups = serializers.SlugRelatedField(
        many=True,
        slug_field='name',
        queryset=Group.objects.all(),
        required=False
    )
    employee_detail = serializers.SerializerMethodField()
    
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name', 
                 'is_active', 'is_staff', 'profile', 'groups', 'employee_detail']
        extra_kwargs = {'password': {'write_only': True}}
    
    def get_employee_detail(self, obj):
        """Retourne les détails de l'employé associé à l'utilisateur."""
        try:
            if hasattr(obj, 'profile') and obj.profile.employee:
                return {
                    'id': obj.profile.employee.id,
                    'full_name': obj.profile.employee.full_name,
                    'department': obj.profile.employee.department.name if obj.profile.employee.department else None,
                    'job_title': obj.profile.employee.job_title.name if obj.profile.employee.job_title else None
                }
        except:
            pass
        return None
    
    def create(self, validated_data):
        """Crée un nouvel utilisateur avec profil."""
        profile_data = validated_data.pop('profile', {})
        password = validated_data.pop('password', None)
        groups_data = validated_data.pop('groups', [])
        
        user = User.objects.create(**validated_data)
        
        if password:
            user.set_password(password)
            user.save()
        
        # Ajouter les groupes
        for group in groups_data:
            user.groups.add(group)
        
        # Mise à jour du profil
        if hasattr(user, 'profile'):
            for attr, value in profile_data.items():
                setattr(user.profile, attr, value)
            user.profile.save()
        
        return user
    
    def update(self, instance, validated_data):
        """Mise à jour d'un utilisateur et son profil."""
        profile_data = validated_data.pop('profile', {})
        password = validated_data.pop('password', None)
        groups_data = validated_data.pop('groups', None)
        
        # Mise à jour des attributs User
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        
        # Mise à jour du mot de passe si fourni
        if password:
            instance.set_password(password)
        
        # Mise à jour des groupes si fournis
        if groups_data is not None:
            instance.groups.clear()
            for group in groups_data:
                instance.groups.add(group)
        
        instance.save()
        
        # Mise à jour du profil
        if hasattr(instance, 'profile'):
            for attr, value in profile_data.items():
                setattr(instance.profile, attr, value)
            instance.profile.save()
        
        return instance

class ModulePermissionSerializer(serializers.ModelSerializer):
    module_display = serializers.CharField(source='get_module_display', read_only=True)
    access_level_display = serializers.CharField(source='get_access_level_display', read_only=True)
    
    class Meta:
        model = ModulePermission
        fields = ['id', 'module', 'module_display', 'access_level', 'access_level_display']

class UserRoleSerializer(serializers.ModelSerializer):
    module_permissions = ModulePermissionSerializer(many=True, read_only=True)
    
    class Meta:
        model = UserRole
        fields = ['id', 'name', 'description', 'is_active', 'module_permissions']
    
    def create(self, validated_data):
        """Crée un nouveau rôle avec son groupe Django correspondant."""
        # Créer d'abord un groupe Django
        group, _ = Group.objects.get_or_create(name=validated_data['name'])
        
        # Créer le rôle avec ce groupe
        role = UserRole.objects.create(group=group, **validated_data)
        
        return role

class ActivityLogSerializer(serializers.ModelSerializer):
    user = serializers.StringRelatedField()
    module_display = serializers.CharField(source='get_module_display', read_only=True)
    
    class Meta:
        model = ActivityLog
        fields = ['id', 'user', 'action', 'module', 'module_display', 'entity_type', 
                  'entity_id', 'details', 'ip_address', 'timestamp']
        read_only_fields = ['id', 'user', 'action', 'module', 'module_display', 'entity_type', 
                           'entity_id', 'details', 'ip_address', 'timestamp']

class EmployeeUserLinkSerializer(serializers.Serializer):
    """Sérialiseur pour lier un employé à un utilisateur."""
    user_id = serializers.IntegerField(required=True)
    employee_id = serializers.IntegerField(required=True)
    
    def validate(self, data):
        try:
            user = User.objects.get(pk=data['user_id'])
        except User.DoesNotExist:
            raise serializers.ValidationError({"user_id": "Utilisateur non trouvé."})
        
        try:
            employee = Employee.objects.get(pk=data['employee_id'])
        except Employee.DoesNotExist:
            raise serializers.ValidationError({"employee_id": "Employé non trouvé."})
        
        # Vérifier si cet employé est déjà lié à un autre utilisateur
        if UserProfile.objects.filter(employee=employee).exclude(user=user).exists():
            raise serializers.ValidationError({"employee_id": "Cet employé est déjà lié à un autre utilisateur."})
        
        return data
    
    def save(self):
        user = User.objects.get(pk=self.validated_data['user_id'])
        employee = Employee.objects.get(pk=self.validated_data['employee_id'])
        
        # Mettre à jour le profil utilisateur
        profile, _ = UserProfile.objects.get_or_create(user=user)
        profile.employee = employee
        profile.save()
        
        # Mettre à jour l'employé
        employee.user = user
        employee.save(update_fields=['user'])
        
        return {"user": user, "employee": employee}
