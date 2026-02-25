import React, { useEffect, useState } from 'react';
import { Layout, Spin, Alert, Typography } from 'antd';
import ModuleCard from './ModuleCard';
import KPISummary from './KPISummary';
import RecentActivity from './RecentActivity';
import QuickActions from './QuickActions';
import axios from '../../utils/axiosConfig';
import UserMenu from '../common/UserMenu';
import './Dashboard.css';

const { Header, Content } = Layout;
const { Title } = Typography;

const MainDashboard = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState({
    crm: {},
    sales: {},
    hr: {},
    payroll: {},
    accounting: {},
    recruitment: {},
    inventory: {},
    purchasing: {},
  });
  const [recentActivity, setRecentActivity] = useState([]);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    setError(null);

    try {
      const dashboardData = {
        crm: {},
        sales: {},
        hr: {},
        payroll: {},
        accounting: {},
        recruitment: {},
        inventory: {},
    purchasing: {},
      };

      // CRM
      try {
        const crmResponse = await axios.get('/api/crm/dashboard/');
        dashboardData.crm = crmResponse.data || {};
      } catch (err) {
        console.error('Error fetching CRM dashboard:', err);
      }

      // Sales
      try {
        const invoicesResponse = await axios.get('/api/sales/invoices/');
        const quotesResponse = await axios.get('/api/sales/quotes/');
        const ordersResponse = await axios.get('/api/sales/orders/');

        const extractResults = (response) => response?.data?.results || [];

        const invoicesData = extractResults(invoicesResponse);
        const quotesData = extractResults(quotesResponse);
        const ordersData = extractResults(ordersResponse);

        dashboardData.sales = {
          quotes: {
            count: quotesData.length || 0,
            amount: quotesData.reduce((acc, q) => acc + (parseFloat(q.total) || 0), 0),
          },
          orders: {
            count: ordersData.length || 0,
            amount: ordersData.reduce((acc, o) => acc + (parseFloat(o.total) || 0), 0),
          },
          invoices: {
            count: invoicesData.length || 0,
            amount: invoicesData.reduce((acc, i) => acc + (parseFloat(i.total) || 0), 0),
            paid: invoicesData.filter((i) => i.payment_status === 'paid').reduce((acc, i) => acc + (parseFloat(i.total) || 0), 0),
            overdue: invoicesData.filter((i) => i.payment_status === 'overdue').reduce((acc, i) => acc + (parseFloat(i.total) || 0), 0),
          },
        };
      } catch (err) {
        console.error('Error fetching Sales dashboard:', err);
      }

      // HR
      try {
        const hrResponse = await axios.get('/api/hr/dashboard/');
        dashboardData.hr = hrResponse.data || {};
      } catch (err) {
        console.error('Error fetching HR dashboard:', err);
      }

      // Payroll
      try {
        const payrollResponse = await axios.get('/api/payroll/dashboard/');
        dashboardData.payroll = payrollResponse.data || {};
      } catch (err) {
        console.error('Error fetching Payroll dashboard:', err);
        dashboardData.payroll = { current_period: { total_gross: 0, total_net: 0 } };
      }

      // Accounting
      try {
        const accountsResponse = await axios.get('/api/accounting/accounts/');
        const entriesResponse = await axios.get('/api/accounting/journal-entries/');
        const bankStatementsResponse = await axios.get('/api/accounting/bank-statements/');
        const assetsResponse = await axios.get('/api/accounting/assets/');

        const extractResults = (response) => {
          if (response?.data?.results) return response.data.results;
          return Array.isArray(response?.data) ? response.data : [];
        };

        const accounts = extractResults(accountsResponse);
        const entries = extractResults(entriesResponse);
        const bankStatements = extractResults(bankStatementsResponse);
        const assets = extractResults(assetsResponse);

        dashboardData.accounting = {
          accounts: { total: accounts.length || 0, active: accounts.filter((a) => a.is_active).length || 0 },
          entries: {
            total: entries.length || 0,
            draft: entries.filter((e) => e.state === 'draft').length || 0,
            posted: entries.filter((e) => e.state === 'posted').length || 0,
            amount: entries.filter((e) => e.state === 'posted').reduce((acc, e) => acc + (parseFloat(e.total_debit) || 0), 0),
          },
          bankStatements: {
            total: bankStatements.length || 0,
            reconciled: bankStatements.filter((s) => s.state === 'confirm').length || 0,
          },
          assets: {
            total: assets.length || 0,
            value: assets.reduce((acc, a) => acc + (parseFloat(a.acquisition_value) || 0), 0),
          },
        };
      } catch (err) {
        console.error('Error fetching Accounting dashboard:', err);
      }

      // Recruitment
      try {
        const jobOpeningsResponse = await axios.get('/api/recruitment/job-openings/');
        const applicationsResponse = await axios.get('/api/recruitment/applications/');
        const extractResults = (response) => response?.data?.results || [];
        const jobOpenings = extractResults(jobOpeningsResponse);
        const applications = extractResults(applicationsResponse);

        dashboardData.recruitment = {
          job_openings_count: jobOpenings.length,
          active_job_openings_count: jobOpenings.filter((j) => j.status === 'published').length,
          applications_count: applications.length,
        };
      } catch (err) {
        console.error('Error fetching Recruitment dashboard:', err);
      }

      // Inventory
      try {
        const inventoryResponse = await axios.get('/api/inventory/dashboard/');
        dashboardData.inventory = inventoryResponse.data || {};
      } catch (err) {
        console.error('Error fetching Inventory dashboard:', err);
      }


      // Purchasing
      try {
        const purchasingResponse = await axios.get('/api/purchasing/dashboard/');
        dashboardData.purchasing = purchasingResponse.data || {};
      } catch (err) {
        console.error('Error fetching Purchasing dashboard:', err);
      }
      // Recent Activities
      try {
        const activitiesResponse = await axios.get('/api/users/activity-logs/', {
          params: { limit: 10, order: '-created_at' },
        });
        setRecentActivity(activitiesResponse.data?.results || []);
      } catch (err) {
        console.error('Error fetching Recent Activities:', err);
      }

      setStats(dashboardData);
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      setError('Impossible de charger les données du tableau de bord');
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

  const modules = [
    {
      title: 'CRM', icon: 'team', description: 'Contacts, opportunités, pipeline commercial',
      path: '/crm', colorClass: 'module-crm', color: '#3b82f6',
      stats: { count: stats.crm?.contacts || 0, recent: stats.crm?.opportunities || 0 },
    },
    {
      title: 'Ventes', icon: 'shopping-cart', description: 'Devis, commandes, factures, paiements',
      path: '/sales', colorClass: 'module-sales', color: '#10b981',
      stats: { count: stats.sales?.invoices?.count || 0, recent: stats.sales?.quotes?.count || 0 },
    },
    {
      title: 'Stocks', icon: 'inbox', description: 'Entrepôts, mouvements, niveaux de stock',
      path: '/inventory', colorClass: 'module-inventory', color: '#14b8a6',
      stats: { count: stats.inventory?.total_products || 0, recent: stats.inventory?.alerts_count || 0 },
    },
    {
      title: 'Achats', icon: 'shopping', description: 'Fournisseurs, commandes, réceptions, factures',
      path: '/purchasing', colorClass: 'module-purchasing', color: '#f97316',
      stats: { count: stats.purchasing?.suppliers_count || 0, recent: stats.purchasing?.pending_orders || 0 },
    },
    {
      title: 'Ressources Humaines', icon: 'user', description: 'Employés, départements, missions',
      path: '/hr', colorClass: 'module-hr', color: '#f59e0b',
      stats: { count: stats.hr?.general?.total_employees || 0, recent: stats.hr?.missions?.upcoming?.length || 0 },
    },
    {
      title: 'Paie', icon: 'dollar', description: 'Bulletins de paie, acomptes, composants',
      path: '/payroll', colorClass: 'module-payroll', color: '#8b5cf6',
      stats: { count: stats.payroll?.totals?.employees || 0, recent: stats.payroll?.totals?.payslips || 0 },
    },
    {
      title: 'Comptabilité', icon: 'bank', description: 'Plan comptable, journaux, écritures',
      path: '/accounting', colorClass: 'module-accounting', color: '#6366f1',
      stats: { count: stats.accounting?.accounts?.total || 0, recent: stats.accounting?.entries?.total || 0 },
    },
    {
      title: 'Recrutement', icon: 'solution', description: 'Offres, candidatures, évaluations',
      path: '/recruitment', colorClass: 'module-recruitment', color: '#ec4899',
      stats: { count: stats.recruitment?.job_openings_count || 0, recent: stats.recruitment?.applications_count || 0 },
    },
  ];

  return (
    <Layout className="main-dashboard">
      <Header className="dashboard-header">
        <Title level={3} style={{ margin: 0, color: '#fff' }}>
          Cleo ERP
        </Title>
        <UserMenu />
      </Header>

      <Content className="dashboard-content">
        {error && (
          <Alert message="Erreur" description={error} type="error" showIcon style={{ marginBottom: 20, borderRadius: 12 }} />
        )}

        {/* KPIs */}
        <KPISummary stats={stats} />

        {/* Modules */}
        <div className="section-title">
          <span className="section-icon" style={{ background: '#3b82f6' }}>📦</span>
          Modules
        </div>
        <div className="modules-grid">
          {modules.map((mod, i) => (
            <ModuleCard key={i} {...mod} />
          ))}
        </div>

        {/* Bottom Row: Activity + Quick Actions */}
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

export default MainDashboard;
