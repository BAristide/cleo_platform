// src/components/accounting/AccountDetail.js
import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  Card,
  Descriptions,
  Button,
  Tabs,
  Table,
  Tag,
  Statistic,
  Typography,
  Row,
  Col,
  Space,
  Spin,
  Alert,
  Divider,
  DatePicker
} from 'antd';
import {
  EditOutlined,
  DeleteOutlined,
  HistoryOutlined,
  FileTextOutlined,
  BarChartOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined
} from '@ant-design/icons';
import axios from '../../utils/axiosConfig';
import { extractResultsFromResponse } from '../../utils/apiUtils';
import moment from 'moment';

const { Title, Text } = Typography;
const { TabPane } = Tabs;
const { RangePicker } = DatePicker;

const AccountDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [account, setAccount] = useState(null);
  const [entries, setEntries] = useState([]);
  const [dateRange, setDateRange] = useState([
    moment().startOf('month'),
    moment().endOf('month')
  ]);

  useEffect(() => {
    fetchAccountDetails();
  }, [id]);

  useEffect(() => {
    if (account) {
      fetchAccountEntries();
    }
  }, [account, dateRange]);

  const fetchAccountDetails = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await axios.get(`/api/accounting/accounts/${id}/`);
      setAccount(response.data);
    } catch (error) {
      console.error('Erreur lors de la récupération des détails du compte:', error);
      setError('Impossible de charger les détails du compte. Veuillez réessayer plus tard.');
      
      // Si l'API n'est pas disponible, utiliser des données de démonstration
      if (demoAccounts[id - 1]) {
        setAccount(demoAccounts[id - 1]);
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchAccountEntries = async () => {
    try {
      const startDate = dateRange[0].format('YYYY-MM-DD');
      const endDate = dateRange[1].format('YYYY-MM-DD');

      const response = await axios.get('/api/accounting/journal-entry-lines/', {
        params: {
          account_id: id,
          start_date: startDate,
          end_date: endDate
        }
      });

      const entriesData = extractResultsFromResponse(response);
      setEntries(entriesData);
    } catch (error) {
      console.error('Erreur lors de la récupération des écritures du compte:', error);
      // Utiliser des données de démonstration si l'API échoue
      setEntries(demoEntries);
    }
  };

  const handleDateRangeChange = (dates) => {
    if (dates && dates.length === 2) {
      setDateRange(dates);
    }
  };

  // Données de démonstration
  const demoAccounts = [
    {
      id: 1,
      code: '101000',
      name: 'Capital',
      type_id: 1,
      type_name: 'Capitaux',
      parent_id: null,
      parent_name: null,
      is_reconcilable: false,
      is_active: true,
      is_tax_account: false,
      tax_type: null,
      tax_rate: null,
      description: 'Compte de capital social',
      balance: 0,
      children: []
    },
    {
      id: 4,
      code: '411000',
      name: 'Clients',
      type_id: 4,
      type_name: 'Créances',
      parent_id: null,
      parent_name: null,
      is_reconcilable: true,
      is_active: true,
      is_tax_account: false,
      tax_type: null,
      tax_rate: null,
      description: 'Compte client général',
      balance: 250000,
      children: []
    },
    {
      id: 5,
      code: '445650',
      name: 'TVA facturée',
      type_id: 4,
      type_name: 'Créances',
      parent_id: null,
      parent_name: null,
      is_reconcilable: false,
      is_active: true,
      is_tax_account: true,
      tax_type: 'vat_collected',
      tax_rate: 20.0,
      description: 'TVA collectée sur les ventes',
      balance: 35000,
      children: []
    },
    {
      id: 6,
      code: '512000',
      name: 'Banque',
      type_id: 5,
      type_name: 'Trésorerie',
      parent_id: null,
      parent_name: null,
      is_reconcilable: true,
      is_active: true,
      is_tax_account: false,
      tax_type: null,
      tax_rate: null,
      description: 'Compte bancaire principal',
      balance: 350000,
      children: []
    },
    {
      id: 9,
      code: '701000',
      name: 'Ventes de produits finis',
      type_id: 8,
      type_name: 'Produits',
      parent_id: null,
      parent_name: null,
      is_reconcilable: false,
      is_active: true,
      is_tax_account: false,
      tax_type: null,
      tax_rate: null,
      description: 'Produits des ventes',
      balance: -750000,
      children: []
    }
  ];

  // Données d'écritures de démonstration
  const demoEntries = [
    {
      id: 1,
      entry_id: 101,
      entry_name: 'VEN/2025/00125',
      entry_date: '2025-05-15',
      account_id: id,
      account_code: account?.code || '',
      account_name: account?.name || '',
      name: 'Facture FACT-2189 - Client ABC',
      debit: id == 4 ? 12500 : id == 5 ? 0 : id == 9 ? 0 : 0, // Pour le compte clients
      credit: id == 4 ? 0 : id == 5 ? 2500 : id == 9 ? 10000 : 0, // Pour la TVA et les ventes
      is_reconciled: false,
      date_maturity: '2025-06-15',
      partner_name: 'ABC SARL'
    },
    {
      id: 2,
      entry_id: 102,
      entry_name: 'VEN/2025/00126',
      entry_date: '2025-05-16',
      account_id: id,
      account_code: account?.code || '',
      account_name: account?.name || '',
      name: 'Facture FACT-2190 - Client XYZ',
      debit: id == 4 ? 9000 : id == 5 ? 0 : id == 9 ? 0 : 0,
      credit: id == 4 ? 0 : id == 5 ? 1800 : id == 9 ? 7200 : 0,
      is_reconciled: false,
      date_maturity: '2025-06-16',
      partner_name: 'XYZ Inc.'
    },
    {
      id: 3,
      entry_id: 103,
      entry_name: 'BNK/2025/00203',
      entry_date: '2025-05-18',
      account_id: id,
      account_code: account?.code || '',
      account_name: account?.name || '',
      name: 'Paiement client ABC',
      debit: id == 6 ? 12500 : 0,
      credit: id == 4 ? 12500 : 0,
      is_reconciled: id == 4 || id == 6,
      date_maturity: null,
      partner_name: 'ABC SARL'
    },
    {
      id: 4,
      entry_id: 104,
      entry_name: 'VEN/2025/00127',
      entry_date: '2025-05-20',
      account_id: id,
      account_code: account?.code || '',
      account_name: account?.name || '',
      name: 'Facture FACT-2191 - Client DEF',
      debit: id == 4 ? 15000 : id == 5 ? 0 : id == 9 ? 0 : 0,
      credit: id == 4 ? 0 : id == 5 ? 3000 : id == 9 ? 12000 : 0,
      is_reconciled: false,
      date_maturity: '2025-06-20',
      partner_name: 'DEF SA'
    },
    {
      id: 5,
      entry_id: 105,
      entry_name: 'BNK/2025/00204',
      entry_date: '2025-05-22',
      account_id: id,
      account_code: account?.code || '',
      account_name: account?.name || '',
      name: 'Paiement client XYZ',
      debit: id == 6 ? 9000 : 0,
      credit: id == 4 ? 9000 : 0,
      is_reconciled: id == 4 || id == 6,
      date_maturity: null,
      partner_name: 'XYZ Inc.'
    }
  ];

  const entriesColumns = [
    {
      title: 'Date',
      dataIndex: 'entry_date',
      key: 'entry_date',
      render: (text) => moment(text).format('DD/MM/YYYY'),
      sorter: (a, b) => moment(a.entry_date).unix() - moment(b.entry_date).unix(),
    },
    {
      title: 'Journal/N°',
      key: 'entry',
      render: (_, record) => (
        <Link to={`/accounting/entries/${record.entry_id}`}>
          {record.entry_name}
        </Link>
      ),
    },
    {
      title: 'Libellé',
      dataIndex: 'name',
      key: 'name',
      ellipsis: true,
    },
    {
      title: 'Partenaire',
      dataIndex: 'partner_name',
      key: 'partner_name',
    },
    {
      title: 'Échéance',
      dataIndex: 'date_maturity',
      key: 'date_maturity',
      render: (text) => text ? moment(text).format('DD/MM/YYYY') : '-',
    },
    {
      title: 'Débit',
      dataIndex: 'debit',
      key: 'debit',
      align: 'right',
      render: (text) => parseFloat(text).toFixed(2),
    },
    {
      title: 'Crédit',
      dataIndex: 'credit',
      key: 'credit',
      align: 'right',
      render: (text) => parseFloat(text).toFixed(2),
    },
    {
      title: 'Lettré',
      dataIndex: 'is_reconciled',
      key: 'is_reconciled',
      align: 'center',
      render: (reconciled) => reconciled ? 
        <CheckCircleOutlined style={{ color: 'green' }} /> : 
        <CloseCircleOutlined style={{ color: 'red' }} />
    }
  ];

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
        <Spin size="large" />
      </div>
    );
  }

  if (error && !account) {
    return (
      <Alert
        message="Erreur"
        description={error}
        type="error"
        showIcon
        action={
          <Button size="small" onClick={() => navigate('/accounting/accounts')}>
            Retour à la liste
          </Button>
        }
      />
    );
  }

  const displayedAccount = account || demoAccounts[0];

  return (
    <div className="account-detail">
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 24 }}>
        <Space>
          <Title level={2}>{displayedAccount.code} - {displayedAccount.name}</Title>
          {!displayedAccount.is_active && (
            <Tag color="red" style={{ marginLeft: 8 }}>Inactif</Tag>
          )}
        </Space>
        <Space>
          <Button icon={<EditOutlined />}>Modifier</Button>
          <Button icon={<DeleteOutlined />} danger>Supprimer</Button>
        </Space>
      </div>

      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={8}>
          <Card>
            <Statistic
              title="Solde du compte"
              value={displayedAccount.balance}
              precision={2}
              valueStyle={{ 
                color: displayedAccount.balance > 0 ? '#3f8600' : 
                  displayedAccount.balance < 0 ? '#cf1322' : 'inherit' 
              }}
              suffix="MAD"
            />
            <Divider style={{ margin: '12px 0' }} />
            <Space>
              <Text>Type:</Text>
              <Text strong>{displayedAccount.type_name}</Text>
            </Space>
          </Card>
        </Col>
        <Col span={16}>
          <Card>
            <Descriptions title="Informations du compte" bordered size="small" column={2}>
              <Descriptions.Item label="Code">{displayedAccount.code}</Descriptions.Item>
              <Descriptions.Item label="Type">{displayedAccount.type_name}</Descriptions.Item>
              <Descriptions.Item label="Compte parent">
                {displayedAccount.parent_name ? 
                  `${displayedAccount.parent_name} (${displayedAccount.parent_code})` : 
                  'Aucun'}
              </Descriptions.Item>
              <Descriptions.Item label="Lettrable">
                {displayedAccount.is_reconcilable ? 
                  <Tag color="blue">Oui</Tag> : 
                  <Tag color="default">Non</Tag>}
              </Descriptions.Item>
              {displayedAccount.is_tax_account && (
                <>
                  <Descriptions.Item label="Type de taxe">
                    {displayedAccount.tax_type === 'vat_collected' ? 'TVA collectée' :
                     displayedAccount.tax_type === 'vat_deductible' ? 'TVA déductible' :
                     displayedAccount.tax_type === 'vat_import' ? 'TVA à l\'importation' :
                     displayedAccount.tax_type}
                  </Descriptions.Item>
                  <Descriptions.Item label="Taux de taxe">
                    {displayedAccount.tax_rate ? `${displayedAccount.tax_rate}%` : 'N/A'}
                  </Descriptions.Item>
                </>
              )}
              <Descriptions.Item label="Description" span={2}>
                {displayedAccount.description || 'Aucune description'}
              </Descriptions.Item>
            </Descriptions>
          </Card>
        </Col>
      </Row>

      <Card>
        <Tabs defaultActiveKey="1">
          <TabPane 
            tab={
              <span>
                <HistoryOutlined />
                Mouvements
              </span>
            } 
            key="1"
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
              <Title level={4}>Écritures comptables</Title>
              <RangePicker 
                value={dateRange}
                onChange={handleDateRangeChange}
                format="DD/MM/YYYY"
              />
            </div>
            <Table 
              columns={entriesColumns} 
              dataSource={entries.length > 0 ? entries : demoEntries}
              rowKey="id"
              pagination={{ pageSize: 10 }}
              summary={pageData => {
                let totalDebit = 0;
                let totalCredit = 0;
                
                pageData.forEach(({ debit, credit }) => {
                  totalDebit += parseFloat(debit || 0);
                  totalCredit += parseFloat(credit || 0);
                });
                
                const balanceDebitCredit = totalDebit - totalCredit;
                
                return (
                  <>
                    <Table.Summary.Row>
                      <Table.Summary.Cell index={0} colSpan={5}><strong>Total</strong></Table.Summary.Cell>
                      <Table.Summary.Cell index={5} align="right">
                        <strong>{totalDebit.toFixed(2)}</strong>
                      </Table.Summary.Cell>
                      <Table.Summary.Cell index={6} align="right">
                        <strong>{totalCredit.toFixed(2)}</strong>
                      </Table.Summary.Cell>
                      <Table.Summary.Cell index={7}></Table.Summary.Cell>
                    </Table.Summary.Row>
                    <Table.Summary.Row>
                      <Table.Summary.Cell index={0} colSpan={5}><strong>Solde (Débit - Crédit)</strong></Table.Summary.Cell>
                      <Table.Summary.Cell 
                        index={5} 
                        colSpan={3} 
                        align="right"
                        style={{ color: balanceDebitCredit > 0 ? '#3f8600' : balanceDebitCredit < 0 ? '#cf1322' : 'inherit' }}
                      >
                        <strong>{balanceDebitCredit.toFixed(2)}</strong>
                      </Table.Summary.Cell>
                    </Table.Summary.Row>
                  </>
                );
              }}
            />
          </TabPane>
          
          {displayedAccount.is_reconcilable && (
            <TabPane 
              tab={
                <span>
                  <FileTextOutlined />
                  Rapprochements
                </span>
              } 
              key="2"
            >
              <div style={{ textAlign: 'center', padding: '40px 0' }}>
                <p>Fonctionnalité de rapprochement en cours de développement</p>
                <Button type="primary">Lettrer les écritures</Button>
              </div>
            </TabPane>
          )}

          <TabPane 
            tab={
              <span>
                <BarChartOutlined />
                Analyse
              </span>
            } 
            key="3"
          >
            <div style={{ textAlign: 'center', padding: '40px 0' }}>
              <p>Fonctionnalité d'analyse graphique en cours de développement</p>
            </div>
          </TabPane>
        </Tabs>
      </Card>
    </div>
  );
};

export default AccountDetail;
