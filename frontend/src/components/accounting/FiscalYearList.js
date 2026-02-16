// src/components/accounting/FiscalYearList.js
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
  Modal,
  Form,
  Input,
  DatePicker,
  message
} from 'antd';
import { 
  PlusOutlined, 
  CalendarOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ExclamationCircleOutlined
} from '@ant-design/icons';
import axios from '../../utils/axiosConfig';
import { extractResultsFromResponse } from '../../utils/apiUtils';
import moment from 'moment';

const { Title } = Typography;
const { RangePicker } = DatePicker;

const FiscalYearList = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [fiscalYears, setFiscalYears] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchFiscalYears();
  }, []);

  const fetchFiscalYears = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await axios.get('/api/accounting/fiscal-years/');
      const fiscalYearsData = extractResultsFromResponse(response);
      setFiscalYears(fiscalYearsData.length > 0 ? fiscalYearsData : demoFiscalYears);
    } catch (error) {
      console.error('Erreur lors de la récupération des exercices fiscaux:', error);
      setError('Impossible de charger les exercices fiscaux. Veuillez réessayer plus tard.');
      setFiscalYears(demoFiscalYears);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = () => {
    form.resetFields();
    setModalVisible(true);
  };

  const handleCreateFiscalYear = async (values) => {
    setSubmitting(true);
    try {
      const fiscalYearData = {
        name: values.name,
        start_date: values.date_range[0].format('YYYY-MM-DD'),
        end_date: values.date_range[1].format('YYYY-MM-DD'),
        state: 'draft'
      };

      await axios.post('/api/accounting/fiscal-years/', fiscalYearData);
      message.success('Exercice fiscal créé avec succès.');
      setModalVisible(false);
      fetchFiscalYears();
    } catch (error) {
      console.error('Erreur lors de la création de l\'exercice fiscal:', error);
      message.error('Erreur lors de la création de l\'exercice fiscal. Veuillez réessayer.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreatePeriods = async (id) => {
    try {
      await axios.post(`/api/accounting/fiscal-years/${id}/create-periods/`);
      message.success('Périodes fiscales créées avec succès.');
      fetchFiscalYears();
    } catch (error) {
      console.error('Erreur lors de la création des périodes:', error);
      message.error('Erreur lors de la création des périodes. Veuillez réessayer.');
    }
  };

  const handleOpenFiscalYear = async (id) => {
    try {
      await axios.post(`/api/accounting/fiscal-years/${id}/open/`);
      message.success('Exercice fiscal ouvert avec succès.');
      fetchFiscalYears();
    } catch (error) {
      console.error('Erreur lors de l\'ouverture de l\'exercice fiscal:', error);
      message.error('Erreur lors de l\'ouverture de l\'exercice fiscal. Veuillez réessayer.');
    }
  };

  const handleCloseFiscalYear = async (id) => {
    try {
      await axios.post(`/api/accounting/fiscal-years/${id}/close/`);
      message.success('Exercice fiscal clôturé avec succès.');
      fetchFiscalYears();
    } catch (error) {
      console.error('Erreur lors de la clôture de l\'exercice fiscal:', error);
      message.error('Erreur lors de la clôture de l\'exercice fiscal. Veuillez réessayer.');
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

  const columns = [
    {
      title: 'Nom',
      dataIndex: 'name',
      key: 'name',
      sorter: (a, b) => a.name.localeCompare(b.name),
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
      title: 'Périodes',
      dataIndex: 'periods_count',
      key: 'periods_count',
      render: (text) => text || '0',
    },
    {
      title: 'Actions',
      key: 'action',
      render: (_, record) => (
        <Space size="small">
          {record.state === 'draft' && (
            <>
              <Button 
                type="link" 
                size="small" 
                onClick={() => handleCreatePeriods(record.id)}
                disabled={record.periods_count > 0}
              >
                Créer périodes
              </Button>
              <Button 
                type="link" 
                size="small" 
                onClick={() => handleOpenFiscalYear(record.id)}
                disabled={record.periods_count === 0}
              >
                Ouvrir
              </Button>
            </>
          )}
          {record.state === 'open' && (
            <Button 
              type="link" 
              size="small" 
              onClick={() => handleCloseFiscalYear(record.id)}
            >
              Clôturer
            </Button>
          )}
          <Link to={`/accounting/fiscal-periods?year=${record.id}`}>
            <Button type="link" size="small">
              Voir périodes
            </Button>
          </Link>
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
      state: 'closed',
      periods_count: 12
    },
    {
      id: 2,
      name: 'Exercice 2024',
      start_date: '2024-01-01',
      end_date: '2024-12-31',
      state: 'open',
      periods_count: 12
    },
    {
      id: 3,
      name: 'Exercice 2025',
      start_date: '2025-01-01',
      end_date: '2025-12-31',
      state: 'open',
      periods_count: 12
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
    <div className="fiscal-years-list">
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 24 }}>
        <Title level={2}>Exercices fiscaux</Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleOpenModal}>
          Nouvel exercice
        </Button>
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
        <Table
          columns={columns}
          dataSource={fiscalYears}
          rowKey="id"
          size="middle"
          pagination={{ pageSize: 10 }}
        />
      </Card>

      <Modal
        title="Nouvel exercice fiscal"
        visible={modalVisible}
        onCancel={() => setModalVisible(false)}
        footer={null}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleCreateFiscalYear}
        >
          <Form.Item
            name="name"
            label="Nom de l'exercice"
            rules={[{ required: true, message: 'Veuillez saisir un nom' }]}
          >
            <Input placeholder="Ex: Exercice 2025" />
          </Form.Item>
          
          <Form.Item
            name="date_range"
            label="Période"
            rules={[{ required: true, message: 'Veuillez sélectionner la période' }]}
          >
            <RangePicker
              style={{ width: '100%' }}
              format="DD/MM/YYYY"
            />
          </Form.Item>
          
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <Button onClick={() => setModalVisible(false)} style={{ marginRight: 8 }}>
              Annuler
            </Button>
            <Button type="primary" htmlType="submit" loading={submitting}>
              Créer
            </Button>
          </div>
        </Form>
      </Modal>
    </div>
  );
};

export default FiscalYearList;
