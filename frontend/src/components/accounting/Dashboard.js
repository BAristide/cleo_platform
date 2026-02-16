// src/components/accounting/Dashboard.js
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Row, Col, Card, Statistic, Table, Typography, Spin, Divider, Alert, DatePicker } from 'antd';
import {
  AccountBookOutlined,
  BankOutlined,
  FileTextOutlined,
  BuildOutlined,
  DollarOutlined,
  BarChartOutlined
} from '@ant-design/icons';
import axios from '../../utils/axiosConfig';
import { extractResultsFromResponse } from '../../utils/apiUtils';
import moment from 'moment';

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;

const Dashboard = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dateRange, setDateRange] = useState([moment().startOf('month'), moment()]);
  const [stats, setStats] = useState({
    accounts: { total: 0, active: 0 },
    entries: { total: 0, draft: 0, posted: 0, amount: 0 },
    bankStatements: { total: 0, reconciled: 0, notReconciled: 0 },
    assets: { total: 0, value: 0, depreciation: 0 }
  });
  const [recentEntries, setRecentEntries] = useState([]);
  const [upcomingDepreciations, setUpcomingDepreciations] = useState([]);

  useEffect(() => {
    fetchDashboardData();
  }, [dateRange]);

  const fetchDashboardData = async () => {
    setLoading(true);
    setError(null);

    const startDate = dateRange[0].format('YYYY-MM-DD');
    const endDate = dateRange[1].format('YYYY-MM-DD');

    try {
      // Récupérer les données du tableau de bord
      const fetchAccounts = axios.get('/api/accounting/accounts/');
      const fetchEntries = axios.get('/api/accounting/journal-entries/', {
        params: { start_date: startDate, end_date: endDate }
      });
      const fetchBankStatements = axios.get('/api/accounting/bank-statements/');
      const fetchAssets = axios.get('/api/accounting/assets/');
      const fetchAssetDepreciations = axios.get('/api/accounting/asset-depreciations/', {
        params: { date_after: moment().format('YYYY-MM-DD') }
      });

      const [accountsResponse, entriesResponse, bankStatementsResponse, assetsResponse, depreciationsResponse] = 
        await Promise.all([fetchAccounts, fetchEntries, fetchBankStatements, fetchAssets, fetchAssetDepreciations]);

      const accounts = extractResultsFromResponse(accountsResponse);
      const entries = extractResultsFromResponse(entriesResponse);
      const bankStatements = extractResultsFromResponse(bankStatementsResponse);
      const assets = extractResultsFromResponse(assetsResponse);
      const depreciations = extractResultsFromResponse(depreciationsResponse);

      // Calculer les statistiques
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

      setStats({
        accounts: accountStats,
        entries: entryStats,
        bankStatements: bankStatementStats,
        assets: assetStats
      });

      // Récupérer les écritures récentes (5 dernières)
      const recentEntriesList = [...entries]
        .sort((a, b) => new Date(b.date) - new Date(a.date))
        .slice(0, 5);
      
      setRecentEntries(recentEntriesList);

      // Récupérer les prochaines dotations aux amortissements
      const upcomingDepreciationsList = [...depreciations]
        .sort((a, b) => new Date(a.date) - new Date(b.date))
        .slice(0, 5);
      
      setUpcomingDepreciations(upcomingDepreciationsList);

    } catch (error) {
      console.error('Erreur lors de la récupération des données du tableau de bord:', error);
      setError('Impossible de charger les données. Veuillez réessayer plus tard.');
    } finally {
      setLoading(false);
    }
  };

  const handleDateRangeChange = (dates) => {
    if (dates && dates.length === 2) {
      setDateRange(dates);
    }
  };

  const entriesColumns = [
    {
      title: 'Journal',
      dataIndex: 'journal_code',
      key: 'journal_code',
    },
    {
      title: 'Numéro',
      dataIndex: 'name',
      key: 'name',
      render: (text, record) => <Link to={`/accounting/entries/${record.id}`}>{text}</Link>,
    },
    {
      title: 'Date',
      dataIndex: 'date',
      key: 'date',
      render: (text) => moment(text).format('DD/MM/YYYY'),
    },
    {
      title: 'Libellé',
      dataIndex: 'narration',
      key: 'narration',
      ellipsis: true,
    },
    {
      title: 'Montant',
      dataIndex: 'total_debit',
      key: 'total_debit',
      render: (text) => `${parseFloat(text).toFixed(2)} MAD`,
    },
    {
      title: 'Statut',
      dataIndex: 'state',
      key: 'state',
      render: (state) => {
        const statusMap = {
          'draft': { text: 'Brouillon', color: 'orange' },
          'posted': { text: 'Validé', color: 'green' },
          'cancel': { text: 'Annulé', color: 'red' },
        };
        return <span style={{ color: statusMap[state]?.color }}>{statusMap[state]?.text || state}</span>;
      },
    },
  ];

  const depreciationsColumns = [
    {
      title: 'Immobilisation',
      dataIndex: 'asset_id',
      key: 'asset_id',
      render: (id, record) => <Link to={`/accounting/assets/${id}`}>{`${id}`}</Link>,
    },
    {
      title: 'Nom',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: 'Date',
      dataIndex: 'date',
      key: 'date',
      render: (text) => moment(text).format('DD/MM/YYYY'),
    },
    {
      title: 'Montant',
      dataIndex: 'amount',
      key: 'amount',
      render: (text) => `${parseFloat(text).toFixed(2)} MAD`,
    },
    {
      title: 'Statut',
      dataIndex: 'state',
      key: 'state',
      render: (state) => {
        const statusMap = {
          'draft': { text: 'À comptabiliser', color: 'orange' },
          'posted': { text: 'Comptabilisé', color: 'green' },
          'cancel': { text: 'Annulé', color: 'red' },
        };
        return <span style={{ color: statusMap[state]?.color }}>{statusMap[state]?.text || state}</span>;
      },
    },
  ];

  // Données de démonstration pour les transactions récentes
  const demoRecentEntries = [
    {
      id: 1,
      journal_code: 'VEN',
      name: 'VEN/2025/00125',
      date: '2025-05-15',
      narration: 'Facture FACT-2189 - Client ABC',
      total_debit: 12500.00,
      state: 'posted'
    },
    {
      id: 2,
      journal_code: 'ACH',
      name: 'ACH/2025/00087',
      date: '2025-05-14',
      narration: 'Facture fournisseur FRN-0045 - Fournitures',
      total_debit: 3750.00,
      state: 'posted'
    },
    {
      id: 3,
      journal_code: 'BNK',
      name: 'BNK/2025/00203',
      date: '2025-05-12',
      narration: 'Paiement client Sofitel',
      total_debit: 8900.00,
      state: 'posted'
    },
    {
      id: 4,
      journal_code: 'OD',
      name: 'OD/2025/00054',
      date: '2025-05-10',
      narration: 'Écriture de régularisation TVA',
      total_debit: 4320.00,
      state: 'draft'
    },
    {
      id: 5,
      journal_code: 'PAY',
      name: 'PAY/2025/00012',
      date: '2025-05-08',
      narration: 'Paie du mois de mai 2025',
      total_debit: 78500.00,
      state: 'posted'
    }
  ];

  // Données de démonstration pour les prochaines dépréciations
  const demoUpcomingDepreciations = [
    {
      id: 1,
      asset_id: 'A-0001',
      name: 'Dotation 5',
      date: '2025-05-31',
      amount: 1250.00,
      state: 'draft'
    },
    {
      id: 2,
      asset_id: 'A-0002',
      name: 'Dotation 3',
      date: '2025-06-15',
      amount: 875.00,
      state: 'draft'
    },
    {
      id: 3,
      asset_id: 'A-0003',
      name: 'Dotation 7',
      date: '2025-06-30',
      amount: 2100.00,
      state: 'draft'
    },
    {
      id: 4,
      asset_id: 'A-0004',
      name: 'Dotation 2',
      date: '2025-07-15',
      amount: 945.00,
      state: 'draft'
    },
    {
      id: 5,
      asset_id: 'A-0005',
      name: 'Dotation 4',
      date: '2025-07-31',
      amount: 1600.00,
      state: 'draft'
    }
  ];

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
        <Spin size="large" />
      </div>
    );
  }

  // Utiliser les données réelles si disponibles, sinon utiliser les données de démonstration
  const displayedRecentEntries = recentEntries.length > 0 ? recentEntries : demoRecentEntries;
  const displayedUpcomingDepreciations = upcomingDepreciations.length > 0 ? upcomingDepreciations : demoUpcomingDepreciations;

  return (
    <div className="accounting-dashboard">
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 24 }}>
        <Title level={2}>Tableau de bord comptable</Title>
        <RangePicker
          value={dateRange}
          onChange={handleDateRangeChange}
          format="DD/MM/YYYY"
          allowClear={false}
        />
      </div>

      {error && (
        <Alert
          message="Erreur"
          description={error}
          type="error"
          showIcon
          style={{ marginBottom: 24 }}
        />
      )}

      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={6}>
          <Card>
            <Statistic
              title="Plan comptable"
              value={stats.accounts.active}
              prefix={<AccountBookOutlined />}
              suffix={`/ ${stats.accounts.total} comptes`}
            />
            <Divider style={{ margin: '12px 0' }} />
            <Text type="secondary">Comptes actifs</Text>
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Écritures"
              value={stats.entries.posted}
              prefix={<FileTextOutlined />}
              suffix={`/ ${stats.entries.total} écritures`}
            />
            <Divider style={{ margin: '12px 0' }} />
            <Statistic
              title="Montant total"
              value={stats.entries.amount}
              precision={2}
              suffix="MAD"
              valueStyle={{ fontSize: '16px' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Relevés bancaires"
              value={stats.bankStatements.reconciled}
              prefix={<BankOutlined />}
              suffix={`/ ${stats.bankStatements.total} relevés`}
            />
            <Divider style={{ margin: '12px 0' }} />
            <Text type="secondary">
              {stats.bankStatements.notReconciled} relevés à rapprocher
            </Text>
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Immobilisations"
              value={stats.assets.total}
              prefix={<BuildOutlined />}
              suffix="immobilisations"
            />
            <Divider style={{ margin: '12px 0' }} />
            <Statistic
              title="Valeur nette comptable"
              value={stats.assets.value - stats.assets.depreciation}
              precision={2}
              suffix="MAD"
              valueStyle={{ fontSize: '16px' }}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={16}>
        <Col span={12}>
          <Card title="Écritures récentes" extra={<Link to="/accounting/entries">Voir toutes</Link>} style={{ marginBottom: 24 }}>
            <Table
              columns={entriesColumns}
              dataSource={displayedRecentEntries}
              rowKey="id"
              pagination={false}
              size="small"
            />
          </Card>
        </Col>
        <Col span={12}>
          <Card title="Prochaines dotations aux amortissements" extra={<Link to="/accounting/asset-depreciations">Voir toutes</Link>}>
            <Table
              columns={depreciationsColumns}
              dataSource={displayedUpcomingDepreciations}
              rowKey="id"
              pagination={false}
              size="small"
            />
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default Dashboard;
