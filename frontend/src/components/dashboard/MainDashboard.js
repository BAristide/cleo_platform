// src/components/dashboard/MainDashboard.js
import React, { useEffect, useState } from 'react';
import { Layout, Row, Col, Typography, Card, Spin, Alert } from 'antd';
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

        const invoiceStats = {
          count: invoicesData.length || 0,
          amount: invoicesData.reduce((acc, invoice) => acc + (parseFloat(invoice.total) || 0), 0),
          paid: invoicesData
            .filter((invoice) => invoice.payment_status === 'paid')
            .reduce((acc, invoice) => acc + (parseFloat(invoice.total) || 0), 0),
          overdue: invoicesData
            .filter((invoice) => invoice.payment_status === 'overdue')
            .reduce((acc, invoice) => acc + (parseFloat(invoice.total) || 0), 0),
        };

        const quoteStats = {
          count: quotesData.length || 0,
          amount: quotesData.reduce((acc, quote) => acc + (parseFloat(quote.total) || 0), 0),
        };

        const orderStats = {
          count: ordersData.length || 0,
          amount: ordersData.reduce((acc, order) => acc + (parseFloat(order.total) || 0), 0),
        };

        dashboardData.sales = {
          quotes: quoteStats,
          orders: orderStats,
          invoices: invoiceStats,
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
        dashboardData.payroll = {
          current_period: { total_gross: 0, total_net: 0 },
        };
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

        const accountStats = {
          total: accounts.length || 0,
          active: accounts.filter((account) => account.is_active).length || 0,
        };

        const entryStats = {
          total: entries.length || 0,
          draft: entries.filter((entry) => entry.state === 'draft').length || 0,
          posted: entries.filter((entry) => entry.state === 'posted').length || 0,
          amount: entries
            .filter((entry) => entry.state === 'posted')
            .reduce((acc, entry) => acc + (parseFloat(entry.total_debit) || 0), 0),
        };

        const bankStatementStats = {
          total: bankStatements.length || 0,
          reconciled: bankStatements.filter((statement) => statement.state === 'confirm').length || 0,
          notReconciled: bankStatements.filter((statement) => statement.state !== 'confirm').length || 0,
        };

        const assetStats = {
          total: assets.length || 0,
          value: assets.reduce((acc, asset) => acc + (parseFloat(asset.acquisition_value) || 0), 0),
          depreciation: assets.reduce(
            (acc, asset) => acc + (parseFloat(asset.depreciation_value) || 0),
            0
          ),
        };

        dashboardData.accounting = {
          accounts: accountStats,
          entries: entryStats,
          bankStatements: bankStatementStats,
          assets: assetStats,
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
        const activeJobOpenings = jobOpenings.filter((job) => job.status === 'published');

        dashboardData.recruitment = {
          job_openings_count: jobOpenings.length,
          active_job_openings_count: activeJobOpenings.length,
          applications_count: applications.length,
        };
      } catch (err) {
        console.error('Error fetching Recruitment dashboard:', err);
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
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <Spin size="large" tip="Chargement du tableau de bord..." />
      </div>
    );
  }

  return (
    <Layout className="main-dashboard">
      <Header
        className="dashboard-header"
        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
      >
        <Title level={2} style={{ margin: 0 }}>
          Tableau de bord Cleo ERP
        </Title>
        <UserMenu />
      </Header>

      <Content className="dashboard-content">
        {error && (
          <Alert
            message="Erreur"
            description={error}
            type="error"
            showIcon
            style={{ marginBottom: 16 }}
          />
        )}

        <Row gutter={[16, 16]}>
          <Col span={24}>
            <KPISummary stats={stats} />
          </Col>
        </Row>

        <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
          <Col span={24} md={16}>
            <Card title="Modules">
              <Row gutter={[16, 16]}>
                <Col span={8}>
                  <ModuleCard
                    title="CRM"
                    icon="team"
                    description="Gestion de la relation client"
                    path="/crm"
                    stats={{
                      count: stats.crm?.contacts || 0,
                      recent: stats.crm?.opportunities || 0,
                    }}
                  />
                </Col>

                <Col span={8}>
                  <ModuleCard
                    title="Ventes"
                    icon="shopping-cart"
                    description="Devis, commandes et factures"
                    path="/sales"
                    stats={{
                      count: stats.sales?.invoices?.count || 0,
                      recent: stats.sales?.quotes?.count || 0,
                    }}
                  />
                </Col>

                <Col span={8}>
                  <ModuleCard
                    title="RH"
                    icon="user"
                    description="Gestion des ressources humaines"
                    path="/hr"
                    stats={{
                      count: stats.hr?.general?.total_employees || 0,
                      recent: stats.hr?.missions?.upcoming?.length || 0,
                    }}
                  />
                </Col>

                <Col span={8}>
                  <ModuleCard
                    title="Paie"
                    icon="dollar"
                    description="Gestion de la paie"
                    path="/payroll"
                    stats={{
                      count: stats.payroll?.totals?.employees || 0,
                      recent: stats.payroll?.totals?.payslips || 0,
                    }}
                  />
                </Col>

                <Col span={8}>
                  <ModuleCard
                    title="Comptabilité"
                    icon="bank"
                    description="Gestion comptable"
                    path="/accounting"
                    stats={{
                      count: stats.accounting?.accounts?.total || 0,
                      recent: stats.accounting?.entries?.total || 0,
                    }}
                  />
                </Col>

                <Col span={8}>
                  <ModuleCard
                    title="Recrutement"
                    icon="solution"
                    description="Gestion du recrutement"
                    path="/recruitment"
                    stats={{
                      count: stats.recruitment?.job_openings_count || 0,
                      recent: stats.recruitment?.applications_count || 0,
                    }}
                  />
                </Col>
              </Row>
            </Card>
          </Col>

          <Col span={24} md={8}>
            <QuickActions />
          </Col>
        </Row>

        <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
          <Col span={24}>
            <RecentActivity activities={recentActivity} />
          </Col>
        </Row>
      </Content>
    </Layout>
  );
};

export default MainDashboard;
