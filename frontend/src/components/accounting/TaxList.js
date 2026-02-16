// src/components/accounting/TaxList.js
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
  Tabs,
  DatePicker,
  Form,
  Row,
  Col,
  Statistic,
  Modal,
  Input,
  Select,
  InputNumber
} from 'antd';
import { 
  PlusOutlined, 
  CalculatorOutlined,
  FileExcelOutlined,
  FilePdfOutlined,
  EditOutlined,
  PercentageOutlined
} from '@ant-design/icons';
import axios from '../../utils/axiosConfig';
import { extractResultsFromResponse } from '../../utils/apiUtils';
import moment from 'moment';

const { Title } = Typography;
const { TabPane } = Tabs;
const { RangePicker } = DatePicker;
const { Option } = Select;

const TaxList = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [taxes, setTaxes] = useState([]);
  const [vatStats, setVatStats] = useState({
    collected: 0,
    deductible: 0,
    balance: 0,
    period: [moment().startOf('month'), moment().endOf('month')]
  });
  const [modalVisible, setModalVisible] = useState(false);
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState('1');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await axios.get('/api/accounting/taxes/');
      const taxesData = extractResultsFromResponse(response);
      setTaxes(taxesData.length > 0 ? taxesData : demoTaxes);
    } catch (error) {
      console.error('Erreur lors de la récupération des taxes:', error);
      setError('Impossible de charger les taxes. Veuillez réessayer plus tard.');
      setTaxes(demoTaxes);
    } finally {
      setLoading(false);
    }
  };

  const fetchVatStats = async () => {
    try {
      const startDate = vatStats.period[0].format('YYYY-MM-DD');
      const endDate = vatStats.period[1].format('YYYY-MM-DD');

      const response = await axios.get('/api/accounting/taxes/vat-stats/', {
        params: {
          start_date: startDate,
          end_date: endDate
        }
      });

      // If API call succeeds, update vatStats with response data
      setVatStats({
        ...vatStats,
        collected: response.data.collected || 35000,
        deductible: response.data.deductible || 20000,
        balance: response.data.balance || 15000
      });
    } catch (error) {
      console.error('Erreur lors de la récupération des statistiques TVA:', error);
      // Use demo data if API fails
      setVatStats({
        ...vatStats,
        collected: 35000,
        deductible: 20000,
        balance: 15000
      });
    }
  };

  useEffect(() => {
    if (activeTab === '1') {
      fetchVatStats();
    }
  }, [vatStats.period, activeTab]);

  const handlePeriodChange = (dates) => {
    if (dates && dates.length === 2) {
      setVatStats({
        ...vatStats,
        period: dates
      });
    }
  };

  const handleAddTax = () => {
    form.resetFields();
    setModalVisible(true);
  };

  const handleCreateTax = async (values) => {
    setSubmitting(true);
    try {
      await axios.post('/api/accounting/taxes/', values);
      setModalVisible(false);
      fetchData();
    } catch (error) {
      console.error('Erreur lors de la création de la taxe:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const columns = [
    {
      title: 'Nom',
      dataIndex: 'name',
      key: 'name',
      sorter: (a, b) => a.name.localeCompare(b.name),
    },
    {
      title: 'Taux',
      dataIndex: 'amount',
      key: 'amount',
      render: (text, record) => {
        return record.type === 'percent' ? `${text}%` : `${text} MAD`;
      },
      sorter: (a, b) => a.amount - b.amount,
    },
    {
      title: 'Type de taxe',
      dataIndex: 'tax_category',
      key: 'tax_category',
      render: (text) => {
        const categoryMap = {
          'vat': 'TVA',
          'vat_import': 'TVA à l\'importation',
          'other': 'Autre taxe'
        };
        return categoryMap[text] || text;
      },
      filters: [
        { text: 'TVA', value: 'vat' },
        { text: 'TVA à l\'importation', value: 'vat_import' },
        { text: 'Autre taxe', value: 'other' }
      ],
      onFilter: (value, record) => record.tax_category === value,
    },
    {
      title: 'Compte associé',
      key: 'account',
      render: (_, record) => (
        <Link to={`/accounting/accounts/${record.account_id}`}>
          {record.account_code} - {record.account_name}
        </Link>
      ),
    },
    {
      title: 'Déductible',
      dataIndex: 'is_deductible',
      key: 'is_deductible',
      render: (isDeductible) => isDeductible ? (
        <Tag color="green">Oui</Tag>
      ) : (
        <Tag color="red">Non</Tag>
      ),
      filters: [
        { text: 'Oui', value: true },
        { text: 'Non', value: false }
      ],
      onFilter: (value, record) => record.is_deductible === value,
    },
    {
      title: 'Statut',
      dataIndex: 'active',
      key: 'active',
      render: (active) => active ? (
        <Tag color="green">Actif</Tag>
      ) : (
        <Tag color="red">Inactif</Tag>
      ),
      filters: [
        { text: 'Actif', value: true },
        { text: 'Inactif', value: false }
      ],
      onFilter: (value, record) => record.active === value,
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Button 
          type="link" 
          size="small" 
          icon={<EditOutlined />}
        >
          Modifier
        </Button>
      ),
    },
  ];

  // Demo data
  const demoTaxes = [
    {
      id: 1,
      name: 'TVA (20%)',
      description: 'Taxe sur la valeur ajoutée standard',
      amount: 20,
      type: 'percent',
      account_id: 5,
      account_code: '445650',
      account_name: 'TVA facturée',
      active: true,
      tax_category: 'vat',
      is_deductible: false
    },
    {
      id: 2,
      name: 'TVA Réduite (14%)',
      description: 'TVA à taux réduit',
      amount: 14,
      type: 'percent',
      account_id: 5,
      account_code: '445650',
      account_name: 'TVA facturée',
      active: true,
      tax_category: 'vat',
      is_deductible: false
    },
    {
      id: 3,
      name: 'TVA Achat (20%)',
      description: 'TVA déductible sur achats',
      amount: 20,
      type: 'percent',
      account_id: 13,
      account_code: '445660',
      account_name: 'TVA déductible',
      active: true,
      tax_category: 'vat',
      is_deductible: true
    },
    {
      id: 4,
      name: 'TVA Import (20%)',
      description: 'TVA sur importations',
      amount: 20,
      type: 'percent',
      account_id: 14,
      account_code: '445670',
      account_name: 'TVA à l\'importation',
      active: true,
      tax_category: 'vat_import',
      is_deductible: true
    }
  ];

  if (loading && activeTab !== '1') {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div className="taxes-list">
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 24 }}>
        <Title level={2}>Taxes et TVA</Title>
        <Space>
          <Button icon={<FileExcelOutlined />}>
            Exporter
          </Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={handleAddTax}>
            Nouvelle taxe
          </Button>
        </Space>
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

      <Tabs defaultActiveKey="1" onChange={setActiveTab}>
        <TabPane 
          tab={
            <span>
              <CalculatorOutlined />
              Déclaration de TVA
            </span>
          } 
          key="1"
        >
          <Card style={{ marginBottom: 24 }}>
            <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
              <Space>
                <span>Période :</span>
                <RangePicker
                  value={vatStats.period}
                  onChange={handlePeriodChange}
                  format="DD/MM/YYYY"
                />
              </Space>
              <Space>
                <Button icon={<CalculatorOutlined />}>Calculer la TVA</Button>
                <Button icon={<FilePdfOutlined />}>Générer déclaration</Button>
              </Space>
            </div>

            <Row gutter={16}>
              <Col span={8}>
                <Card>
                  <Statistic
                    title="TVA Collectée"
                    value={vatStats.collected}
                    precision={2}
                    suffix="MAD"
                    valueStyle={{ color: '#cf1322' }}
                    prefix={<PercentageOutlined />}
                  />
                </Card>
              </Col>
              <Col span={8}>
                <Card>
                  <Statistic
                    title="TVA Déductible"
                    value={vatStats.deductible}
                    precision={2}
                    suffix="MAD"
                    valueStyle={{ color: '#3f8600' }}
                    prefix={<PercentageOutlined />}
                  />
                </Card>
              </Col>
              <Col span={8}>
                <Card>
                  <Statistic
                    title="Solde à payer"
                    value={vatStats.balance}
                    precision={2}
                    suffix="MAD"
                    valueStyle={{ color: vatStats.balance >= 0 ? '#cf1322' : '#3f8600' }}
                    prefix={<PercentageOutlined />}
                  />
                </Card>
              </Col>
            </Row>
          </Card>

          <Card title="Détail de la TVA par taux">
            <Table
              columns={[
                {
                  title: 'Taux de TVA',
                  dataIndex: 'rate',
                  key: 'rate',
                  render: (text) => `${text}%`,
                },
                {
                  title: 'Base HT (Ventes)',
                  dataIndex: 'sales_base',
                  key: 'sales_base',
                  align: 'right',
                  render: (text) => `${text.toFixed(2)} MAD`,
                },
                {
                  title: 'TVA Collectée',
                  dataIndex: 'vat_collected',
                  key: 'vat_collected',
                  align: 'right',
                  render: (text) => `${text.toFixed(2)} MAD`,
                },
                {
                  title: 'Base HT (Achats)',
                  dataIndex: 'purchases_base',
                  key: 'purchases_base',
                  align: 'right',
                  render: (text) => `${text.toFixed(2)} MAD`,
                },
                {
                  title: 'TVA Déductible',
                  dataIndex: 'vat_deductible',
                  key: 'vat_deductible',
                  align: 'right',
                  render: (text) => `${text.toFixed(2)} MAD`,
                },
                {
                  title: 'Solde TVA',
                  key: 'balance',
                  align: 'right',
                  render: (_, record) => {
                    const balance = record.vat_collected - record.vat_deductible;
                    return (
                      <span style={{ color: balance >= 0 ? '#cf1322' : '#3f8600' }}>
                        {balance.toFixed(2)} MAD
                      </span>
                    );
                  },
                },
              ]}
              dataSource={[
                {
                  key: '1',
                  rate: 20,
                  sales_base: 175000,
                  vat_collected: 35000,
                  purchases_base: 100000,
                  vat_deductible: 20000
                },
                {
                  key: '2',
                  rate: 14,
                  sales_base: 30000,
                  vat_collected: 4200,
                  purchases_base: 50000,
                  vat_deductible: 7000
                },
                {
                  key: '3',
                  rate: 10,
                  sales_base: 5000,
                  vat_collected: 500,
                  purchases_base: 2000,
                  vat_deductible: 200
                },
                {
                  key: '4',
                  rate: 7,
                  sales_base: 2000,
                  vat_collected: 140,
                  purchases_base: 1000,
                  vat_deductible: 70
                }
              ]}
              pagination={false}
              summary={pageData => {
                let totalSalesBase = 0;
                let totalVatCollected = 0;
                let totalPurchasesBase = 0;
                let totalVatDeductible = 0;
                
                pageData.forEach(({ sales_base, vat_collected, purchases_base, vat_deductible }) => {
                  totalSalesBase += sales_base;
                  totalVatCollected += vat_collected;
                  totalPurchasesBase += purchases_base;
                  totalVatDeductible += vat_deductible;
                });
                
                const totalBalance = totalVatCollected - totalVatDeductible;
                
                return (
                  <Table.Summary.Row>
                    <Table.Summary.Cell index={0}><strong>Total</strong></Table.Summary.Cell>
                    <Table.Summary.Cell index={1} align="right">
                      <strong>{totalSalesBase.toFixed(2)} MAD</strong>
                    </Table.Summary.Cell>
                    <Table.Summary.Cell index={2} align="right">
                      <strong>{totalVatCollected.toFixed(2)} MAD</strong>
                    </Table.Summary.Cell>
                    <Table.Summary.Cell index={3} align="right">
                      <strong>{totalPurchasesBase.toFixed(2)} MAD</strong>
                    </Table.Summary.Cell>
                    <Table.Summary.Cell index={4} align="right">
                      <strong>{totalVatDeductible.toFixed(2)} MAD</strong>
                    </Table.Summary.Cell>
                    <Table.Summary.Cell index={5} align="right">
                      <strong style={{ color: totalBalance >= 0 ? '#cf1322' : '#3f8600' }}>
                        {totalBalance.toFixed(2)} MAD
                      </strong>
                    </Table.Summary.Cell>
                  </Table.Summary.Row>
                );
              }}
            />
          </Card>
        </TabPane>
        
        <TabPane 
          tab={
            <span>
              <PercentageOutlined />
              Taux de taxe
            </span>
          } 
          key="2"
        >
          <Card>
            <Table
              columns={columns}
              dataSource={taxes}
              rowKey="id"
              size="middle"
              pagination={{ pageSize: 10 }}
            />
          </Card>
        </TabPane>
      </Tabs>

      <Modal
        title="Nouvelle taxe"
        visible={modalVisible}
        onCancel={() => setModalVisible(false)}
        footer={null}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleCreateTax}
          initialValues={{
            type: 'percent',
            active: true,
            tax_category: 'vat',
            is_deductible: false
          }}
        >
          <Form.Item
            name="name"
            label="Nom"
            rules={[{ required: true, message: 'Veuillez saisir un nom' }]}
          >
            <Input placeholder="Ex: TVA (20%)" />
          </Form.Item>
          
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="amount"
                label="Taux/Montant"
                rules={[{ required: true, message: 'Veuillez saisir un taux' }]}
              >
                <InputNumber
                  style={{ width: '100%' }}
                  min={0}
                  step={0.01}
                  precision={2}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="type"
                label="Type"
                rules={[{ required: true, message: 'Veuillez sélectionner un type' }]}
              >
                <Select>
                  <Option value="percent">Pourcentage (%)</Option>
                  <Option value="fixed">Montant fixe</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>
          
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="tax_category"
                label="Catégorie de taxe"
                rules={[{ required: true, message: 'Veuillez sélectionner une catégorie' }]}
              >
                <Select>
                  <Option value="vat">TVA</Option>
                  <Option value="vat_import">TVA à l'importation</Option>
                  <Option value="other">Autre taxe</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="account_id"
                label="Compte associé"
                rules={[{ required: true, message: 'Veuillez sélectionner un compte' }]}
              >
                <Select
                  placeholder="Sélectionner un compte"
                  showSearch
                  optionFilterProp="children"
                >
                  <Option value={5}>445650 - TVA facturée</Option>
                  <Option value={13}>445660 - TVA déductible</Option>
                  <Option value={14}>445670 - TVA à l'importation</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>
          
          <Form.Item
            name="description"
            label="Description"
          >
            <Input.TextArea rows={3} placeholder="Description de la taxe" />
          </Form.Item>
          
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="is_deductible"
                valuePropName="checked"
                label="Déductible"
              >
                <Select>
                  <Option value={true}>Oui</Option>
                  <Option value={false}>Non</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="active"
                valuePropName="checked"
                label="Statut"
              >
                <Select>
                  <Option value={true}>Actif</Option>
                  <Option value={false}>Inactif</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>
          
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

export default TaxList;
