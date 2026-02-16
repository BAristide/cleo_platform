// src/components/accounting/JournalDetail.js
import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  Card,
  Descriptions,
  Button,
  Table,
  Tag,
  Typography,
  Space,
  Spin,
  Alert,
  Tabs,
  Statistic,
  Row,
  Col,
  DatePicker,
  Popconfirm
} from 'antd';
import {
  EditOutlined,
  DeleteOutlined,
  AccountBookOutlined,
  BankOutlined,
  ShoppingOutlined,
  DollarOutlined,
  FileTextOutlined
} from '@ant-design/icons';
import axios from '../../utils/axiosConfig';
import { extractResultsFromResponse } from '../../utils/apiUtils';
import moment from 'moment';

const { Title, Text } = Typography;
const { TabPane } = Tabs;
const { RangePicker } = DatePicker;

const JournalDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [journal, setJournal] = useState(null);
  const [entries, setEntries] = useState([]);
  const [dateRange, setDateRange] = useState([
    moment().startOf('month'),
    moment()
  ]);
  const [stats, setStats] = useState({
    entriesCount: 0,
    totalDebit: 0,
    totalCredit: 0
  });

  useEffect(() => {
    fetchJournalDetails();
  }, [id]);

  useEffect(() => {
    if (journal) {
      fetchJournalEntries();
    }
  }, [journal, dateRange]);

  const fetchJournalDetails = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await axios.get(`/api/accounting/journals/${id}/`);
      setJournal(response.data);
    } catch (error) {
      console.error('Erreur lors de la récupération des détails du journal:', error);
      setError('Impossible de charger les détails du journal. Veuillez réessayer plus tard.');
      
      // If API fails, use demo data
      if (demoJournals[id - 1]) {
        setJournal(demoJournals[id - 1]);
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchJournalEntries = async () => {
    try {
      const startDate = dateRange[0].format('YYYY-MM-DD');
      const endDate = dateRange[1].format('YYYY-MM-DD');

      const response = await axios.get('/api/accounting/journal-entries/', {
        params: {
          journal_id: id,
          start_date: startDate,
          end_date: endDate
        }
      });

      const entriesData = extractResultsFromResponse(response);
      setEntries(entriesData);

      // Calculate statistics
      if (entriesData.length > 0) {
        const totalDebit = entriesData.reduce((sum, entry) => sum + parseFloat(entry.total_debit || 0), 0);
        const totalCredit = entriesData.reduce((sum, entry) => sum + parseFloat(entry.total_credit || 0), 0);

        setStats({
          entriesCount: entriesData.length,
          totalDebit,
          totalCredit
        });
      } else {
        setStats({
          entriesCount: 0,
          totalDebit: 0,
          totalCredit: 0
        });
      }
    } catch (error) {
      console.error('Erreur lors de la récupération des écritures du journal:', error);
      // Fallback to demo entries
      const demoFilteredEntries = demoEntries.filter(entry => entry.journal_id === parseInt(id));
      setEntries(demoFilteredEntries);

      if (demoFilteredEntries.length > 0) {
        const totalDebit = demoFilteredEntries.reduce((sum, entry) => sum + parseFloat(entry.total_debit || 0), 0);
        const totalCredit = demoFilteredEntries.reduce((sum, entry) => sum + parseFloat(entry.total_credit || 0), 0);

        setStats({
          entriesCount: demoFilteredEntries.length,
          totalDebit,
          totalCredit
        });
      }
    }
  };

  const handleDateRangeChange = (dates) => {
    if (dates && dates.length === 2) {
      setDateRange(dates);
    }
  };

  const handleDeleteJournal = async () => {
    try {
      await axios.delete(`/api/accounting/journals/${id}/`);
      navigate('/accounting/journals');
    } catch (error) {
      console.error('Erreur lors de la suppression du journal:', error);
      alert('Erreur lors de la suppression du journal. Veuillez réessayer.');
    }
  };

  // Get journal icon based on type
  const getJournalIcon = (type) => {
    switch (type) {
      case 'sale':
        return <DollarOutlined style={{ fontSize: '24px', color: '#52c41a' }} />;
      case 'purchase':
        return <ShoppingOutlined style={{ fontSize: '24px', color: '#1890ff' }} />;
      case 'cash':
        return <DollarOutlined style={{ fontSize: '24px', color: '#faad14' }} />;
      case 'bank':
        return <BankOutlined style={{ fontSize: '24px', color: '#722ed1' }} />;
      case 'general':
        return <FileTextOutlined style={{ fontSize: '24px', color: '#fa541c' }} />;
      case 'situation':
        return <AccountBookOutlined style={{ fontSize: '24px', color: '#13c2c2' }} />;
      default:
        return <AccountBookOutlined style={{ fontSize: '24px' }} />;
    }
  };

  // Get journal type display name
  const getJournalTypeDisplay = (type) => {
    const typeMap = {
      'sale': 'Ventes',
      'purchase': 'Achats',
      'cash': 'Caisse',
      'bank': 'Banque',
      'general': 'Opérations diverses',
      'situation': 'Situation'
    };
    return typeMap[type] || type;
  };

  // Demo data
  const demoJournals = [
    {
      id: 1,
      code: 'VEN',
      name: 'Journal des ventes',
      type: 'sale',
      default_debit_account_id: 4,
      default_debit_account_code: '411000',
      default_debit_account_name: 'Clients',
      default_credit_account_id: 9,
      default_credit_account_code: '701000',
      default_credit_account_name: 'Ventes de produits finis',
      sequence_id: 'VEN/YYYY/####',
      active: true
    },
    {
      id: 2,
      code: 'ACH',
      name: 'Journal des achats',
      type: 'purchase',
      default_debit_account_id: 8,
      default_debit_account_code: '601000',
      default_debit_account_name: 'Achats de matières premières',
      default_credit_account_id: 7,
      default_credit_account_code: '401000',
      default_credit_account_name: 'Fournisseurs',
      sequence_id: 'ACH/YYYY/####',
      active: true
    },
    {
      id: 3,
      code: 'BNK',
      name: 'Journal de banque',
      type: 'bank',
      default_debit_account_id: 6,
      default_debit_account_code: '512000',
      default_debit_account_name: 'Banque',
      default_credit_account_id: null,
      default_credit_account_code: null,
      default_credit_account_name: null,
      sequence_id: 'BNK/YYYY/####',
      active: true
    },
    {
      id: 5,
      code: 'OD',
      name: 'Opérations diverses',
      type: 'general',
      default_debit_account_id: null,
      default_debit_account_code: null,
      default_debit_account_name: null,
      default_credit_account_id: null,
      default_credit_account_code: null,
      default_credit_account_name: null,
      sequence_id: 'OD/YYYY/####',
      active: true
    }
  ];

  const demoEntries = [
    {
      id: 1,
      name: 'VEN/2025/00125',
      journal_id: 1,
      journal_code: 'VEN',
      journal_name: 'Journal des ventes',
      date: '2025-05-15',
      ref: 'FACT-2189',
      narration: 'Facture FACT-2189 - Client ABC',
      state: 'posted',
      total_debit: 12500,
      total_credit: 12500,
      is_balanced: true
    },
    {
      id: 2,
      name: 'ACH/2025/00087',
      journal_id: 2,
      journal_code: 'ACH',
      journal_name: 'Journal des achats',
      date: '2025-05-14',
      ref: 'FRN-0045',
      narration: 'Facture fournisseur FRN-0045 - Fournitures',
      state: 'posted',
      total_debit: 3750,
      total_credit: 3750,
      is_balanced: true
    },
    {
      id: 3,
      name: 'BNK/2025/00203',
      journal_id: 3,
      journal_code: 'BNK',
      journal_name: 'Journal de banque',
      date: '2025-05-12',
      ref: 'PAY-2189',
      narration: 'Paiement client Sofitel',
      state: 'posted',
      total_debit: 8900,
      total_credit: 8900,
      is_balanced: true
    },
    {
      id: 4,
      name: 'OD/2025/00054',
      journal_id: 5,
      journal_code: 'OD',
      journal_name: 'Opérations diverses',
      date: '2025-05-10',
      ref: 'REG-TVA',
      narration: 'Écriture de régularisation TVA',
      state: 'draft',
      total_debit: 4320,
      total_credit: 4320,
      is_balanced: true
    }
  ];

  const entriesColumns = [
    {
      title: 'Date',
      dataIndex: 'date',
      key: 'date',
      render: (text) => moment(text).format('DD/MM/YYYY'),
      sorter: (a, b) => moment(a.date).unix() - moment(b.date).unix(),
    },
    {
      title: 'Numéro',
      dataIndex: 'name',
      key: 'name',
      render: (text, record) => (
        <Link to={`/accounting/entries/${record.id}`}>{text}</Link>
      ),
    },
    {
      title: 'Référence',
      dataIndex: 'ref',
      key: 'ref',
      render: (text) => text || '-',
    },
    {
      title: 'Libellé',
      dataIndex: 'narration',
      key: 'narration',
      ellipsis: true,
    },
    {
      title: 'Débit',
      dataIndex: 'total_debit',
      key: 'total_debit',
      align: 'right',
      render: (text) => parseFloat(text).toFixed(2),
    },
    {
      title: 'Crédit',
      dataIndex: 'total_credit',
      key: 'total_credit',
      align: 'right',
      render: (text) => parseFloat(text).toFixed(2),
    },
    {
      title: 'Statut',
      dataIndex: 'state',
      key: 'state',
      render: (state) => {
        const stateMap = {
          'draft': { text: 'Brouillon', color: 'orange' },
          'posted': { text: 'Validé', color: 'green' },
          'cancel': { text: 'Annulé', color: 'red' }
        };
        
        return (
          <Tag color={stateMap[state]?.color}>
            {stateMap[state]?.text || state}
          </Tag>
        );
      },
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Link to={`/accounting/entries/${record.id}`}>
          <Button type="link" size="small">Voir</Button>
        </Link>
      ),
    },
  ];

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
        <Spin size="large" />
      </div>
    );
  }

  if (error && !journal) {
    return (
      <Alert
        message="Erreur"
        description={error}
        type="error"
        showIcon
        action={
          <Button size="small" onClick={() => navigate('/accounting/journals')}>
            Retour à la liste
          </Button>
        }
      />
    );
  }

  const displayedJournal = journal || demoJournals[0];
  const displayedEntries = entries.length > 0 ? entries : demoEntries.filter(entry => entry.journal_id === parseInt(id));

  return (
    <div className="journal-detail">
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 24 }}>
        <Space size="large" align="start">
          {getJournalIcon(displayedJournal.type)}
          <div>
            <Title level={2}>
              {displayedJournal.code} - {displayedJournal.name}
            </Title>
            <Tag color="blue">{getJournalTypeDisplay(displayedJournal.type)}</Tag>
            {!displayedJournal.active && <Tag color="red">Inactif</Tag>}
          </div>
        </Space>
        <Space>
          <Button icon={<EditOutlined />}>Modifier</Button>
          <Popconfirm
            title="Êtes-vous sûr de vouloir supprimer ce journal?"
            onConfirm={handleDeleteJournal}
            okText="Oui"
            cancelText="Non"
            disabled={displayedEntries.length > 0}
          >
            <Button icon={<DeleteOutlined />} danger disabled={displayedEntries.length > 0}>
              Supprimer
            </Button>
          </Popconfirm>
          <Button onClick={() => navigate('/accounting/journals')}>
            Retour à la liste
          </Button>
        </Space>
      </div>

      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={8}>
          <Card>
            <Statistic
              title="Nombre d'écritures"
              value={stats.entriesCount}
              prefix={<AccountBookOutlined />}
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card>
            <Statistic
              title="Total débit"
              value={stats.totalDebit}
              precision={2}
              suffix="MAD"
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card>
            <Statistic
              title="Total crédit"
              value={stats.totalCredit}
              precision={2}
              suffix="MAD"
            />
          </Card>
        </Col>
      </Row>

      <Card style={{ marginBottom: 24 }}>
        <Descriptions title="Informations du journal" bordered>
          <Descriptions.Item label="Code">{displayedJournal.code}</Descriptions.Item>
          <Descriptions.Item label="Nom">{displayedJournal.name}</Descriptions.Item>
          <Descriptions.Item label="Type">{getJournalTypeDisplay(displayedJournal.type)}</Descriptions.Item>
          <Descriptions.Item label="Format de séquence">{displayedJournal.sequence_id}</Descriptions.Item>
          <Descriptions.Item label="Statut">{displayedJournal.active ? 'Actif' : 'Inactif'}</Descriptions.Item>
        </Descriptions>
      </Card>

      <Card style={{ marginBottom: 24 }}>
        <Descriptions title="Comptes par défaut" bordered>
          <Descriptions.Item label="Compte de débit">
            {displayedJournal.default_debit_account_id ? (
              <Link to={`/accounting/accounts/${displayedJournal.default_debit_account_id}`}>
                {displayedJournal.default_debit_account_code} - {displayedJournal.default_debit_account_name}
              </Link>
            ) : 'Non défini'}
          </Descriptions.Item>
          <Descriptions.Item label="Compte de crédit">
            {displayedJournal.default_credit_account_id ? (
              <Link to={`/accounting/accounts/${displayedJournal.default_credit_account_id}`}>
                {displayedJournal.default_credit_account_code} - {displayedJournal.default_credit_account_name}
              </Link>
            ) : 'Non défini'}
          </Descriptions.Item>
        </Descriptions>
      </Card>

      <Card title="Écritures comptables">
        <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
          <Space>
            <Text>Période :</Text>
            <RangePicker
              value={dateRange}
              onChange={handleDateRangeChange}
              format="DD/MM/YYYY"
            />
          </Space>
          <Link to={`/accounting/entries/new?journal=${id}`}>
            <Button type="primary">Nouvelle écriture</Button>
          </Link>
        </div>

        <Table
          columns={entriesColumns}
          dataSource={displayedEntries}
          rowKey="id"
          pagination={{ pageSize: 10 }}
          size="middle"
          summary={pageData => {
            let totalDebit = 0;
            let totalCredit = 0;
            
            pageData.forEach(({ total_debit, total_credit }) => {
              totalDebit += parseFloat(total_debit || 0);
              totalCredit += parseFloat(total_credit || 0);
            });
            
            return (
              <Table.Summary.Row>
                <Table.Summary.Cell index={0} colSpan={4}><strong>Total</strong></Table.Summary.Cell>
                <Table.Summary.Cell index={4} align="right">
                  <strong>{totalDebit.toFixed(2)}</strong>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={5} align="right">
                  <strong>{totalCredit.toFixed(2)}</strong>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={6} colSpan={2}></Table.Summary.Cell>
              </Table.Summary.Row>
            );
          }}
        />
      </Card>
    </div>
  );
};

export default JournalDetail;
