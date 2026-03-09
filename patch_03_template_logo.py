"""
Patch payroll/templates/payroll/pdf/payslip.html — PAIE-12 : logo dans le header.
Ajoute l'image logo au-dessus du nom de l'entreprise.
"""

with open('payroll/templates/payroll/pdf/payslip.html', 'r') as f:
    content = f.read()

# Remplacer le bloc company-info pour ajouter le logo
old_header = """        <div class="company-info">
            <h1>{{ company.name }}</h1>"""

new_header = """        <div class="company-info">
            {% if logo_base64 %}<img src="{{ logo_base64 }}" alt="Logo" style="max-height: 45px; max-width: 150px; margin-bottom: 4px; display: block;" />{% endif %}
            <h1>{{ company.name }}</h1>"""

if old_header in content:
    content = content.replace(old_header, new_header)
    with open('payroll/templates/payroll/pdf/payslip.html', 'w') as f:
        f.write(content)
    print('OK — logo ajoute dans le header du template PDF')
else:
    print('ERREUR — bloc company-info introuvable dans payslip.html')
