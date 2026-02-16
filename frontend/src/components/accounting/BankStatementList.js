// src/components/accounting/BankStatementList.js
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Table, 
  Card, 
  Button, 
  Tag, 
  Typography, 
  Space, 
  Spin, 
  Alert,
  Select,
  DatePicker,
  Progress
} from 'antd';
import { 
  PlusOutlined, 
  BankOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ExclamationCircleOutlined
} from '@ant-design/icons';
import axios from '../../utils/axiosConfig';
import { extractResultsFromResponse } from '../../utils/apiUtils';
import moment from 'moment';

const { Title } = Typography;
const { Option } = Select;
const { RangePicker } = DatePicker;

const BankStatementList = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [statements, setStatements] = useState([]);
  const [filteredStatements, setFilteredStatements] = useState([]);
  const [journals, setJournals] = useState([]);
  const [journalFilter, setJournalFilter] = useState('all');
  const [stateFilter, setStateFilter] = useState('all');
  const [dateRange, setDateRange] = useState([
    moment().startOf('year'),
    moment()
  ]);

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    filterStatements();
  }, [statements, journalFilter, stateFilter, dateRange]);

  const fetchData = async () => {
    setLoading(true);
    setError(null);

    try {
      // Fetch bank statements and journals
      const [statementsResponse, journalsResponse] = await Promise.all([
        axios.get('/api/accounting/bank-statements/'),
        axios.get('/api/accounting/journals/', { params: { type: 'bank' } })
      ]);

      const statementsData = extractResultsFromResponse(statementsResponse);
      const journalsData = extractResultsFromResponse(journalsResponse);

      setStatements(statementsData.length > 0 ? statementsData : demoStatements);
      setJournals(journalsData.length > 0 ? journalsData : demoBankJournals);
    } catch (error) {
      console.error('Erreur lors de la récupération des données:', error);
      setError('Impossible de charger les données. Veuillez réessayer plus tard.');
      
      setStatements(demoStatements);
      setJournals(demoBankJournals);
    } finally {
      setLoading(false);
    }
  };

  const filterStatements = () => {
    let filtered = [...statements];

    // Filter by journal
    if (journalFilter !== 'all') {
      filtered = filtered.filter(statement => statement.journal_id.toString() === journalFilter);
    }
    
    // Filter by state
    if (stateFilter !== 'all') {
      filtered = filtered.filter(statement => statement.state === stateFilter);
    }
    
    // Filter by date range
    if (dateRange && dateRange.length === 2) {
      const startDate = dateRange[0].startOf('day');
      const endDate = dateRange[1].endOf('day');
      
      filtered = filtered.filter(statement => {
        const statementDate = moment(statement.date);
        return statementDate.isBetween(startDate, endDate, null, '[]');
      });
    }
    
    // Sort by date (descending) and then by name
    filtered.sort((a, b) => {
      const dateComparison = moment(b.date).unix() - moment(a.date).unix();
      if (dateComparison !== 0) return dateComparison;
      return a.name.localeCompare(b.name);
    });

    setFilteredStatements(filtered);
  };

  const handleFilter = () => {
    filterStatements();
  };

  const getStateTag = (state) => {
    const stateMap = {
      'draft': { text: 'Brouillon', color: 'orange', icon: <ExclamationCircleOutlined /> },
      'open': { text: 'En cours', color: 'blue', icon: <ExclamationCircleOutlined /> },
      'confirm': { text: 'Confirmé', color: 'green', icon: <CheckCircleOutlined /> }
    };
    
    return (
      <Tag color={stateMap[state]?.color} icon={stateMap[state]?.icon}>
        {stateMap[state]?.text || state}
      </Tag>
    );
  };

  const calculateReconciliationPercent = (statement) => {
    if (!statement.lines || statement.lines.length === 0) return 0;
    
    const reconciled = statement.lines.filter(line => line.is_reconciled).length;
    return Math.round((reconciled / statement.lines.length) * 100);
  };

  const columns = [
    {
      title: 'Date',
      dataIndex: 'date',
      key: 'date',
      render: (text) => moment(text).format('DD/MM/YYYY'),
      sorter: (a, b) => moment(a.date).unix() - moment(b.date).unix(),
    },
    {
      title: 'Journal',
      key: 'journal',
      render: (_, record) => (
        <Link to={`/accounting/journals/${record.journal_id}`}>
          {record.journal_code} - {record.journal_name}
        </Link>
      ),
      filters: journals.map(journal => ({ text: `${journal.code} - ${journal.name}`, value: journal.id })),
      onFilter: (value, record) => record.journal_id === value,
    },
    {
      title: 'Nom',
      dataIndex: 'name',
      key: 'name',
      render: (text, record) => (
        <Link to={`/accounting/bank-statements/${record.id}`}>
          {text}
        </Link>
      ),
    },
    {
      title: 'Référence',
      dataIndex: 'reference',
      key: 'reference',
      render: (text) => text || '-',
    },
    {
      title: 'Solde initial',
      dataIndex: 'balance_start',
      key: 'balance_start',
      align: 'right',
      render: (text) => `${parseFloat(text).toFixed(2)} MAD`,
    },
    {
      title: 'Solde final',
      dataIndex: 'balance_end',
      key: 'balance_end',
      align: 'right',
      render: (text) => `${parseFloat(text).toFixed(2)} MAD`,
    },
    {
      title: 'Rapprochement',
      key: 'reconciliation',
      render: (_, record) => {
        const percent = calculateReconciliationPercent(record);
        return (
          <Progress 
            percent={percent} 
            size="small" 
            status={percent === 100 ? 'success' : 'active'}
          />
        );
      },
    },
    {
      title: 'Statut',
      dataIndex: 'state',
      key: 'state',
      render: (state) => getStateTag(state),
      filters: [
        { text: 'Brouillon', value: 'draft' },
        { text: 'En cours', value: 'open' },
        { text: 'Confirmé', value: 'confirm' }
      ],
      onFilter: (value, record) => record.state === value,
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Space size="small">
          <Link to={`/accounting/bank-statements/${record.id}`}>
            <Button type="link" size="small">
              Voir
            </Button>
          </Link>
          {record.state !== 'confirm' && (
            <Link to={`/accounting/bank-statements/${record.id}/edit`}>
              <Button type="link" size="small">
                Modifier
              </Button>
            </Link>
          )}
        </Space>
      ),
    },
  ];

  // Demo data
  const demoBankJournals = [
    {
      id: 3,
      code: 'BNK',
      name: 'Journal de banque'
    },
    {
      id: 4,
      code: 'CSH',
      name: 'Journal de caisse'
    }
  ];

  const demoStatements = [
    {
      id: 1,
      journal_id: 3,
      journal_code: 'BNK',
      journal_name: 'Journal de banque',
      name: 'Relevé Mai 2025',
      date: '2025-05-31',
      reference: 'REL-052025',
      balance_start: 350000,
      balance_end: 375400,
      balance_end_real: 375400,
      state: 'open',
      lines: [
        { id: 101, is_reconciled: true },
        { id: 102, is_reconciled: true },
        { id: 103, is_reconciled: false },
        { id: 104, is_reconciled: false }
      ]
    },
    {
      id: 2,
      journal_id: 3,
      journal_code: 'BNK',
      journal_name: 'Journal de banque',
      name: 'Relevé Avril 2025',
      date: '2025-04-30',
      reference: 'REL-042025',
      balance_start: 320000,
      balance_end: 350000,
      balance_end_real: 350000,
      state: 'confirm',
      lines: [
        { id: 201, is_reconciled: true },
        { id: 202, is_reconciled: true },
        { id: 203, is_reconciled: true },
        { id: 204, is_reconciled: true }
      ]
    },
    {
      id: 3,
      journal_id: 4,
      journal_code: 'CSH',
      journal_name: 'Journal de caisse',
      name: 'Caisse Mai 2025',
      date: '2025-05-31',
      reference: 'CSH-052025',
      balance_start: 15000,
      balance_end: 12500,
      balance_end_real: 12500,
      state: 'open',
      lines: [
        { id: 301, is_reconciled: true },
        { id: 302, is_reconciled: false }
      ]
    },
    {
      id: 4,
      journal_id: 4,
      journal_code: 'CSH',
      journal_name: 'Journal de caisse',
      name: 'Caisse Avril 2025',
      date: '2025-04-30',
      reference: 'CSH-042025',
      balance_start: 10000,
      balance_end: 15000,
      balance_end_real: 15000,
      state: 'confirm',
      lines: [
        { id: 401, is_reconciled: true },
        { id: 402, is_reconciled: true },
        { id: 403, is_reconciled: true }
      ]
    }
  ];

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div className="bank-statements-list">
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 24 }}>
        <Title level={2}>Relevés bancaires</Title>
        <Link to="/accounting/bank-statements/new">
          <Button type="primary" icon={<PlusOutlined />}>
            Nouveau relevé
          </Button>
        </Link>
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

      <Card style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', marginBottom: 16 }}>
          <Space size="large">
            <div>
              <span style={{ marginRight: 8 }}>Journal:</span>
              <Select
                style={{ width: 200 }}
                value={journalFilter}
                onChange={value => setJournalFilter(value)}
              >
                <Option value="all">Tous les journaux</Option>
                {journals.map(journal => (
                  <Option key={journal.id} value={journal.id.toString()}>
                    {journal.code} - {journal.name}
                  </Option>
                ))}
              </Select>
            </div>
            <div>
              <span style={{ marginRight: 8 }}>Statut:</span>
              <Select
                style={{ width: 150 }}
                value={stateFilter}
                onChange={value => setStateFilter(value)}
              >
                <Option value="all">Tous</Option>
                <Option value="draft">Brouillon</Option>
                <Option value="open">En cours</Option>
                <Option value="confirm">Confirmé</Option>
              </Select>
            </div>
            <div>
              <span style={{ marginRight: 8 }}>Période:</span>
              <RangePicker
                value={dateRange}
                onChange={dates => setDateRange(dates)}
                format="DD/MM/YYYY"
              />
            </div>
            <Button type="primary" onClick={handleFilter}>
              Filtrer
            </Button>
          </Space>
        </div>
      </Card>

      <Card>
        <Table
          columns={columns}
          dataSource={filteredStatements.length > 0 ? filteredStatements : demoStatements}
          rowKey="id"
          pagination={{ pageSize: 10 }}
        />
      </Card>
    </div>
  );
};

export default BankStatementList;
