import os
from django.conf import settings
from django.template.loader import render_to_string
from django.utils import timezone
import tempfile
from weasyprint import HTML, CSS
from weasyprint.text.fonts import FontConfiguration

class PDFGenerator:
    """Classe utilitaire pour générer des PDFs."""
    
    @staticmethod
    def generate_mission_order_pdf(mission):
        """
        Génère un PDF pour un ordre de mission.
        
        Args:
            mission: L'objet Mission pour lequel créer l'ordre de mission
            
        Returns:
            str: Chemin relatif du fichier PDF généré (pour stockage en BDD)
        """
        # Créer le répertoire de destination s'il n'existe pas
        pdf_dir = os.path.join(settings.MEDIA_ROOT, 'hr', 'pdf')
        os.makedirs(pdf_dir, exist_ok=True)
        
        # Préparer le nom du fichier
        filename = f"ordre_mission_{mission.id}_{timezone.now().strftime('%Y%m%d%H%M%S')}.pdf"
        pdf_path = os.path.join(pdf_dir, filename)
        
        # Préparer les données pour le template
        context = {
            'mission': mission,
            'employee': mission.employee,
            'company': {
                'name': 'ECINTELLIGENCE (Experts Computing Intelligence)',
                'address': 'La Marina Casablanca | Tour Oceanes 3 Bureau 03 Rez-De-Jardin',
                'city': 'Casablanca',
                'country': 'Maroc',
                'contact': 'infos@ecintelligence.ma | +(212) 5220 48-727/0666 366 018',
                'fiscal_info': 'RC 393329 - IF 25018675 - Patente 350424929 - ICE 00203009000092'
            },
            'generated_date': timezone.now().date(),
        }
        
        # Rendre le HTML à partir du template
        html_string = render_to_string('hr/pdf/mission_order.html', context)
        
        # Configurer les polices
        font_config = FontConfiguration()
        
        # Générer le PDF avec WeasyPrint
        html = HTML(string=html_string)
        css = CSS(string='@page { size: A4; margin: 1cm; }')
        
        # Écrire le PDF dans un fichier temporaire
        with tempfile.NamedTemporaryFile(delete=False, suffix='.pdf') as tmp:
            html.write_pdf(tmp.name, stylesheets=[css], font_config=font_config)
            
            # Copier vers le fichier final
            with open(pdf_path, 'wb') as f:
                tmp.seek(0)
                f.write(tmp.read())
        
        # Supprimer le fichier temporaire
        os.unlink(tmp.name)
        
        # Retourner le chemin relatif pour stockage dans la BDD
        return os.path.join('hr', 'pdf', filename)
