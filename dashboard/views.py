# dashboard/views.py
from datetime import timedelta
from decimal import Decimal

from django.db.models import Count, F, Q, Sum
from django.utils import timezone
from rest_framework import permissions
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response

from users.permissions import module_permission_required


def _parse_period(request):
    """Parse les paramètres de période depuis la requête."""
    period = request.GET.get('period', 'month')
    now = timezone.now()

    if period == 'year':
        start = now.replace(month=1, day=1, hour=0, minute=0, second=0, microsecond=0)
        # Même période année précédente
        prev_start = start.replace(year=start.year - 1)
        prev_end = now.replace(year=now.year - 1)
    elif period == 'quarter':
        quarter_month = ((now.month - 1) // 3) * 3 + 1
        start = now.replace(
            month=quarter_month, day=1, hour=0, minute=0, second=0, microsecond=0
        )
        prev_start = start.replace(year=start.year - 1)
        prev_end = now.replace(year=now.year - 1)
    else:  # month (défaut)
        start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        if now.month == 1:
            prev_start = start.replace(year=start.year - 1, month=12)
        else:
            prev_start = start.replace(month=start.month - 1)
        prev_end = now.replace(year=prev_start.year, month=prev_start.month)

    return {
        'now': now,
        'start': start,
        'prev_start': prev_start,
        'prev_end': prev_end,
        'period': period,
    }


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
@module_permission_required('dashboard')
def executive_dashboard(request):
    """Dashboard décisionnel consolidé pour la direction."""
    from hr.models import Employee
    from inventory.models import StockLevel
    from purchasing.models import SupplierInvoice
    from sales.models import Invoice, InvoiceItem

    dates = _parse_period(request)
    now = dates['now']
    start = dates['start']
    prev_start = dates['prev_start']
    prev_end = dates['prev_end']

    # ── Chiffre d'affaires ──
    ca_filter = Q(type='standard') & ~Q(payment_status='cancelled')
    ca_current = (
        Invoice.objects.filter(ca_filter, date__gte=start, date__lte=now).aggregate(
            total=Sum(F('total') * F('currency__exchange_rate'))
        )['total']
        or Decimal('0')
    ).quantize(Decimal('0.01'))

    ca_previous = (
        Invoice.objects.filter(
            ca_filter, date__gte=prev_start, date__lte=prev_end
        ).aggregate(total=Sum(F('total') * F('currency__exchange_rate')))['total']
        or Decimal('0')
    ).quantize(Decimal('0.01'))

    ca_evolution = Decimal('0')
    if ca_previous > 0:
        ca_evolution = ((ca_current - ca_previous) / ca_previous * 100).quantize(
            Decimal('0.1')
        )

    # ── Marge brute ──
    achats_current = SupplierInvoice.objects.filter(
        state__in=['validated', 'paid'], date__gte=start, date__lte=now
    ).aggregate(total=Sum('total'))['total'] or Decimal('0')

    marge_brute = ca_current - achats_current

    # ── Créances clients ──
    creances = (
        Invoice.objects.filter(
            payment_status__in=['unpaid', 'partial', 'overdue'], type='standard'
        ).aggregate(
            total=Sum((F('total') - F('amount_paid')) * F('currency__exchange_rate'))
        )['total']
        or Decimal('0')
    ).quantize(Decimal('0.01'))

    # ── Dettes fournisseurs ──
    dettes = SupplierInvoice.objects.filter(state='validated').aggregate(
        total=Sum('amount_due')
    )['total'] or Decimal('0')

    # ── Factures échues ──
    overdue_invoices = (
        Invoice.objects.filter(
            payment_status__in=['unpaid', 'partial', 'overdue'],
            type='standard',
            due_date__lt=now.date(),
        )
        .values('id', 'number', 'company__name', 'total', 'amount_paid', 'due_date')
        .order_by('due_date')[:10]
    )

    overdue_list = []
    for inv in overdue_invoices:
        overdue_list.append(
            {
                'id': inv['id'],
                'number': inv['number'],
                'client': inv.get('company__name') or '—',
                'total': str(inv['total']),
                'due': str(inv['total'] - inv['amount_paid']),
                'due_date': inv['due_date'].isoformat() if inv['due_date'] else None,
                'days_overdue': (now.date() - inv['due_date']).days
                if inv['due_date']
                else 0,
            }
        )

    overdue_total = (
        Invoice.objects.filter(
            payment_status__in=['unpaid', 'partial', 'overdue'],
            type='standard',
            due_date__lt=now.date(),
        ).aggregate(
            total=Sum((F('total') - F('amount_paid')) * F('currency__exchange_rate'))
        )['total']
        or Decimal('0')
    ).quantize(Decimal('0.01'))

    # ── Top 5 produits ──
    top_products = (
        InvoiceItem.objects.filter(
            invoice__type='standard',
            invoice__date__gte=start,
        )
        .exclude(invoice__payment_status='cancelled')
        .values('product__name')
        .annotate(
            total_qty=Sum('quantity'),
            total_revenue=Sum(
                F('quantity') * F('unit_price') * F('invoice__currency__exchange_rate')
            ),
        )
        .order_by('-total_revenue')[:5]
    )

    top_products_list = [
        {
            'name': p['product__name'] or 'Divers',
            'quantity': float(p['total_qty']),
            'revenue': str(p['total_revenue']),
        }
        for p in top_products
    ]

    # ── Top 5 clients ──
    top_clients = (
        Invoice.objects.filter(type='standard', date__gte=start)
        .exclude(payment_status='cancelled')
        .values('company__name')
        .annotate(
            total_ca=Sum(F('total') * F('currency__exchange_rate')),
            invoice_count=Count('id'),
        )
        .order_by('-total_ca')[:5]
    )

    top_clients_list = [
        {
            'name': c.get('company__name') or 'Divers',
            'revenue': str(c['total_ca']),
            'invoices': c['invoice_count'],
        }
        for c in top_clients
    ]

    # ── Effectif ──
    try:
        total_employees = Employee.objects.filter(is_active=True).count()
    except Exception:
        total_employees = 0

    # ── Stock ──
    try:
        stock_levels = StockLevel.objects.select_related('product').filter(
            product__is_active=True
        )
        stock_value = sum(
            sl.quantity_on_hand * (sl.product.unit_price or 0) for sl in stock_levels
        )
        stock_alerts = StockLevel.objects.filter(
            product__is_active=True,
            product__stock_alert_threshold__gt=0,
            quantity_on_hand__lte=F('product__stock_alert_threshold'),
        ).count()
    except Exception:
        stock_value = 0
        stock_alerts = 0

    # ── CA mensuel (12 derniers mois) ──
    monthly_revenue = []
    for i in range(11, -1, -1):
        month_date = now - timedelta(days=i * 30)
        m_start = month_date.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        if m_start.month == 12:
            m_end = m_start.replace(year=m_start.year + 1, month=1)
        else:
            m_end = m_start.replace(month=m_start.month + 1)

        month_ca = (
            Invoice.objects.filter(
                ca_filter, date__gte=m_start, date__lt=m_end
            ).aggregate(total=Sum(F('total') * F('currency__exchange_rate')))['total']
            or Decimal('0')
        ).quantize(Decimal('0.01'))

        month_achats = SupplierInvoice.objects.filter(
            state__in=['validated', 'paid'], date__gte=m_start, date__lt=m_end
        ).aggregate(total=Sum('total'))['total'] or Decimal('0')

        monthly_revenue.append(
            {
                'month': m_start.strftime('%Y-%m'),
                'label': m_start.strftime('%b %Y'),
                'revenue': str(month_ca),
                'purchases': str(month_achats),
                'margin': str(month_ca - month_achats),
            }
        )

    # ── Trésorerie (soldes bancaires) ──
    try:
        from sales.models import BankAccount

        bank_total = BankAccount.objects.filter(is_active=True).aggregate(
            total=Sum('balance')
        )['total'] or Decimal('0')
    except Exception:
        bank_total = Decimal('0')

    return Response(
        {
            'period': dates['period'],
            'period_start': start.date().isoformat(),
            # KPIs principaux
            'revenue': str(ca_current),
            'revenue_previous': str(ca_previous),
            'revenue_evolution': str(ca_evolution),
            'purchases': str(achats_current),
            'gross_margin': str(marge_brute),
            'receivables': str(creances),
            'payables': str(dettes),
            'bank_balance': str(bank_total),
            'employees': total_employees,
            'stock_value': str(Decimal(str(stock_value)).quantize(Decimal('0.01'))),
            'stock_alerts': stock_alerts,
            # Détails
            'overdue_invoices': overdue_list,
            'overdue_total': str(overdue_total),
            'top_products': top_products_list,
            'top_clients': top_clients_list,
            'monthly_revenue': monthly_revenue,
        }
    )
