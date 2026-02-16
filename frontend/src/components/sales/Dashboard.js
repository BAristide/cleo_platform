import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Row, Col, Card, Statistic, Table, Typography, Spin, Divider, Alert } from 'antd';
import { ShoppingCartOutlined, FileTextOutlined, BankOutlined, DollarOutlined } from '@ant-design/icons';
import axios from '../../utils/axiosConfig';
import moment from 'moment';

const { Title } = Typography;

const Dashboard = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState({
    quotes: { count: 0, amount: 0 },
    orders: { count: 0, amount: 0 },
    invoices: { count: 0, amount: 0, paid: 0, overdue: 0 },
  });
  const [recentInvoices, setRecentInvoices] = useState([]);
  const [recentQuotes, setRecentQuotes] = useState([]);

 
  const extractResults = (response) => {
    return response?.data?.results || [];
  };

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);

      try {
        const invoicesResponse = await axios.get('/api/sales/invoices/');
        console.log('Réponse invoices:', invoicesResponse);
        const invoicesData = extractResults(invoicesResponse);

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

        const recentInvoicesList = [...invoicesData].sort((a, b) =>
          new Date(b.date) - new Date(a.date)
        ).slice(0, 5);
        setRecentInvoices(recentInvoicesList);

        const quotesResponse = await axios.get('/api/sales/quotes/');
        console.log('Réponse quotes:', quotesResponse);
        const quotesData = extractResults(quotesResponse);

        const quoteStats = {
          count: quotesData.length || 0,
          amount: quotesData.reduce((acc, quote) => acc + (parseFloat(quote.total) || 0), 0)
        };

        const recentQuotesList = [...quotesData].sort((a, b) =>
          new Date(b.date) - new Date(a.date)
        ).slice(0, 5);
        setRecentQuotes(recentQuotesList);

        try {
          const ordersResponse = await axios.get('/api/sales/orders/');
          console.log('Réponse orders:', ordersResponse);
          const ordersData = extractResults(ordersResponse);

          const orderStats = {
            count: ordersData.length || 0,
            amount: ordersData.reduce((acc, order) => acc + (parseFloat(order.total) || 0), 0)
          };

          setStats({
            quotes: quoteStats,
            orders: orderStats,
            invoices: invoiceStats,
          });

        } catch (orderError) {
          console.error('Erreur lors de la récupération des commandes:', orderError);
          setStats({
            quotes: quoteStats,
            orders: { count: 0, amount: 0 },
            invoices: invoiceStats,
          });
        }

      } catch (error) {
        console.error('Erreur lors de la récupération des données:', error);
        setError('Impossible de charger les données. Veuillez réessayer plus tard.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const invoiceColumns = [
    {
      title: 'Numéro',
      dataIndex: 'number',
      key: 'number',
      render: (text, record) => <Link to={`/sales/invoices/${record.id}`}>{text}</Link>,
    },
    {
      title: 'Client',
      dataIndex: 'company_name',
      key: 'company_name',
    },
    {
      title: 'Montant',
      dataIndex: 'total',
      key: 'total',
      render: (text, record) => `${text} ${record.currency_code || 'MAD'}`,
    },
    {
      title: 'Date d\'émission',
      dataIndex: 'date',
      key: 'date',
      render: (text) => text ? moment(text).format('DD/MM/YYYY') : '',
    },
    {
      title: 'Statut',
      dataIndex: 'payment_status',
      key: 'payment_status',
      render: (status) => {
        const statusMap = {
          'paid': { text: 'Payée', color: 'green' },
          'partial': { text: 'Partiellement payée', color: 'orange' },
          'unpaid': { text: 'Non payée', color: 'red' },
          'overdue': { text: 'En retard', color: 'red' },
          'cancelled': { text: 'Annulée', color: 'gray' },
        };
        return <span style={{ color: statusMap[status]?.color }}>{statusMap[status]?.text || status}</span>;
      },
    },
  ];

  const quoteColumns = [
    {
      title: 'Numéro',
      dataIndex: 'number',
      key: 'number',
      render: (text, record) => <Link to={`/sales/quotes/${record.id}`}>{text}</Link>,
    },
    {
      title: 'Client',
      dataIndex: 'company_name',
      key: 'company_name',
    },
    {
      title: 'Montant',
      dataIndex: 'total',
      key: 'total',
      render: (text, record) => `${text} ${record.currency_code || 'MAD'}`,
    },
    {
      title: 'Date d\'émission',
      dataIndex: 'date',
      key: 'date',
      render: (text) => text ? moment(text).format('DD/MM/YYYY') : '',
    },
    {
      title: 'Statut',
      dataIndex: 'status',
      key: 'status',
      render: (status) => {
        const statusMap = {
          'draft': { text: 'Brouillon', color: 'gray' },
          'sent': { text: 'Envoyé', color: 'blue' },
          'accepted': { text: 'Accepté', color: 'green' },
          'rejected': { text: 'Refusé', color: 'red' },
          'cancelled': { text: 'Annulé', color: 'gray' },
          'expired': { text: 'Expiré', color: 'orange' },
        };
        return <span style={{ color: statusMap[status]?.color }}>{statusMap[status]?.text || status}</span>;
      },
    },
  ];

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
        <Spin size="large" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="sales-dashboard">
        <Title level={2}>Tableau de bord des ventes</Title>
        <Alert 
          message="Erreur" 
          description={error} 
          type="error" 
          showIcon 
          style={{ marginBottom: 24 }}
        />
      </div>
    );
  }

  return (
    <div className="sales-dashboard">
      <Title level={2}>Tableau de bord des ventes</Title>

      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={6}>
          <Card>
            <Statistic
              title="Devis"
              value={stats.quotes.count}
              prefix={<FileTextOutlined />}
              suffix="devis"
            />
            <Divider style={{ margin: '12px 0' }} />
            <Statistic
              title="Montant"
              value={stats.quotes.amount}
              precision={2}
              suffix="MAD"
              valueStyle={{ fontSize: '16px' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Commandes"
              value={stats.orders.count}
              prefix={<ShoppingCartOutlined />}
              suffix="commandes"
            />
            <Divider style={{ margin: '12px 0' }} />
            <Statistic
              title="Montant"
              value={stats.orders.amount}
              precision={2}
              suffix="MAD"
              valueStyle={{ fontSize: '16px' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Factures"
              value={stats.invoices.count}
              prefix={<BankOutlined />}
              suffix="factures"
            />
            <Divider style={{ margin: '12px 0' }} />
            <Statistic
              title="Montant"
              value={stats.invoices.amount}
              precision={2}
              suffix="MAD"
              valueStyle={{ fontSize: '16px' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Paiements reçus"
              value={stats.invoices.paid}
              prefix={<DollarOutlined />}
              precision={2}
              suffix="MAD"
              valueStyle={{ color: '#3f8600' }}
            />
            <Divider style={{ margin: '12px 0' }} />
            <Statistic
              title="Montant en retard"
              value={stats.invoices.overdue}
              precision={2}
              suffix="MAD"
              valueStyle={{ color: '#cf1322', fontSize: '16px' }}
            />
          </Card>
        </Col>
      </Row>

      <Card title="Factures récentes" extra={<Link to="/sales/invoices">Voir toutes</Link>} style={{ marginBottom: 24 }}>
        {recentInvoices.length > 0 ? (
          <Table
            columns={invoiceColumns}
            dataSource={recentInvoices}
            rowKey="id"
            pagination={false}
          />
        ) : (
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <p>Aucune facture récente trouvée.</p>
          </div>
        )}
      </Card>

      <Card title="Devis récents" extra={<Link to="/sales/quotes">Voir tous</Link>}>
        {recentQuotes.length > 0 ? (
          <Table
            columns={quoteColumns}
            dataSource={recentQuotes}
            rowKey="id"
            pagination={false}
          />
        ) : (
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <p>Aucun devis récent trouvé.</p>
          </div>
        )}
      </Card>
    </div>
  );
};

export default Dashboard;
