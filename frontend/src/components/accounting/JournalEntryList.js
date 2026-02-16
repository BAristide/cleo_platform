// src/components/accounting/JournalEntryList.js
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Table, 
  Card, 
  Input, 
  Button, 
  Tag, 
  Typography, 
  Space, 
  Select, 
  DatePicker, 
  Spin, 
  Alert, 
  Popover,
  Modal,
  Badge
} from 'antd';
import { 
  SearchOutlined, 
  PlusOutlined, 
  FilterOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ExclamationCircleOutlined,
  EyeOutlined
} from '@ant-design/icons';
import axios from '../../utils/axiosConfig';
import { extractResultsFromResponse } from '../../utils/apiUtils';
import moment from 'moment';

const { Title } = Typography;
const { Option } = Select;
const { RangePicker } = DatePicker;

const JournalEntryList = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [journalEntries, setJournalEntries] = useState([]);
  const [filteredEntries, setFilteredEntries] = useState([]);
  const [journals, setJournals] = useState([]);
  const [search, setSearch] = useState('');
  const [journalFilter, setJournalFilter] = useState('all');
  const [stateFilter, setStateFilter] = useState('all');
  const [dateRange, setDateRange] = useState([
    moment().startOf('month'),
    moment()
  ]);
  const [filterVisible, setFilterVisible] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    filterEntries();
  }, [journalEntries, search, journalFilter, stateFilter, dateRange]);

  const fetchData = async () => {
    setLoading(true);
    setError(null);

    try {
      // Fetch journals and journal entries
      const [journalsResponse, entriesResponse] = await Promise.all([
        axios.get('/api/accounting/journals/'),
        axios.get('/api/accounting/journal-entries/')
      ]);

      const journalsData = extractResultsFromResponse(journalsResponse);
      const entriesData = extractResultsFromResponse(entriesResponse);

      setJournals(journalsData);
      setJournalEntries(entriesData);
    } catch (error) {
      console.error('Erreur lors de la récupération des données:', error);
      setError('Impossible de charger les données. Veuillez réessayer plus tard.');
      
      // Fallback to demo data
      setJournals(demoJournals);
      setJournalEntries(demoEntries);
    } finally {
      setLoading(false);
    }
  };

  const filterEntries = () => {
    let filtered = [...journalEntries];

    // Filter by search text
    if (search) {
      const searchLower = search.toLowerCase();
      filtered = filtered.filter(entry => 
        (entry.name && entry.name.toLowerCase().includes(searchLower)) || 
        (entry.narration && entry.narration.toLowerCase().includes(searchLower)) ||
        (entry.ref && entry.ref.toLowerCase().includes(searchLower))
      );
    }

    // Filter by journal
    if (journalFilter !== 'all') {
      filtered = filtered.filter(entry => entry.journal_id === parseInt(journalFilter));
    }

    // Filter by state
    if (stateFilter !== 'all') {
      filtered = filtered.filter(entry => entry.state === stateFilter);
    }

    // Filter by date range
    if (dateRange && dateRange.length === 2) {
      const startDate = dateRange[0].startOf('day');
      const endDate = dateRange[1].endOf('day');
      
      filtered = filtered.filter(entry => {
        const entryDate = moment(entry.date);
        return entryDate.isBetween(startDate, endDate, null, '[]');
      });
    }

    // Sort by date (descending) and then by name
    filtered.sort((a, b) => {
      const dateComparison = moment(b.date).unix() - moment(a.date).unix();
      if (dateComparison !== 0) return dateComparison;
      return a.name.localeCompare(b.name);
    });

    setFilteredEntries(filtered);
  };

  const handleReset = () => {
    setSearch('');
    setJournalFilter('all');
    setStateFilter('all');
    setDateRange([moment().startOf('month'), moment()]);
    setFilterVisible(false);
  };

  const showDeleteConfirm = (entryId) => {
    Modal.confirm({
      title: 'Êtes-vous sûr de vouloir supprimer cette écriture?',
      icon: <ExclamationCircleOutlined />,
      content: 'Cette action est irréversible.',
      okText: 'Oui',
      okType: 'danger',
      cancelText: 'Non',
      onOk() {
        console.log('OK');
        // Delete logic here
      },
    });
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
      dataIndex: 'journal_code',
      key: 'journal_code',
      render: (text, record) => (
        <Link to={`/accounting/journals/${record.journal_id}`}>{text}</Link>
      ),
      filters: journals.map(journal => ({ text: `${journal.code} - ${journal.name}`, value: journal.code })),
      onFilter: (value, record) => record.journal_code === value,
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
      title: 'Montant',
      dataIndex: 'total_debit',
      key: 'total_debit',
      align: 'right',
      render: (text) => `${parseFloat(text).toFixed(2)} MAD`,
      sorter: (a, b) => a.total_debit - b.total_debit,
    },
    {
      title: 'Statut',
      dataIndex: 'state',
      key: 'state',
      render: (state) => {
        const stateMap = {
          'draft': { text: 'Brouillon', color: 'orange', icon: <ExclamationCircleOutlined /> },
          'posted': { text: 'Validé', color: 'green', icon: <CheckCircleOutlined /> },
          'cancel': { text: 'Annulé', color: 'red', icon: <CloseCircleOutlined /> }
        };
        return (
          <Tag color={stateMap[state]?.color} icon={stateMap[state]?.icon}>
            {stateMap[state]?.text || state}
          </Tag>
        );
      },
      filters: [
        { text: 'Brouillon', value: 'draft' },
        { text: 'Validé', value: 'posted' },
        { text: 'Annulé', value: 'cancel' }
      ],
      onFilter: (value, record) => record.state === value,
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Space size="small">
          <Link to={`/accounting/entries/${record.id}`}>
            <Button type="text" size="small" icon={<EyeOutlined />} />
          </Link>
          
          {record.state === 'draft' && (
            <>
              <Link to={`/accounting/entries/${record.id}/edit`}>
                <Button type="text" size="small" icon={<EditOutlined />} />
              </Link>
              <Button 
                type="text" 
                size="small" 
                danger 
                icon={<DeleteOutlined />} 
                onClick={() => showDeleteConfirm(record.id)}
              />
            </>
          )}
        </Space>
      ),
    },
  ];

  // Demo data for journals
  const demoJournals = [
    {
      id: 1,
      code: 'VEN',
      name: 'Journal des ventes'
    },
    {
      id: 2,
      code: 'ACH',
      name: 'Journal des achats'
    },
    {
      id: 3,
      code: 'BNK',
      name: 'Journal de banque'
    },
    {
      id: 4,
      code: 'CSH',
      name: 'Journal de caisse'
    },
    {
      id: 5,
      code: 'OD',
      name: 'Opérations diverses'
    }
  ];

  // Demo data for journal entries
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
      is_balanced: true,
      is_manual: false
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
      is_balanced: true,
      is_manual: false
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
      is_balanced: true,
      is_manual: false
    },
    {
      id: this,
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
      is_balanced: true,
      is_manual: true
    },
    {
      id: 5,
      name: 'BNK/2025/00204',
      journal_id: 3,
      journal_code: 'BNK',
      journal_name: 'Journal de banque',
      date: '2025-05-08',
      ref: 'PAY-0087',
      narration: 'Paiement fournisseur fournitures',
      state: 'posted',
      total_debit: 3750,
      total_credit: 3750,
      is_balanced: true,
      is_manual: false
    },
    {
      id: 6,
      name: 'VEN/2025/00126',
      journal_id: 1,
      journal_code: 'VEN',
      journal_name: 'Journal des ventes',
      date: '2025-05-05',
      ref: 'FACT-2190',
      narration: 'Facture FACT-2190 - Client XYZ',
      state: 'draft',
      total_debit: 5600,
      total_credit: 5600,
      is_balanced: true,
      is_manual: false
    }
  ];

  // Fix icons import
  // Import needed icons
  const { EditOutlined, DeleteOutlined } = require('@ant-design/icons');

  const displayedJournals = journals.length > 0 ? journals : demoJournals;
  const displayedEntries = filteredEntries.length > 0 ? filteredEntries : demoEntries;

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
        <Spin size="large" />
      </div>
    );
  }

  const filterContent = (
    <div style={{ width: 300 }}>
      <div style={{ marginBottom: 16 }}>
        <p>Journal</p>
        <Select
          style={{ width: '100%' }}
          value={journalFilter}
          onChange={value => setJournalFilter(value)}
        >
          <Option value="all">Tous les journaux</Option>
          {displayedJournals.map(journal => (
            <Option key={journal.id} value={journal.id.toString()}>
              {journal.code} - {journal.name}
            </Option>
          ))}
        </Select>
      </div>
      
      <div style={{ marginBottom: 16 }}>
        <p>Statut</p>
        <Select
          style={{ width: '100%' }}
          value={stateFilter}
          onChange={value => setStateFilter(value)}
        >
          <Option value="all">Tous les statuts</Option>
          <Option value="draft">Brouillon</Option>
          <Option value="posted">Validé</Option>
          <Option value="cancel">Annulé</Option>
        </Select>
      </div>
      
      <div style={{ marginBottom: 16 }}>
        <p>Période</p>
        <RangePicker 
          style={{ width: '100%' }}
          value={dateRange}
          onChange={dates => setDateRange(dates)}
          format="DD/MM/YYYY"
        />
      </div>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 16 }}>
        <Button onClick={handleReset}>Réinitialiser</Button>
        <Button type="primary" onClick={() => setFilterVisible(false)}>Appliquer</Button>
      </div>
    </div>
  );

  return (
    <div className="journal-entries-list">
      <Title level={2}>Écritures comptables</Title>

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
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
          <Space size="large">
            <Input
              placeholder="Rechercher une écriture..."
              prefix={<SearchOutlined />}
              style={{ width: 300 }}
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            <Popover
              content={filterContent}
              title="Filtres avancés"
              trigger="click"
              visible={filterVisible}
              onVisibleChange={setFilterVisible}
            >
              <Button icon={<FilterOutlined />}>
                Filtres
                {(journalFilter !== 'all' || stateFilter !== 'all') && (
                  <Badge count={
                    (journalFilter !== 'all' ? 1 : 0) + 
                    (stateFilter !== 'all' ? 1 : 0)
                  } offset={[5, -5]} />
                )}
              </Button>
            </Popover>
          </Space>
          <Link to="/accounting/entries/new">
            <Button type="primary" icon={<PlusOutlined />}>
              Nouvelle écriture
            </Button>
          </Link>
        </div>

        <Table
          columns={columns}
          dataSource={displayedEntries}
          rowKey="id"
          size="middle"
          pagination={{ pageSize: 10 }}
          summary={pageData => {
            let totalAmount = 0;
            pageData.forEach(({ total_debit }) => {
              totalAmount += parseFloat(total_debit || 0);
            });
            
            return (
              <Table.Summary.Row>
                <Table.Summary.Cell index={0} colSpan={5}><strong>Total</strong></Table.Summary.Cell>
                <Table.Summary.Cell index={5} align="right">
                  <strong>{totalAmount.toFixed(2)} MAD</strong>
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

export default JournalEntryList;
