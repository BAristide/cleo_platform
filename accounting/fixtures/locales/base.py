"""
Données comptables universelles — communes à tous les packs.
AccountTypes + exercice fiscal.
"""

ACCOUNT_TYPES = [
    {'code': 'ASSET', 'name': 'Actif', 'is_debit': True, 'sequence': 1},
    {'code': 'LIABILITY', 'name': 'Passif', 'is_debit': False, 'sequence': 2},
    {'code': 'EQUITY', 'name': 'Capitaux propres', 'is_debit': False, 'sequence': 3},
    {'code': 'INCOME', 'name': 'Produits', 'is_debit': False, 'sequence': 4},
    {'code': 'EXPENSE', 'name': 'Charges', 'is_debit': True, 'sequence': 5},
    {'code': 'VIEW', 'name': 'Vue', 'is_debit': True, 'sequence': 10},
]

ANALYTIC_ACCOUNTS = [
    {'code': 'ADMIN', 'name': 'Administration', 'parent': None},
    {'code': 'ADMIN-DIR', 'name': 'Direction générale', 'parent': 'ADMIN'},
    {'code': 'ADMIN-FIN', 'name': 'Finances', 'parent': 'ADMIN'},
    {'code': 'ADMIN-RH', 'name': 'Ressources humaines', 'parent': 'ADMIN'},
    {'code': 'COM', 'name': 'Commercial', 'parent': None},
    {'code': 'COM-VENTE', 'name': 'Ventes', 'parent': 'COM'},
    {'code': 'COM-MKT', 'name': 'Marketing', 'parent': 'COM'},
    {'code': 'PROD', 'name': 'Production', 'parent': None},
    {'code': 'PROD-DEV', 'name': 'Développement', 'parent': 'PROD'},
    {'code': 'PROD-SUPP', 'name': 'Support', 'parent': 'PROD'},
]
