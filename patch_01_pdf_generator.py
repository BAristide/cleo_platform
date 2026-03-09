"""
Patch payroll/services/pdf_generator.py — v3.29.0
Selection dynamique du template PDF selon country_code.
- CI → payslip_ci.html (style GOS)
- MA → payslip_ma.html (style Attijari)
- Autres → payslip_generic.html
"""

with open('payroll/services/pdf_generator.py', 'r') as f:
    content = f.read()

# Ajouter le mapping des templates apres MARITAL_STATUS_MAP
old_map = """MARITAL_STATUS_MAP = {
    'single': 'Celibataire',
    'married': 'Marie(e)',
    'divorced': 'Divorce(e)',
    'widowed': 'Veuf/Veuve',
}"""

new_map = """MARITAL_STATUS_MAP = {
    'single': 'Celibataire',
    'married': 'Marie(e)',
    'divorced': 'Divorce(e)',
    'widowed': 'Veuf/Veuve',
}

# Templates PDF par pays (v3.29.0)
PAYSLIP_TEMPLATE_MAP = {
    'CI': 'payroll/pdf/payslip_ci.html',
    'MA': 'payroll/pdf/payslip_ma.html',
}
PAYSLIP_TEMPLATE_DEFAULT = 'payroll/pdf/payslip_generic.html'"""

if old_map in content and 'PAYSLIP_TEMPLATE_MAP' not in content:
    content = content.replace(old_map, new_map)
    print('OK — PAYSLIP_TEMPLATE_MAP ajoute')
else:
    if 'PAYSLIP_TEMPLATE_MAP' in content:
        print('SKIP — PAYSLIP_TEMPLATE_MAP deja present')
    else:
        print('ERREUR — MARITAL_STATUS_MAP introuvable')

# Remplacer la ligne render_to_string avec le template fixe par la selection dynamique
old_render = (
    "        html_string = render_to_string('payroll/pdf/payslip.html', context)"
)

new_render = """        # Selection du template selon le pays (v3.29.0)
        country_code = ''
        try:
            from core.models import CompanySetup as _CS
            _setup = _CS.objects.first()
            if _setup:
                country_code = _setup.country_code or ''
        except Exception:
            pass
        template_name = PAYSLIP_TEMPLATE_MAP.get(country_code, PAYSLIP_TEMPLATE_DEFAULT)
        html_string = render_to_string(template_name, context)"""

if old_render in content:
    content = content.replace(old_render, new_render)
    print('OK — selection dynamique du template ajoutee')
else:
    print('ERREUR — ligne render_to_string introuvable')

with open('payroll/services/pdf_generator.py', 'w') as f:
    f.write(content)

print('Patch pdf_generator.py termine.')
