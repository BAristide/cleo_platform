// src/components/accounting/FiscalPeriodList.js
import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
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
  message
} from 'antd';
import { 
  CalendarOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ExclamationCircleOutlined
} from '@ant-design/icons';
import axios from '../../utils/axiosConfig';
import { extractResultsFromResponse } from '../../utils/apiUtils';
import moment from 'moment';

const { Title } = Typography;
const { Option } = Select;

const FiscalPeriodList = () => {
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const initialYearId = queryParams.get('year');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [fiscalYears, setFiscalYears] = useState([]);
  const [fiscalPeriods, setFiscalPeriods] = useState([]);
  const [selectedYear, setSelectedYear] = useState(initialYearId || 'all');

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (fiscalYears.length > 0 && !selectedYear && !initialYearId) {
      // Select the most recent open year by default
      const openYears = fiscalYears.filter(year => year.state === 'open');
      if (openYears.length > 0) {
        // Sort by start date descending
        openYears.sort((a, b) => moment(b.start_date).unix() - moment(a.start_date).unix());
        setSelectedYear(openYears[0].id.toString());
      } else {
        // If no open years, select the most recent year
        fiscalYears.sort((a, b) => moment(b.start_date).unix() - moment(a.start_date).unix());
        setSelectedYear(fiscalYears[0].id.toString());
      }
    }
  }, [fiscalYears, selectedYear, initialYearId]);

  const fetchData = async () => {
    setLoading(true);
    setError(null);

    try {
      const [yearsResponse, periodsResponse] = await Promise.all([
        axios.get('/api/accounting/fiscal-years/'),
        axios.get('/api/accounting/fiscal-periods/')
      ]);

      const yearsData = extractResultsFromResponse(yearsResponse);
      const periodsData = extractResultsFromResponse(periodsResponse);

      setFiscalYears(yearsData.length > 0 ? yearsData : demoFiscalYears);
      setFiscalPeriods(periodsData.length > 0 ? periodsData : demoFiscalPeriods);
    } catch (error) {
      console.error('Erreur lors de la récupération des données:', error);
      setError('Impossible de charger les données. Veuillez réessayer plus tard.');
      
      setFiscalYears(demoFiscalYears);
      setFiscalPeriods(demoFiscalPeriods);
    } finally {
      setLoading(false);
    }
  };

  const handleYearChange = (value) => {
    setSelectedYear(value);
  };

  const handleOpenPeriod = async (id) => {
    try {
      await axios.post(`/api/accounting/fiscal-periods/${id}/open/`);
      message.success('Période fiscale ouverte avec succès.');
      fetchData();
    } catch (error) {
      console.error('Erreur lors de l\'ouverture de la période fiscale:', error);
      message.error('Erreur lors de l\'ouverture de la période fiscale. Veuillez réessayer.');
    }
  };

  const handleClosePeriod = async (id) => {
    try {
      await axios.post(`/api/accounting/fiscal-periods/${id}/close/`);
      message.success('Période fiscale clôturée avec succès.');
      fetchData();
    } catch (error) {
      console.error('Erreur lors de la clôture de la période fiscale:', error);
      message.error('Erreur lors de la clôture de la période fiscale. Veuillez réessayer.');
    }
  };

  const getStateTag = (state) => {
    const stateMap = {
      'draft': { text: 'Brouillon', color: 'orange', icon: <ExclamationCircleOutlined /> },
      'open': { text: 'Ouvert', color: 'green', icon: <CheckCircleOutlined /> },
      'closed': { text: 'Clôturé', color: 'red', icon: <CloseCircleOutlined /> }
    };
    
    return (
      <Tag color={stateMap[state]?.color} icon={stateMap[state]?.icon}>
        {stateMap[state]?.text || state}
      </Tag>
    );
  };

  const filteredPeriods = selectedYear !== 'all' 
    ? fiscalPeriods.filter(period => period.fiscal_year.toString() === selectedYear)
    : fiscalPeriods;

  const columns = [
    {
      title: 'Nom',
      dataIndex: 'name',
      key: 'name',
      sorter: (a, b) => a.name.localeCompare(b.name),
    },
    {
      title: 'Exercice',
      dataIndex: 'fiscal_year_name',
      key: 'fiscal_year_name',
    },
    {
      title: 'Date de début',
      dataIndex: 'start_date',
      key: 'start_date',
      render: (text) => moment(text).format('DD/MM/YYYY'),
      sorter: (a, b) => moment(a.start_date).unix() - moment(b.start_date).unix(),
    },
    {
      title: 'Date de fin',
      dataIndex: 'end_date',
      key: 'end_date',
      render: (text) => moment(text).format('DD/MM/YYYY'),
      sorter: (a, b) => moment(a.end_date).unix() - moment(b.end_date).unix(),
    },
    {
      title: 'Statut',
      dataIndex: 'state',
      key: 'state',
      render: (state) => getStateTag(state),
    },
    {
      title: 'Actions',
      key: 'action',
      render: (_, record) => (
        <Space size="small">
          {record.state === 'draft' && (
            <Button 
              type="link" 
              size="small" 
              onClick={() => handleOpenPeriod(record.id)}
            >
              Ouvrir
            </Button>
          )}
          {record.state === 'open' && (
            <Button 
              type="link" 
              size="small" 
              onClick={() => handleClosePeriod(record.id)}
            >
              Clôturer
            </Button>
          )}
        </Space>
      ),
    },
  ];

  // Demo data
  const demoFiscalYears = [
    {
      id: 1,
      name: 'Exercice 2023',
      start_date: '2023-01-01',
      end_date: '2023-12-31',
      state: 'closed'
    },
    {
      id: 2,
      name: 'Exercice 2024',
      start_date: '2024-01-01',
      end_date: '2024-12-31',
      state: 'open'
    },
    {
      id: 3,
      name: 'Exercice 2025',
      start_date: '2025-01-01',
      end_date: '2025-12-31',
      state: 'open'
    }
  ];

  const demoFiscalPeriods = [
    {
      id: 1,
      fiscal_year: 3,
      fiscal_year_name: 'Exercice 2025',
      name: '2025 - Mois 1',
      start_date: '2025-01-01',
      end_date: '2025-01-31',
      state: 'closed'
    },
    {
      id: 2,
      fiscal_year: 3,
      fiscal_year_name: 'Exercice 2025',
      name: '2025 - Mois 2',
      start_date: '2025-02-01',
      end_date: '2025-02-28',
      state: 'closed'
    },
    {
      id: 3,
      fiscal_year: 3,
      fiscal_year_name: 'Exercice 2025',
      name: '2025 - Mois 3',
      start_date: '2025-03-01',
      end_date: '2025-03-31',
      state: 'closed'
    },
    {
      id: 4,
      fiscal_year: 3,
      fiscal_year_name: 'Exercice 2025',
      name: '2025 - Mois 4',
      start_date: '2025-04-01',
      end_date: '2025-04-30',
      state: 'closed'
    },
    {
      id: 5,
      fiscal_year: 3,
      fiscal_year_name: 'Exercice 2025',
      name: '2025 - Mois 5',
      start_date: '2025-05-01',
      end_date: '2025-05-31',
      state: 'open'
    },
    {
      id: 6,
      fiscal_year: 3,
      fiscal_year_name: 'Exercice 2025',
      name: '2025 - Mois 6',
      start_date: '2025-06-01',
      end_date: '2025-06-30',
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

  return (
    <div className="fiscal-periods-list">
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 24 }}>
        <Title level={2}>Périodes fiscales</Title>
        <Link to="/accounting/fiscal-years">
          <Button type="primary">
            Gérer les exercices
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

      <Card>
        <div style={{ marginBottom: 16 }}>
          <Space>
            <span>Exercice fiscal :</span>
            <Select
              style={{ width: 200 }}
              value={selectedYear}
              onChange={handleYearChange}
            >
              <Option value="all">Tous les exercices</Option>
              {fiscalYears.map(year => (
                <Option key={year.id} value={year.id.toString()}>
                  {year.name}
                </Option>
              ))}
            </Select>
          </Space>
        </div>

        <Table
          columns={columns}
          dataSource={filteredPeriods}
          rowKey="id"
          size="middle"
          pagination={{ pageSize: 10 }}
        />
      </Card>
    </div>
  );
};

export default FiscalPeriodList;
