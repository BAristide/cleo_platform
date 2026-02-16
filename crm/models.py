from django.db import models
from django.contrib.auth.models import User
from django.utils.translation import gettext_lazy as _
from django.urls import reverse
from django.utils import timezone


class Tag(models.Model):
    """Tags for categorizing CRM entities."""
    name = models.CharField(max_length=50, unique=True)
    color = models.CharField(max_length=20, default="#3498db")  # Hex color code

    def __str__(self):
        return self.name


class Industry(models.Model):
    """Industries for categorizing companies."""
    name = models.CharField(max_length=100, unique=True)
    
    class Meta:
        verbose_name_plural = "Industries"
    
    def __str__(self):
        return self.name


class Company(models.Model):
    """Model for company/organization."""
    name = models.CharField(max_length=200)
    industry = models.ForeignKey(Industry, on_delete=models.SET_NULL, null=True, blank=True)
    website = models.URLField(blank=True)
    phone = models.CharField(max_length=20, blank=True)
    email = models.EmailField(blank=True)
    
    # Address
    address_line1 = models.CharField(max_length=100, blank=True)
    address_line2 = models.CharField(max_length=100, blank=True)
    city = models.CharField(max_length=100, blank=True)
    state = models.CharField(max_length=100, blank=True)
    postal_code = models.CharField(max_length=20, blank=True)
    country = models.CharField(max_length=100, blank=True)
    
    # Metadata
    description = models.TextField(blank=True)
    annual_revenue = models.DecimalField(max_digits=14, decimal_places=2, null=True, blank=True)
    employee_count = models.PositiveIntegerField(null=True, blank=True)
    
    # Tracking
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='created_companies')
    assigned_to = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='assigned_companies')
    
    # Categorization
    tags = models.ManyToManyField(Tag, blank=True)
    
    # Scoring
    score = models.PositiveSmallIntegerField(default=0, help_text="Company qualification score (0-100)")
    
    class Meta:
        verbose_name_plural = "Companies"
        ordering = ['name']
    
    def __str__(self):
        return self.name
    
    def get_absolute_url(self):
        return reverse('crm:company_detail', args=[str(self.id)])
    
    @property
    def full_address(self):
        """Return the full address as a formatted string."""
        address_parts = [
            self.address_line1,
            self.address_line2,
            self.city,
            self.state,
            self.postal_code,
            self.country
        ]
        # Filter out empty parts
        address_parts = [part for part in address_parts if part]
        return ", ".join(address_parts)


class Contact(models.Model):
    """Model for individual contacts."""
    # Basic info
    first_name = models.CharField(max_length=100)
    last_name = models.CharField(max_length=100)
    title = models.CharField(max_length=100, blank=True, help_text="Job title or position")
    company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name='contacts')
    
    # Contact details
    email = models.EmailField(blank=True)
    phone = models.CharField(max_length=20, blank=True)
    mobile = models.CharField(max_length=20, blank=True)
    
    # Social profiles
    linkedin = models.URLField(blank=True)
    twitter = models.CharField(max_length=100, blank=True)
    
    # Lead information
    SOURCE_CHOICES = [
        ('website', 'Website'),
        ('referral', 'Referral'),
        ('cold_call', 'Cold Call'),
        ('social', 'Social Media'),
        ('email', 'Email Campaign'),
        ('chatbot', 'Chatbot IA'),
        ('event', 'Event/Conference'),
        ('other', 'Other'),
    ]
    source = models.CharField(max_length=20, choices=SOURCE_CHOICES, default='website')
    source_detail = models.CharField(max_length=200, blank=True, help_text="Additional details about the lead source")
    
    # Tracking
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='created_contacts')
    assigned_to = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='assigned_contacts')
    
    # Categorization
    tags = models.ManyToManyField(Tag, blank=True)
    
    # Additional
    notes = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)
    
    class Meta:
        ordering = ['last_name', 'first_name']
        
    def __str__(self):
        return f"{self.first_name} {self.last_name}"
    
    def get_absolute_url(self):
        return reverse('crm:contact_detail', args=[str(self.id)])
    
    @property
    def full_name(self):
        return f"{self.first_name} {self.last_name}"


class SalesStage(models.Model):
    """Model for stages in the sales pipeline."""
    name = models.CharField(max_length=100)
    order = models.PositiveSmallIntegerField(default=0, help_text="Order in the sales pipeline")
    probability = models.PositiveSmallIntegerField(default=0, help_text="Default probability percentage for this stage")
    is_won = models.BooleanField(default=False, help_text="Is this a won/closed stage?")
    is_lost = models.BooleanField(default=False, help_text="Is this a lost/closed stage?")
    color = models.CharField(max_length=20, default="#3498db")  # Hex color code
    
    class Meta:
        ordering = ['order']
    
    def __str__(self):
        return self.name


class Opportunity(models.Model):
    """Model for sales opportunities."""
    name = models.CharField(max_length=200)
    company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name='opportunities')
    stage = models.ForeignKey(SalesStage, on_delete=models.PROTECT, related_name='opportunities')
    
    # Financial details
    amount = models.DecimalField(max_digits=14, decimal_places=2, null=True, blank=True)
    CURRENCY_CHOICES = [
        ('USD', 'US Dollar'),
        ('EUR', 'Euro'),
        ('GBP', 'British Pound'),
        ('MAD', 'Moroccan Dirham'),
        # Add more currencies as needed
    ]
    currency = models.CharField(max_length=3, choices=CURRENCY_CHOICES, default='MAD')
    probability = models.PositiveSmallIntegerField(default=0, help_text="Probability percentage (0-100)")
    
    # Dates
    expected_close_date = models.DateField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    closed_date = models.DateField(null=True, blank=True)
    
    # Relationships
    contacts = models.ManyToManyField(Contact, related_name='opportunities', blank=True)
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='created_opportunities')
    assigned_to = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='assigned_opportunities')
    
    # Additional
    description = models.TextField(blank=True)
    tags = models.ManyToManyField(Tag, blank=True)
    
    class Meta:
        verbose_name_plural = "Opportunities"
        ordering = ['-created_at']
    
    def __str__(self):
        return self.name
    
    def get_absolute_url(self):
        return reverse('crm:opportunity_detail', args=[str(self.id)])
    
    @property
    def is_closed(self):
        return self.stage.is_won or self.stage.is_lost
    
    @property
    def is_won(self):
        return self.stage.is_won
    
    @property
    def is_lost(self):
        return self.stage.is_lost
    
    @property
    def weighted_amount(self):
        if self.amount is None:
            return None
        return (self.amount * self.probability) / 100


class ActivityType(models.Model):
    """Types of activities like call, meeting, email, etc."""
    name = models.CharField(max_length=100)
    icon = models.CharField(max_length=50, blank=True, help_text="Icon name (e.g., 'phone', 'envelope')")
    color = models.CharField(max_length=20, default="#3498db")  # Hex color code
    
    def __str__(self):
        return self.name


class Activity(models.Model):
    """Model for tracking activities/interactions with contacts/companies."""
    subject = models.CharField(max_length=200)
    activity_type = models.ForeignKey(ActivityType, on_delete=models.PROTECT)
    
    # Scheduled time
    start_date = models.DateTimeField()
    end_date = models.DateTimeField(null=True, blank=True)
    all_day = models.BooleanField(default=False)
    
    # Status
    STATUS_CHOICES = [
        ('planned', 'Planned'),
        ('completed', 'Completed'),
        ('cancelled', 'Cancelled'),
    ]
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='planned')
    completed_date = models.DateTimeField(null=True, blank=True)
    
    # Related entities
    contacts = models.ManyToManyField(Contact, related_name='activities', blank=True)
    company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name='activities', null=True, blank=True)
    opportunity = models.ForeignKey(Opportunity, on_delete=models.CASCADE, related_name='activities', null=True, blank=True)
    
    # Content
    description = models.TextField(blank=True)
    
    # Tracking
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='created_activities')
    assigned_to = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='assigned_activities')
    
    # Reminders
    reminder = models.BooleanField(default=False)
    reminder_datetime = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        verbose_name_plural = "Activities"
        ordering = ['-start_date']
    
    def __str__(self):
        return self.subject
    
    def get_absolute_url(self):
        return reverse('crm:activity_detail', args=[str(self.id)])
    
    def mark_complete(self):
        """Mark the activity as completed."""
        self.status = 'completed'
        self.completed_date = timezone.now()
        self.save()


class StageHistory(models.Model):
    """Track history of opportunity stage changes."""
    opportunity = models.ForeignKey(Opportunity, on_delete=models.CASCADE, related_name='stage_history')
    from_stage = models.ForeignKey(SalesStage, on_delete=models.PROTECT, related_name='from_stage_history', null=True, blank=True)
    to_stage = models.ForeignKey(SalesStage, on_delete=models.PROTECT, related_name='to_stage_history')
    changed_at = models.DateTimeField(auto_now_add=True)
    changed_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    notes = models.TextField(blank=True)
    
    class Meta:
        verbose_name_plural = "Stage Histories"
        ordering = ['-changed_at']
    
    def __str__(self):
        return f"{self.opportunity} - {self.to_stage} - {self.changed_at}"
