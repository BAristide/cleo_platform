from django.db import migrations


def align_username_email(apps, schema_editor):
    """
    Phase 1 — Aligne username = email pour tous les utilisateurs existants.
    Crée un UserProfile pour les utilisateurs qui n'en ont pas (cas apiwebuser).
    """
    User = apps.get_model('auth', 'User')
    UserProfile = apps.get_model('users', 'UserProfile')

    # Vérifier l'unicité des emails avant migration
    emails = list(User.objects.values_list('email', flat=True))
    duplicates = [e for e in emails if emails.count(e) > 1]
    if duplicates:
        raise Exception(
            f'Emails dupliqués détectés, migration impossible : {set(duplicates)}'
        )

    # Vérifier qu'aucun email n'est vide
    empty_emails = User.objects.filter(email='')
    if empty_emails.exists():
        usernames = list(empty_emails.values_list('username', flat=True))
        raise Exception(
            f'Utilisateurs sans email détectés, migration impossible : {usernames}'
        )

    # Stocker les anciens usernames pour le reverse
    # et aligner username = email
    for user in User.objects.all():
        old_username = user.username
        new_username = user.email.lower().strip()
        user.username = new_username
        user.save(update_fields=['username'])

        # Créer le UserProfile s'il n'existe pas
        if not UserProfile.objects.filter(user=user).exists():
            UserProfile.objects.create(user=user)


# Mapping statique pour le reverse (données connues au moment de la migration)
REVERSE_MAPPING = {
    'admin@ecintelligence.ma': 'admineci',
    'sandra.togba@ecintelligence.ma': 'adminsandra',
    'apiwebuser@ecintelligence.ma': 'apiwebuser',
}


def reverse_align_username_email(apps, schema_editor):
    """Restaure les anciens usernames."""
    User = apps.get_model('auth', 'User')

    for email, old_username in REVERSE_MAPPING.items():
        try:
            user = User.objects.get(email=email)
            user.username = old_username
            user.save(update_fields=['username'])
        except User.DoesNotExist:
            pass


class Migration(migrations.Migration):
    dependencies = [
        ('users', '0001_initial'),
    ]

    operations = [
        migrations.RunPython(
            align_username_email,
            reverse_code=reverse_align_username_email,
        ),
    ]
