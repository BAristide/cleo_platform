// src/components/accounting/AssetDepreciationList.js
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
  Tooltip,
  Modal,
  Form,
  message
} from 'antd';
import { 
  ToolOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ExclamationCircleOutlined,
  DollarOutlined
} from '@ant-design/icons';
import axios from '../../utils/axiosConfig';
import { extractResultsFromResponse } from '../../utils/apiUtils';
import moment from 'moment';

const { Title } = Typography;
const { Option } = Select;
const { RangePicker } = DatePicker;

const AssetDepreciationList = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [assets, setAssets] = useState([]);
  const [depreciations, setDepreciations] = useState([]);
  const [assetFilter, setAssetFilter] = useState('all');
  const [stateFilter, setStateFilter] = useState('all');
  const [dateRange, setDateRange] = useState([
    moment().startOf('month'),
    moment().endOf('month')
  ]);
  const [modalVisible, setModalVisible] = useState(false);
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    setError(null);

    try {
      const [assetsResponse, depreciationsResponse] = await Promise.all([
        axios.get('/api/accounting/assets/'),
        axios.get('/api/accounting/asset-depreciations/')
      ]);

      const assetsData = extractResultsFromResponse(assetsResponse);
      const depreciationsData = extractResultsFromResponse(depreciationsResponse);

      setAssets(assetsData.length > 0 ? assetsData : demoAssets);
      setDepreciations(depreciationsData.length > 0 ? depreciationsData : demoDepreciations);
    } catch (error) {
      console.error('Erreur lors de la récupération des données:', error);
      setError('Impossible de charger les données. Veuillez réessayer plus tard.');
      
      setAssets(demoAssets);
      setDepreciations(demoDepreciations);
    } finally {
      setLoading(false);
    }
  };

  const handleFilter = () => {
    // This is where we would typically filter the data based on the selected filters
    // For demo purposes, the filtering is done in the rendered component
  };

  const handlePostDepreciation = async (id) => {
    try {
      await axios.post(`/api/accounting/asset-depreciations/${id}/post/`);
      message.success('Dotation comptabilisée avec succès.');
      fetchData();
    } catch (error) {
      console.error('Erreur lors de la comptabilisation de la dotation:', error);
      message.error('Erreur lors de la comptabilisation de la dotation. Veuillez réessayer.');
    }
  };

  const handlePostMultipleDepreciations = () => {
    setModalVisible(true);
  };

  const handlePostAll = async (values) => {
    setSubmitting(true);
    try {
      await axios.post('/api/accounting/asset-depreciations/post-multiple/', {
        date: values.date.format('YYYY-MM-DD'),
        journal_id: values.journal_id
      });
      message.success('Dotations comptabilisées avec succès.');
      setModalVisible(false);
      fetchData();
    } catch (error) {
      console.error('Erreur lors de la comptabilisation des dotations:', error);
      message.error('Erreur lors de la comptabilisation des dotations. Veuillez réessayer.');
    } finally {
      setSubmitting(false);
    }
  };

  const getStateTag = (state) => {
    const stateMap = {
      'draft': { text: 'À comptabiliser', color: 'orange', icon: <ExclamationCircleOutlined /> },
      'posted': { text: 'Comptabilisé', color: 'green', icon: <CheckCircleOutlined /> },
      'cancel': { text: 'Annulé', color: 'red', icon: <CloseCircleOutlined /> }
    };
    
    return (
      <Tag color={stateMap[state]?.color} icon={stateMap[state]?.icon}>
        {stateMap[state]?.text || state}
      </Tag>
    );
  };

  // Filter depreciations based on selected filters
  const filteredDepreciations = depreciations.filter(depreciation => {
    // Filter by asset
    if (assetFilter !== 'all' && depreciation.asset_id.toString() !== assetFilter) {
      return false;
    }
    
    // Filter by state
    if (stateFilter !== 'all' && depreciation.state !== stateFilter) {
      return false;
    }
    
    // Filter by date range
    if (dateRange && dateRange.length === 2) {
      const depreciationDate = moment(depreciation.date);
      return depreciationDate.isBetween(dateRange[0], dateRange[1], null, '[]');
    }
    
    return true;
  });

  const columns = [
    {
      title: 'Immobilisation',
      key: 'asset',
      render: (_, record) => (
        <Link to={`/accounting/assets/${record.asset_id}`}>
          {record.asset_code} - {record.asset_name}
        </Link>
      ),
      sorter: (a, b) => a.asset_code.localeCompare(b.asset_code),
    },
    {
      title: 'Dotation',
      dataIndex: 'name',
      key: 'name',
      sorter: (a, b) => a.name.localeCompare(b.name),
    },
    {
      title: 'Séquence',
      dataIndex: 'sequence',
      key: 'sequence',
      sorter: (a, b) => a.sequence - b.sequence,
    },
    {
      title: 'Date',
      dataIndex: 'date',
      key: 'date',
      render: (text) => moment(text).format('DD/MM/YYYY'),
      sorter: (a, b) => moment(a.date).unix() - moment(b.date).unix(),
    },
    {
      title: 'Montant',
      dataIndex: 'amount',
      key: 'amount',
      align: 'right',
      render: (text) => `${parseFloat(text).toFixed(2)} MAD`,
      sorter: (a, b) => a.amount - b.amount,
    },
    {
      title: 'Valeur restante',
      dataIndex: 'remaining_value',
      key: 'remaining_value',
      align: 'right',
      render: (text) => `${parseFloat(text).toFixed(2)} MAD`,
      sorter: (a, b) => a.remaining_value - b.remaining_value,
    },
    {
      title: 'Écriture',
      dataIndex: 'move_id',
      key: 'move_id',
      render: (moveId) => moveId ? (
        <Link to={`/accounting/entries/${moveId}`}>
          Voir l'écriture
        </Link>
      ) : '-',
    },
    {
      title: 'Statut',
      dataIndex: 'state',
      key: 'state',
      render: (state) => getStateTag(state),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        record.state === 'draft' ? (
          <Button 
            type="link" 
            size="small" 
            icon={<DollarOutlined />} 
            onClick={() => handlePostDepreciation(record.id)}
          >
            Comptabiliser
          </Button>
        ) : null
      ),
    },
  ];

  // Demo data
  const demoAssets = [
    {
      id: 1,
      code: 'A-0001',
      name: 'Serveur Dell PowerEdge'
    },
    {
      id: 2,
      code: 'A-0002',
      name: 'Bureaux open space'
    },
    {
      id: 3,
      code: 'A-0003',
      name: 'Renault Kangoo'
    }
  ];

  const demoDepreciations = [
    {
      id: 101,
      asset_id: 1,
      asset_code: 'A-0001',
      asset_name: 'Serveur Dell PowerEdge',
      name: 'Dotation 1',
      sequence: 1,
      date: '2023-01-31',
      amount: 1250,
      remaining_value: 43750,
      move_id: 501,
      state: 'posted'
    },
    {
      id: 102,
      asset_id: 1,
      asset_code: 'A-0001',
      asset_name: 'Serveur Dell PowerEdge',
      name: 'Dotation 2',
      sequence: 2,
      date: '2023-02-28',
      amount: 1250,
      remaining_value: 42500,
      move_id: 502,
      state: 'posted'
    },
    {
      id: 103,
      asset_id: 1,
      asset_code: 'A-0001',
      asset_name: 'Serveur Dell PowerEdge',
      name: 'Dotation 3',
      sequence: 3,
      date: '2023-03-31',
      amount: 1250,
      remaining_value: 41250,
      move_id: null,
      state: 'draft'
    },
    {
      id: 201,
      asset_id: 2,
      asset_code: 'A-0002',
      asset_name: 'Bureaux open space',
      name: 'Dotation 1',
      sequence: 1,
      date: '2022-06-30',
      amount: 563,
      remaining_value: 66938,
      move_id: 601,
      state: 'posted'
    },
    {
      id: 202,
      asset_id: 2,
      asset_code: 'A-0002',
      asset_name: 'Bureaux open space',
      name: 'Dotation 2',
      sequence: 2,
      date: '2022-07-31',
      amount: 563,
      remaining_value: 66375,
      move_id: 602,
      state: 'posted'
    },
    {
      id: 301,
      asset_id: 3,
      asset_code: 'A-0003',
      asset_name: 'Renault Kangoo',
      name: 'Dotation 1',
      sequence: 1,
      date: '2021-10-31',
      amount: 5000,
      remaining_value: 95000,
      move_id: 701,
      state: 'posted'
    },
    {
      id: 302,
      asset_id: 3,
      asset_code: 'A-0003',
      asset_name: 'Renault Kangoo',
      name: 'Dotation 2',
      sequence: 2,
      date: '2021-11-30',
      amount: 5000,
      remaining_value: 90000,
      move_id: 702,
      state: 'posted'
    }
  ];

  // Demo data for journals
  const demoJournals = [
    {
      id: 5,
      name: 'Opérations diverses'
    }
  ];

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
        <Spin size="large" />
      </div>
    );
  }

  const draftDepreciations = filteredDepreciations.filter(d => d.state === 'draft');
  const hasDraftDepreciations = draftDepreciations.length > 0;

  return (
    <div className="asset-depreciations-list">
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 24 }}>
        <Title level={2}>Dotations aux amortissements</Title>
        <Button 
          type="primary" 
          icon={<DollarOutlined />} 
          onClick={handlePostMultipleDepreciations}
          disabled={!hasDraftDepreciations}
        >
          Comptabiliser les dotations
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

      <Card style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', marginBottom: 16 }}>
          <Space size="large">
            <div>
              <span style={{ marginRight: 8 }}>Immobilisation:</span>
              <Select
                style={{ width: 250 }}
                value={assetFilter}
                onChange={value => setAssetFilter(value)}
              >
                <Option value="all">Toutes les immobilisations</Option>
                {assets.map(asset => (
                  <Option key={asset.id} value={asset.id.toString()}>
                    {asset.code} - {asset.name}
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
                <Option value="draft">À comptabiliser</Option>
                <Option value="posted">Comptabilisé</Option>
                <Option value="cancel">Annulé</Option>
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
          dataSource={filteredDepreciations}
          rowKey="id"
          size="middle"
          pagination={{ pageSize: 10 }}
          summary={pageData => {
            let totalAmount = 0;
            
            pageData.forEach(({ amount }) => {
              totalAmount += parseFloat(amount || 0);
            });
            
            return (
              <Table.Summary.Row>
                <Table.Summary.Cell index={0} colSpan={4}><strong>Total</strong></Table.Summary.Cell>
                <Table.Summary.Cell index={4} align="right">
                  <strong>{totalAmount.toFixed(2)} MAD</strong>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={5} colSpan={4}></Table.Summary.Cell>
              </Table.Summary.Row>
            );
          }}
        />
      </Card>

      <Modal
        title="Comptabiliser les dotations"
        visible={modalVisible}
        onCancel={() => setModalVisible(false)}
        footer={null}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handlePostAll}
          initialValues={{
            date: moment(),
            journal_id: 5 // Default to 'Opérations diverses'
          }}
        >
          <p>
            Cette action va comptabiliser toutes les dotations en statut "À comptabiliser".
            {draftDepreciations.length > 0 && (
              <span> ({draftDepreciations.length} dotations)</span>
            )}
          </p>
          
          <Form.Item
            name="journal_id"
            label="Journal comptable"
            rules={[{ required: true, message: 'Veuillez sélectionner un journal' }]}
          >
            <Select placeholder="Sélectionner un journal">
              {demoJournals.map(journal => (
                <Option key={journal.id} value={journal.id}>{journal.name}</Option>
              ))}
            </Select>
          </Form.Item>
          
          <Form.Item
            name="date"
            label="Date de comptabilisation"
            rules={[{ required: true, message: 'Veuillez sélectionner une date' }]}
          >
            <DatePicker format="DD/MM/YYYY" style={{ width: '100%' }} />
          </Form.Item>
          
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <Button onClick={() => setModalVisible(false)} style={{ marginRight: 8 }}>
              Annuler
            </Button>
            <Button type="primary" htmlType="submit" loading={submitting}>
              Comptabiliser
            </Button>
          </div>
        </Form>
      </Modal>
    </div>
  );
};

export default AssetDepreciationList;
