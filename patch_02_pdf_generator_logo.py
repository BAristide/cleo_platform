"""
Patch payroll/services/pdf_generator.py — PAIE-12 : logo entreprise dans le PDF.
Ajoute logo_base64 au contexte du bulletin.
"""

with open('payroll/services/pdf_generator.py', 'r') as f:
    content = f.read()

# Ajouter l'import base64 en haut
if 'import base64' not in content:
    content = content.replace(
        'import os',
        'import base64\nimport os',
    )
    print('OK — import base64 ajoute')

# Ajouter le calcul logo_base64 juste avant la creation du context dict
# Chercher le bloc "# -- PAIE-07 : Solde de conges --" (ajoute en v3.27.0)
old_block = '        # -- PAIE-07 : Solde de conges --'
new_block = """        # -- PAIE-12 : Logo entreprise --
        logo_base64 = None
        try:
            from core.models import CompanySetup
            setup = CompanySetup.objects.first()
            if setup and setup.logo:
                logo_path = setup.logo.path
                if os.path.exists(logo_path):
                    with open(logo_path, 'rb') as lf:
                        logo_data = base64.b64encode(lf.read()).decode('utf-8')
                    ext = os.path.splitext(logo_path)[1].lower().lstrip('.')
                    mime = {'png': 'image/png', 'jpg': 'image/jpeg', 'jpeg': 'image/jpeg', 'gif': 'image/gif', 'svg': 'image/svg+xml'}.get(ext, 'image/png')
                    logo_base64 = f'data:{mime};base64,{logo_data}'
        except Exception:
            pass

        # -- PAIE-07 : Solde de conges --"""

if old_block in content:
    content = content.replace(old_block, new_block)
    print('OK — calcul logo_base64 ajoute')
else:
    print('ERREUR — bloc PAIE-07 introuvable')

# Ajouter logo_base64 dans le contexte (apres marital_status_display)
old_ctx_end = "            'marital_status_display': marital_status_display,"
new_ctx_end = """            'marital_status_display': marital_status_display,
            'logo_base64': logo_base64,"""

if old_ctx_end in content:
    content = content.replace(old_ctx_end, new_ctx_end)
    print('OK — logo_base64 ajoute au contexte')
else:
    print('ERREUR — marital_status_display introuvable dans le contexte')

with open('payroll/services/pdf_generator.py', 'w') as f:
    f.write(content)

print('Patch pdf_generator.py termine.')
