// src/components/dashboard/MainDashboard.js
import React, { useState, useEffect } from 'react';
import { Layout, Row, Col, Typography, Card, Spin, Button, Alert } from 'antd';
import { Link } from 'react-router-dom';
import ModuleCard from './ModuleCard';
import KPISummary from './KPISummary';
import RecentActivity from './RecentActivity';
import QuickActions from './QuickActions';
import axios from '../../utils/axiosConfig';
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
    recruitment: {}
  });
  const [recentActivity, setRecentActivity] = useState([]);
  
  useEffect(() => {
    fetchDashboardData();
  }, []);
  
  const fetchDashboardData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Objet pour stocker toutes les données
      const dashboardData = {
        crm: {},
        sales: {},
        hr: {},
        payroll: {},
        accounting: {},
        recruitment: {}
      };

      // CRM Stats - Généralement l'API renvoie { contacts, companies, opportunities, pipeline }
      try {
        const crmResponse = await axios.get('/api/crm/dashboard/');
        console.log('CRM Dashboard:', crmResponse.data);
        dashboardData.crm = crmResponse.data || {};
      } catch (error) {
        console.error('Error fetching CRM dashboard:', error);
      }
      
      // Sales Stats - Structure { quotes: {count, amount}, orders: {count, amount}, invoices: {count, amount, paid, overdue} }
      try {
        // Nous devons construire cette structure car il n'y a pas d'API dashboard spécifique
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
            .filter(invoice => invoice.payment_status === 'paid')
            .reduce((acc, invoice) => acc + (parseFloat(invoice.total) || 0), 0),
          overdue: invoicesData
            .filter(invoice => invoice.payment_status === 'overdue')
            .reduce((acc, invoice) => acc + (parseFloat(invoice.total) || 0), 0)
        };
        
        const quoteStats = {
          count: quotesData.length || 0,
          amount: quotesData.reduce((acc, quote) => acc + (parseFloat(quote.total) || 0), 0)
        };
        
        const orderStats = {
          count: ordersData.length || 0,
          amount: ordersData.reduce((acc, order) => acc + (parseFloat(order.total) || 0), 0)
        };
        
        dashboardData.sales = {
          quotes: quoteStats,
          orders: orderStats,
          invoices: invoiceStats
        };
        
        console.log('Sales Dashboard:', dashboardData.sales);
      } catch (error) {
        console.error('Error fetching Sales dashboard:', error);
      }
      
      // HR Stats - Structure {general: {total_employees, ...}, ...}
      try {
        const hrResponse = await axios.get('/api/hr/dashboard/');
        console.log('HR Dashboard:', hrResponse.data);
        dashboardData.hr = hrResponse.data || {};
      } catch (error) {
        console.error('Error fetching HR dashboard:', error);
      }
      
      // Payroll Stats
      try {
        const payrollResponse = await axios.get('/api/payroll/dashboard/');
        console.log('Payroll Dashboard:', payrollResponse.data);
        dashboardData.payroll = payrollResponse.data || {};
      } catch (error) {
        console.error('Error fetching Payroll dashboard:', error);
        // Données de démo si l'API échoue
        dashboardData.payroll = {
          current_period: {
            total_gross: 0,
            total_net: 0
          }
        };
      }
      
      // Accounting Stats
      try {
        // Simuler l'API accounting/dashboard/ en collectant des données des différentes APIs
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
          active: accounts.filter(account => account.is_active).length || 0
        };
        
        const entryStats = {
          total: entries.length || 0,
          draft: entries.filter(entry => entry.state === 'draft').length || 0,
          posted: entries.filter(entry => entry.state === 'posted').length || 0,
          amount: entries
            .filter(entry => entry.state === 'posted')
            .reduce((acc, entry) => acc + (parseFloat(entry.total_debit) || 0), 0)
        };
        
        const bankStatementStats = {
          total: bankStatements.length || 0,
          reconciled: bankStatements.filter(statement => statement.state === 'confirm').length || 0,
          notReconciled: bankStatements.filter(statement => statement.state !== 'confirm').length || 0
        };
        
        const assetStats = {
          total: assets.length || 0,
          value: assets.reduce((acc, asset) => acc + (parseFloat(asset.acquisition_value) || 0), 0),
          depreciation: assets.reduce((acc, asset) => acc + (parseFloat(asset.depreciation_value) || 0), 0)
        };
        
        dashboardData.accounting = {
          accounts: accountStats,
          entries: entryStats,
          bankStatements: bankStatementStats,
          assets: assetStats
        };
        
        console.log('Accounting Dashboard:', dashboardData.accounting);
      } catch (error) {
        console.error('Error fetching Accounting dashboard:', error);
      }
      
      // Recruitment Stats
      try {
        // Nous allons simuler l'endpoint en collectant les données des différentes APIs
        const jobOpeningsResponse = await axios.get('/api/recruitment/job-openings/');
        const applicationsResponse = await axios.get('/api/recruitment/applications/');
        
        const extractResults = (response) => response?.data?.results || [];
        
        const jobOpenings = extractResults(jobOpeningsResponse);
        const applications = extractResults(applicationsResponse);
        
        const activeJobOpenings = jobOpenings.filter(job => job.status === 'published');
        
        dashboardData.recruitment = {
          job_openings_count: jobOpenings.length,
          active_job_openings_count: activeJobOpenings.length,
          applications_count: applications.length
        };
        
        console.log('Recruitment Dashboard:', dashboardData.recruitment);
      } catch (error) {
        console.error('Error fetching Recruitment dashboard:', error);
      }
      
      // Recent Activities
      try {
        const activitiesResponse = await axios.get('/api/users/activity-logs/', {
          params: { limit: 10, order: '-created_at' }
        });
        
        const recentActivity = activitiesResponse.data?.results || [];
        console.log('Recent Activities:', recentActivity);
        setRecentActivity(recentActivity);
      } catch (error) {
        console.error('Error fetching Recent Activities:', error);
        // Comme les activités récentes fonctionnent déjà, on ne fait rien ici
      }
      
      // Mettre à jour les états avec les données récupérées
      console.log('All Dashboard Data:', dashboardData);
      setStats(dashboardData);
      
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
      setError("Impossible de charger les données du tableau de bord");
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
      <Header className="dashboard-header">
        <Title level={2}>Tableau de bord Cleo ERP</Title>
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
                      recent: stats.crm?.opportunities || 0
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
                      recent: stats.sales?.quotes?.count || 0
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
                      recent: stats.hr?.missions?.upcoming?.length || 0
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
                      recent: stats.payroll?.totals?.payslips || 0
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
                      recent: stats.accounting?.entries?.total || 0
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
                      recent: stats.recruitment?.applications_count || 0
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
