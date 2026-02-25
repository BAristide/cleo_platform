import React, { useEffect, useState } from 'react';
import { Layout, Spin, Alert, Typography, Select } from 'antd';
import {
  DollarOutlined, RiseOutlined, FallOutlined, BankOutlined,
  TeamOutlined, ShoppingCartOutlined, InboxOutlined, WarningOutlined,
} from '@ant-design/icons';
import axios from '../../utils/axiosConfig';
import { useCurrency } from '../../context/CurrencyContext';
import UserMenu from '../common/UserMenu';
import RevenueChart from './RevenueChart';
import TopProductsChart from './TopProductsChart';
import TopClientsChart from './TopClientsChart';
import OverdueInvoicesWidget from './OverdueInvoicesWidget';
import StockAlertsWidget from './StockAlertsWidget';
import ModuleCard from './ModuleCard';
import QuickActions from './QuickActions';
import RecentActivity from './RecentActivity';
import './Dashboard.css';

const { Header, Content } = Layout;
const { Title } = Typography;

const ExecutiveDashboard = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);
  const [period, setPeriod] = useState('month');
  const [recentActivity, setRecentActivity] = useState([]);
  const [moduleStats, setModuleStats] = useState({});
  const { currencyCode } = useCurrency();

  useEffect(() => {
    fetchData();
  }, [period]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [execRes, activityRes] = await Promise.all([
        axios.get(`/api/dashboard/executive/?period=${period}`),
        axios.get('/api/users/activity-logs/', { params: { limit: 10, order: '-created_at' } }).catch(() => ({ data: { results: [] } })),
      ]);
      setData(execRes.data);
      setRecentActivity(activityRes.data?.results || []);

      // Fetch module stats en parallèle
      const [crm, sales, hr, inv, purch] = await Promise.all([
        axios.get('/api/crm/dashboard/').catch(() => ({ data: {} })),
        axios.get('/api/sales/invoices/').catch(() => ({ data: { results: [] } })),
        axios.get('/api/hr/dashboard/').catch(() => ({ data: {} })),
        axios.get('/api/inventory/dashboard/').catch(() => ({ data: {} })),
        axios.get('/api/purchasing/dashboard/').catch(() => ({ data: {} })),
      ]);
      setModuleStats({ crm: crm.data, sales: sales.data, hr: hr.data, inventory: inv.data, purchasing: purch.data });
    } catch (err) {
      setError('Impossible de charger le tableau de bord');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#f0f2f5' }}>
        <Spin size="large" tip="Chargement du tableau de bord..." />
      </div>
    );
  }

  const fmt = (val) => parseFloat(val || 0).toLocaleString('fr-MA', { minimumFractionDigits: 2 });
  const evo = parseFloat(data?.revenue_evolution || 0);

  const kpis = [
    { label: `CA (${data?.period === 'month' ? 'mois' : data?.period === 'quarter' ? 'trimestre' : 'année'})`, value: fmt(data?.revenue), suffix: currencyCode, icon: <DollarOutlined />, color: '#3b82f6' },
    { label: 'Évolution N-1', value: `${evo > 0 ? '+' : ''}${evo}%`, icon: evo >= 0 ? <RiseOutlined /> : <FallOutlined />, color: evo >= 0 ? '#10b981' : '#e53e3e' },
    { label: 'Marge brute', value: fmt(data?.gross_margin), suffix: currencyCode, icon: <RiseOutlined />, color: '#10b981' },
    { label: 'Créances clients', value: fmt(data?.receivables), suffix: currencyCode, icon: <ShoppingCartOutlined />, color: '#f59e0b' },
    { label: 'Dettes fournisseurs', value: fmt(data?.payables), suffix: currencyCode, icon: <ShoppingCartOutlined />, color: '#ef4444' },
    { label: 'Trésorerie', value: fmt(data?.bank_balance), suffix: currencyCode, icon: <BankOutlined />, color: '#6366f1' },
    { label: 'Effectif', value: data?.employees || 0, icon: <TeamOutlined />, color: '#8b5cf6' },
    { label: 'Valeur stock', value: fmt(data?.stock_value), suffix: currencyCode, icon: <InboxOutlined />, color: '#14b8a6', extra: data?.stock_alerts > 0 ? `${data.stock_alerts} alerte(s)` : null },
  ];

  const modules = [
    { title: 'CRM', icon: 'team', description: 'Contacts, opportunités, pipeline', path: '/crm', colorClass: 'module-crm', color: '#3b82f6',
      stats: { count: moduleStats.crm?.contacts || 0, recent: moduleStats.crm?.opportunities || 0 } },
    { title: 'Ventes', icon: 'shopping-cart', description: 'Devis, commandes, factures', path: '/sales', colorClass: 'module-sales', color: '#10b981',
      stats: { count: (moduleStats.sales?.results || []).length || 0, recent: 0 } },
    { title: 'Stocks', icon: 'inbox', description: 'Entrepôts, mouvements, niveaux', path: '/inventory', colorClass: 'module-inventory', color: '#14b8a6',
      stats: { count: moduleStats.inventory?.total_products || 0, recent: moduleStats.inventory?.alerts_count || 0 } },
    { title: 'Achats', icon: 'shopping', description: 'Fournisseurs, commandes, réceptions', path: '/purchasing', colorClass: 'module-purchasing', color: '#f97316',
      stats: { count: moduleStats.purchasing?.suppliers_count || 0, recent: moduleStats.purchasing?.pending_orders || 0 } },
    { title: 'RH', icon: 'user', description: 'Employés, départements, missions', path: '/hr', colorClass: 'module-hr', color: '#f59e0b',
      stats: { count: moduleStats.hr?.general?.total_employees || 0, recent: 0 } },
    { title: 'Comptabilité', icon: 'bank', description: 'Plan comptable, journaux, écritures', path: '/accounting', colorClass: 'module-accounting', color: '#6366f1',
      stats: { count: 0, recent: 0 } },
  ];

  return (
    <Layout className="main-dashboard">
      <Header className="dashboard-header">
        <Title level={3} style={{ margin: 0, color: '#fff' }}>Cleo ERP</Title>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <Select value={period} onChange={setPeriod} style={{ width: 140 }}
            options={[
              { value: 'month', label: 'Ce mois' },
              { value: 'quarter', label: 'Ce trimestre' },
              { value: 'year', label: "Cette année" },
            ]}
          />
          <UserMenu />
        </div>
      </Header>

      <Content className="dashboard-content">
        {error && <Alert message={error} type="error" showIcon style={{ marginBottom: 20, borderRadius: 12 }} />}

        {/* KPIs Direction */}
        <div className="kpi-grid">
          {kpis.map((kpi, i) => (
            <div key={i} className={`kpi-card kpi-color-${i}`}>
              <div className="kpi-icon" style={{ color: kpi.color }}>{kpi.icon}</div>
              <div className="kpi-label">{kpi.label}</div>
              <div className="kpi-value" style={{ color: kpi.color }}>
                {kpi.value} {kpi.suffix && <span className="kpi-suffix">{kpi.suffix}</span>}
              </div>
              {kpi.extra && <div style={{ fontSize: 11, color: '#e53e3e', marginTop: 2 }}><WarningOutlined /> {kpi.extra}</div>}
            </div>
          ))}
        </div>

        {/* Graphiques */}
        <div style={{ marginBottom: 24 }}>
          <RevenueChart data={data?.monthly_revenue || []} />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 24 }}>
          <TopProductsChart data={data?.top_products || []} />
          <TopClientsChart data={data?.top_clients || []} />
        </div>

        {/* Alertes */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 24 }}>
          <OverdueInvoicesWidget invoices={data?.overdue_invoices || []} total={data?.overdue_total || '0'} />
          <StockAlertsWidget alertsCount={data?.stock_alerts || 0} />
        </div>

        {/* Modules */}
        <div className="section-title">
          <span className="section-icon" style={{ background: '#3b82f6' }}>📦</span>
          Modules
        </div>
        <div className="modules-grid">
          {modules.map((mod, i) => <ModuleCard key={i} {...mod} />)}
        </div>

        {/* Bottom Row */}
        <div className="bottom-row">
          <div className="activity-card">
            <RecentActivity activities={recentActivity} />
          </div>
          <QuickActions />
        </div>
      </Content>
    </Layout>
  );
};

export default ExecutiveDashboard;
