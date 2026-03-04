"""
Signaux comptables — DÉSACTIVÉ v3.12.1

Les anciens signal handlers (post_save sur Invoice/Payment) utilisaient
des comptes hardcodés inexistants (411000, 701000, etc.) et vérifiaient
des champs state qui n'existent pas sur les modèles Sales.

L'intégration comptable est désormais gérée directement dans les views :
  - sales/views.py : _generate_invoice_entry() et _generate_payment_entry()
  - purchasing/views.py : hooks dans validate() et perform_create()
  - accounting/services/journal_entry_service.py : résolution dynamique des comptes

Ce fichier est conservé vide pour éviter les erreurs d'import.
"""
