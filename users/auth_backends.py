from django.contrib.auth.backends import ModelBackend
from django.contrib.auth.models import User
from django.db.models import Q


class EmailBackend(ModelBackend):
    """
    Authentification avec email ou nom d'utilisateur.
    """

    def authenticate(self, request, username=None, password=None, **kwargs):
        try:
            # Vérifier si l'identifiant est un email ou un nom d'utilisateur
            user = User.objects.get(Q(username=username) | Q(email=username))

            # Vérifier le mot de passe
            if user.check_password(password):
                return user
        except User.DoesNotExist:
            # Aucun utilisateur trouvé avec ce nom d'utilisateur ou email
            return None

        return None
