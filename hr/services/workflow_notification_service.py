"""
Service centralise de notifications workflow.

Appele depuis les actions ViewSet (submit, approve_*, reject, cancel, reimburse).
Utilise _create_notification de notifications.tasks.
Resout le lien contextuel /my-space/... ou /hr/... selon le role du destinataire.

Regle : ne JAMAIS creer de notifications workflow dans les signaux Django.
"""

import logging

from django.utils import timezone

from notifications.tasks import _create_notification

logger = logging.getLogger(__name__)


class WorkflowNotificationService:
    """Service centralise pour toutes les notifications de workflow RH."""

    # ── Methodes utilitaires ──────────────────────────────────────

    @staticmethod
    def _resolve_link(user, selfservice_path, admin_path):
        """
        Retourne selfservice_path si l'utilisateur n'a pas acces au module hr,
        sinon admin_path.
        """
        from users.permissions import ModulePermissionBackend

        backend = ModulePermissionBackend()
        if backend.has_module_permission(user, 'hr', 'read'):
            return admin_path
        return selfservice_path

    @staticmethod
    def _get_manager_user(employee):
        """Retourne le User du N+1 s'il existe."""
        if employee.manager and employee.manager.user:
            return employee.manager.user
        return None

    @staticmethod
    def _get_hr_users():
        """Retourne les Users avec is_hr=True sur leur Employee."""
        from hr.models import Employee

        return [
            emp.user
            for emp in Employee.objects.filter(
                is_hr=True,
                is_active=True,
                user__isnull=False,
            ).select_related('user')
        ]

    @staticmethod
    def _get_finance_users():
        """Retourne les Users avec is_finance=True sur leur Employee."""
        from hr.models import Employee

        return [
            emp.user
            for emp in Employee.objects.filter(
                is_finance=True,
                is_active=True,
                user__isnull=False,
            ).select_related('user')
        ]

    @staticmethod
    def _today_str():
        return timezone.now().date().isoformat()

    @classmethod
    def _notify(cls, user, level, title, message, link_self, link_admin, dedup_key):
        """Cree une notification avec resolution contextuelle du lien."""
        if not user:
            return
        link = cls._resolve_link(user, link_self, link_admin)
        try:
            _create_notification(
                user=user,
                level=level,
                title=title,
                message=message,
                module='hr',
                link=link,
                dedup_key=dedup_key,
            )
        except Exception:
            logger.exception(
                'Erreur creation notification workflow: %s pour %s',
                dedup_key,
                user.username,
            )

    # ── Conges ────────────────────────────────────────────────────

    @classmethod
    def leave_submitted(cls, req):
        """Notifie le N+1 qu'une demande de conge a ete soumise."""
        manager_user = cls._get_manager_user(req.employee)
        if not manager_user:
            return
        cls._notify(
            user=manager_user,
            level='info',
            title='Nouvelle demande de conge',
            message=(
                f'{req.employee.full_name} a soumis une demande de {req.leave_type.name} '
                f'du {req.start_date} au {req.end_date} ({req.nb_days} jours).'
            ),
            link_self='/my-space/leaves',
            link_admin='/hr/leaves',
            dedup_key=f'leave_submitted_{req.pk}_{cls._today_str()}',
        )

    @classmethod
    def leave_approved_manager(cls, req):
        """Notifie l'employe + les RH."""
        if req.employee.user:
            cls._notify(
                user=req.employee.user,
                level='info',
                title='Conge approuve par votre N+1',
                message=(
                    f'Votre demande de {req.leave_type.name} '
                    f'du {req.start_date} au {req.end_date} a ete approuvee par votre manager. '
                    f'En attente de validation RH.'
                ),
                link_self='/my-space/leaves',
                link_admin='/hr/leaves',
                dedup_key=f'leave_approved_mgr_{req.pk}',
            )
        for hr_user in cls._get_hr_users():
            cls._notify(
                user=hr_user,
                level='info',
                title='Conge en attente de validation RH',
                message=(
                    f'{req.employee.full_name} — {req.leave_type.name} '
                    f'du {req.start_date} au {req.end_date} ({req.nb_days} jours). '
                    f'Approuve par le N+1, en attente de votre validation.'
                ),
                link_self='/my-space/leaves',
                link_admin='/hr/leaves',
                dedup_key=f'leave_pending_hr_{req.pk}',
            )

    @classmethod
    def leave_approved_hr(cls, req):
        """Notifie l'employe."""
        if not req.employee.user:
            return
        cls._notify(
            user=req.employee.user,
            level='success',
            title='Conge approuve',
            message=(
                f'Votre demande de {req.leave_type.name} '
                f'du {req.start_date} au {req.end_date} a ete approuvee.'
            ),
            link_self='/my-space/leaves',
            link_admin='/hr/leaves',
            dedup_key=f'leave_approved_{req.pk}',
        )

    @classmethod
    def leave_rejected(cls, req):
        """Notifie l'employe."""
        if not req.employee.user:
            return
        cls._notify(
            user=req.employee.user,
            level='warning',
            title='Conge refuse',
            message=(
                f'Votre demande de {req.leave_type.name} '
                f'du {req.start_date} au {req.end_date} a ete refusee.'
            ),
            link_self='/my-space/leaves',
            link_admin='/hr/leaves',
            dedup_key=f'leave_rejected_{req.pk}',
        )

    @classmethod
    def leave_cancelled(cls, req):
        """Notifie le N+1 si la demande etait soumise."""
        manager_user = cls._get_manager_user(req.employee)
        if not manager_user:
            return
        cls._notify(
            user=manager_user,
            level='info',
            title='Demande de conge annulee',
            message=(
                f'{req.employee.full_name} a annule sa demande de {req.leave_type.name} '
                f'du {req.start_date} au {req.end_date}.'
            ),
            link_self='/my-space/leaves',
            link_admin='/hr/leaves',
            dedup_key=f'leave_cancelled_{req.pk}_{cls._today_str()}',
        )

    # ── Notes de frais ────────────────────────────────────────────

    @classmethod
    def expense_submitted(cls, report):
        """Notifie le N+1."""
        manager_user = cls._get_manager_user(report.employee)
        if not manager_user:
            return
        cls._notify(
            user=manager_user,
            level='info',
            title='Nouvelle note de frais',
            message=(
                f'{report.employee.full_name} a soumis la note de frais '
                f'\xab {report.title} \xbb ({report.total_amount}).'
            ),
            link_self='/my-space/expenses',
            link_admin='/hr/expenses',
            dedup_key=f'expense_submitted_{report.pk}_{cls._today_str()}',
        )

    @classmethod
    def expense_approved_manager(cls, report):
        """Notifie l'employe + les Finance."""
        if report.employee.user:
            cls._notify(
                user=report.employee.user,
                level='info',
                title='Note de frais approuvee par votre N+1',
                message=(
                    f'Votre note \xab {report.title} \xbb a ete approuvee par votre manager. '
                    f'En attente de validation Finance.'
                ),
                link_self='/my-space/expenses',
                link_admin='/hr/expenses',
                dedup_key=f'expense_approved_mgr_{report.pk}',
            )
        for fin_user in cls._get_finance_users():
            cls._notify(
                user=fin_user,
                level='info',
                title='Note de frais en attente Finance',
                message=(
                    f'{report.employee.full_name} — \xab {report.title} \xbb '
                    f'({report.total_amount}). '
                    f'Approuvee par le N+1, en attente de votre validation.'
                ),
                link_self='/my-space/expenses',
                link_admin='/hr/expenses',
                dedup_key=f'expense_pending_fin_{report.pk}',
            )

    @classmethod
    def expense_approved_finance(cls, report):
        """Notifie l'employe."""
        if not report.employee.user:
            return
        cls._notify(
            user=report.employee.user,
            level='success',
            title='Note de frais validee par la Finance',
            message=(
                f'Votre note \xab {report.title} \xbb a ete validee par la Finance. '
                f'En attente de remboursement.'
            ),
            link_self='/my-space/expenses',
            link_admin='/hr/expenses',
            dedup_key=f'expense_approved_fin_{report.pk}',
        )

    @classmethod
    def expense_reimbursed(cls, report):
        """Notifie l'employe."""
        if not report.employee.user:
            return
        cls._notify(
            user=report.employee.user,
            level='success',
            title='Note de frais remboursee',
            message=f'Votre note \xab {report.title} \xbb a ete remboursee.',
            link_self='/my-space/expenses',
            link_admin='/hr/expenses',
            dedup_key=f'expense_reimbursed_{report.pk}',
        )

    @classmethod
    def expense_rejected(cls, report):
        """Notifie l'employe."""
        if not report.employee.user:
            return
        cls._notify(
            user=report.employee.user,
            level='warning',
            title='Note de frais refusee',
            message=f'Votre note \xab {report.title} \xbb a ete refusee.',
            link_self='/my-space/expenses',
            link_admin='/hr/expenses',
            dedup_key=f'expense_rejected_{report.pk}',
        )

    # ── Plans de formation ────────────────────────────────────────

    @classmethod
    def training_submitted(cls, plan):
        """Notifie le N+1."""
        manager_user = cls._get_manager_user(plan.employee)
        if not manager_user:
            return
        cls._notify(
            user=manager_user,
            level='info',
            title='Nouveau plan de formation soumis',
            message=(
                f'{plan.employee.full_name} a soumis son plan de formation {plan.year} '
                f'({plan.training_items.count()} formation(s)).'
            ),
            link_self='/my-space',
            link_admin='/hr/training-plans',
            dedup_key=f'training_submitted_{plan.pk}_{cls._today_str()}',
        )

    @classmethod
    def training_approved_manager(cls, plan):
        """Notifie l'employe + les RH."""
        if plan.employee.user:
            cls._notify(
                user=plan.employee.user,
                level='info',
                title='Plan de formation approuve par votre N+1',
                message=(
                    f'Votre plan de formation {plan.year} a ete approuve par votre manager. '
                    f'En attente de validation RH.'
                ),
                link_self='/my-space',
                link_admin='/hr/training-plans',
                dedup_key=f'training_approved_mgr_{plan.pk}',
            )
        for hr_user in cls._get_hr_users():
            cls._notify(
                user=hr_user,
                level='info',
                title='Plan de formation en attente RH',
                message=(
                    f'{plan.employee.full_name} — plan {plan.year}. '
                    f'Approuve par le N+1, en attente de votre validation.'
                ),
                link_self='/my-space',
                link_admin='/hr/training-plans',
                dedup_key=f'training_pending_hr_{plan.pk}',
            )

    @classmethod
    def training_approved_hr(cls, plan):
        """Notifie l'employe + les Finance."""
        if plan.employee.user:
            cls._notify(
                user=plan.employee.user,
                level='info',
                title='Plan de formation approuve par les RH',
                message=(
                    f'Votre plan de formation {plan.year} a ete approuve par les RH. '
                    f'En attente de validation Finance.'
                ),
                link_self='/my-space',
                link_admin='/hr/training-plans',
                dedup_key=f'training_approved_hr_{plan.pk}',
            )
        for fin_user in cls._get_finance_users():
            cls._notify(
                user=fin_user,
                level='info',
                title='Plan de formation en attente Finance',
                message=(
                    f'{plan.employee.full_name} — plan {plan.year} '
                    f'(cout: {plan.total_training_cost}). '
                    f'Approuve par les RH, en attente de votre validation.'
                ),
                link_self='/my-space',
                link_admin='/hr/training-plans',
                dedup_key=f'training_pending_fin_{plan.pk}',
            )

    @classmethod
    def training_approved_finance(cls, plan):
        """Notifie l'employe."""
        if not plan.employee.user:
            return
        cls._notify(
            user=plan.employee.user,
            level='success',
            title='Plan de formation entierement approuve',
            message=(
                f'Votre plan de formation {plan.year} a ete approuve '
                f'par toutes les parties.'
            ),
            link_self='/my-space',
            link_admin='/hr/training-plans',
            dedup_key=f'training_approved_fin_{plan.pk}',
        )

    @classmethod
    def training_rejected(cls, plan):
        """Notifie l'employe."""
        if not plan.employee.user:
            return
        cls._notify(
            user=plan.employee.user,
            level='warning',
            title='Plan de formation refuse',
            message=f'Votre plan de formation {plan.year} a ete refuse.',
            link_self='/my-space',
            link_admin='/hr/training-plans',
            dedup_key=f'training_rejected_{plan.pk}',
        )

    # ── Missions ──────────────────────────────────────────────────

    @classmethod
    def mission_submitted(cls, mission):
        """Notifie le N+1."""
        manager_user = cls._get_manager_user(mission.employee)
        if not manager_user:
            return
        cls._notify(
            user=manager_user,
            level='info',
            title='Nouvelle mission soumise',
            message=(
                f'{mission.employee.full_name} a soumis la mission '
                f'\xab {mission.title} \xbb a {mission.location} '
                f'du {mission.start_date} au {mission.end_date}.'
            ),
            link_self='/my-space',
            link_admin=f'/hr/missions/{mission.pk}',
            dedup_key=f'mission_submitted_{mission.pk}_{cls._today_str()}',
        )

    @classmethod
    def mission_approved_manager(cls, mission):
        """Notifie l'employe + les RH."""
        if mission.employee.user:
            cls._notify(
                user=mission.employee.user,
                level='info',
                title='Mission approuvee par votre N+1',
                message=(
                    f'Votre mission \xab {mission.title} \xbb a ete approuvee '
                    f'par votre manager. En attente de validation RH.'
                ),
                link_self='/my-space',
                link_admin=f'/hr/missions/{mission.pk}',
                dedup_key=f'mission_approved_mgr_{mission.pk}',
            )
        for hr_user in cls._get_hr_users():
            cls._notify(
                user=hr_user,
                level='info',
                title='Mission en attente RH',
                message=(
                    f'{mission.employee.full_name} — \xab {mission.title} \xbb '
                    f'a {mission.location}. '
                    f'Approuvee par le N+1, en attente de votre validation.'
                ),
                link_self='/my-space',
                link_admin=f'/hr/missions/{mission.pk}',
                dedup_key=f'mission_pending_hr_{mission.pk}',
            )

    @classmethod
    def mission_approved_hr(cls, mission):
        """Notifie l'employe + les Finance."""
        if mission.employee.user:
            cls._notify(
                user=mission.employee.user,
                level='info',
                title='Mission approuvee par les RH',
                message=(
                    f'Votre mission \xab {mission.title} \xbb a ete approuvee par les RH. '
                    f'En attente de validation Finance.'
                ),
                link_self='/my-space',
                link_admin=f'/hr/missions/{mission.pk}',
                dedup_key=f'mission_approved_hr_{mission.pk}',
            )
        for fin_user in cls._get_finance_users():
            cls._notify(
                user=fin_user,
                level='info',
                title='Mission en attente Finance',
                message=(
                    f'{mission.employee.full_name} — \xab {mission.title} \xbb '
                    f'a {mission.location}. '
                    f'Approuvee par les RH, en attente de votre validation.'
                ),
                link_self='/my-space',
                link_admin=f'/hr/missions/{mission.pk}',
                dedup_key=f'mission_pending_fin_{mission.pk}',
            )

    @classmethod
    def mission_approved_finance(cls, mission):
        """Notifie l'employe."""
        if not mission.employee.user:
            return
        cls._notify(
            user=mission.employee.user,
            level='success',
            title='Mission entierement approuvee',
            message=(
                f'Votre mission \xab {mission.title} \xbb a ete approuvee '
                f'par toutes les parties.'
            ),
            link_self='/my-space',
            link_admin=f'/hr/missions/{mission.pk}',
            dedup_key=f'mission_approved_fin_{mission.pk}',
        )

    @classmethod
    def mission_rejected(cls, mission):
        """Notifie l'employe."""
        if not mission.employee.user:
            return
        cls._notify(
            user=mission.employee.user,
            level='warning',
            title='Mission refusee',
            message=f'Votre mission \xab {mission.title} \xbb a ete refusee.',
            link_self='/my-space',
            link_admin=f'/hr/missions/{mission.pk}',
            dedup_key=f'mission_rejected_{mission.pk}',
        )

    # ── Attestations ──────────────────────────────────────────────

    @classmethod
    def certificate_requested(cls, cert):
        """Notifie les RH."""
        for hr_user in cls._get_hr_users():
            cls._notify(
                user=hr_user,
                level='info',
                title="Nouvelle demande d'attestation",
                message=(
                    f'{cert.employee.full_name} a demande une attestation de travail '
                    f'({cert.get_purpose_display()}).'
                ),
                link_self='/my-space/certificates',
                link_admin='/hr/certificates',
                dedup_key=f'cert_requested_{cert.pk}',
            )

    @classmethod
    def certificate_approved(cls, cert):
        """Notifie l'employe."""
        if not cert.employee.user:
            return
        cls._notify(
            user=cert.employee.user,
            level='success',
            title='Attestation de travail disponible',
            message='Votre attestation de travail a ete approuvee et est disponible au telechargement.',
            link_self='/my-space/certificates',
            link_admin=f'/hr/certificates/{cert.pk}',
            dedup_key=f'cert_approved_{cert.pk}',
        )

    @classmethod
    def certificate_rejected(cls, cert):
        """Notifie l'employe."""
        if not cert.employee.user:
            return
        cls._notify(
            user=cert.employee.user,
            level='warning',
            title="Demande d'attestation refusee",
            message="Votre demande d'attestation de travail a ete refusee.",
            link_self='/my-space/certificates',
            link_admin=f'/hr/certificates/{cert.pk}',
            dedup_key=f'cert_rejected_{cert.pk}',
        )

    # ── Disponibilites ────────────────────────────────────────────

    @classmethod
    def availability_approved_manager(cls, availability):
        """Notifie l'employe."""
        if not availability.employee.user:
            return
        cls._notify(
            user=availability.employee.user,
            level='success',
            title='Disponibilite approuvee par votre N+1',
            message=(
                f'Votre demande de {availability.get_type_display()} '
                f'du {availability.start_date} au {availability.end_date} '
                f'a ete approuvee par votre manager.'
            ),
            link_self='/my-space',
            link_admin=f'/hr/availabilities/{availability.pk}',
            dedup_key=f'avail_{availability.pk}_approve_manager_{cls._today_str()}',
        )

    @classmethod
    def availability_approved_hr(cls, availability):
        """Notifie l'employe."""
        if not availability.employee.user:
            return
        cls._notify(
            user=availability.employee.user,
            level='success',
            title='Disponibilite approuvee par les RH',
            message=(
                f'Votre demande de {availability.get_type_display()} '
                f'du {availability.start_date} au {availability.end_date} '
                f'a ete approuvee par les RH.'
            ),
            link_self='/my-space',
            link_admin=f'/hr/availabilities/{availability.pk}',
            dedup_key=f'avail_{availability.pk}_approve_hr_{cls._today_str()}',
        )

    @classmethod
    def availability_rejected(cls, availability):
        """Notifie l'employe."""
        if not availability.employee.user:
            return
        cls._notify(
            user=availability.employee.user,
            level='warning',
            title='Disponibilite rejetee',
            message=(
                f'Votre demande de {availability.get_type_display()} '
                f'du {availability.start_date} au {availability.end_date} '
                f'a ete rejetee.'
            ),
            link_self='/my-space',
            link_admin=f'/hr/availabilities/{availability.pk}',
            dedup_key=f'avail_{availability.pk}_reject_{cls._today_str()}',
        )
