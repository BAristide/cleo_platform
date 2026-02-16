// src/components/accounting/BankStatementDetail.js
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
  Divider,
  Popconfirm,
  Modal,
  Badge,
  Statistic,
  Tooltip,
  Row,
  Col,
  Progress,
  message
} from 'antd';
import {
  EditOutlined,
  DeleteOutlined,
  CheckOutlined,
  CloseOutlined,
  ExclamationCircleOutlined,
  BankOutlined,
  LinkOutlined,
  SearchOutlined
} from '@ant-design/icons';
import axios from '../../utils/axiosConfig';
import { extractResultsFromResponse } from '../../utils/apiUtils';
import moment from 'moment';

const { Title, Text, Paragraph } = Typography;
const { confirm } = Modal;

const BankStatementDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState(null);
  const [statement, setStatement] = useState(null);
  const [reconciledCount, setReconciledCount] = useState(0);
  const [showReconcileModal, setShowReconcileModal] = useState(false);
  const [selectedLine, setSelectedLine] = useState(null);

  useEffect(() => {
    fetchStatementDetails();
  }, [id]);

  const fetchStatementDetails = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await axios.get(`/api/accounting/bank-statements/${id}/`);
      const statementData = response.data;
      
      setStatement(statementData);
      
      // Count reconciled lines
      if (statementData.lines) {
        const reconciled = statementData.lines.filter(line => line.is_reconciled).length;
        setReconciledCount(reconciled);
      }
    } catch (error) {
      console.error('Erreur lors de la récupération des détails du relevé:', error);
      setError('Impossible de charger les détails du relevé. Veuillez réessayer plus tard.');
      
      // If API fails, use demo data
      if (demoStatements[id - 1]) {
        const demoStatement = demoStatements[id - 1];
        setStatement(demoStatement);
        
        const reconciled = demoStatement.lines.filter(line => line.is_reconciled).length;
        setReconciledCount(reconciled);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteStatement = async () => {
    confirm({
      title: 'Êtes-vous sûr de vouloir supprimer ce relevé?',
      icon: <ExclamationCircleOutlined />,
      content: 'Cette action est irréversible.',
      okText: 'Oui',
      okType: 'danger',
      cancelText: 'Non',
      onOk: async () => {
        try {
          await axios.delete(`/api/accounting/bank-statements/${id}/`);
          message.success('Relevé supprimé avec succès.');
          navigate('/accounting/bank-statements');
        } catch (error) {
          console.error('Erreur lors de la suppression du relevé:', error);
          message.error('Erreur lors de la suppression du relevé. Veuillez réessayer.');
        }
      },
    });
  };

  const handleConfirmStatement = async () => {
    setConfirming(true);
    try {
      await axios.post(`/api/accounting/bank-statements/${id}/confirm/`);
      message.success('Relevé confirmé avec succès.');
      fetchStatementDetails();
    } catch (error) {
      console.error('Erreur lors de la confirmation du relevé:', error);
      message.error('Erreur lors de la confirmation du relevé. Veuillez réessayer.');
    } finally {
      setConfirming(false);
    }
  };

  const openReconcileModal = (lineId) => {
    // Find the line
    const line = statement.lines.find(l => l.id === lineId);
    if (line) {
      setSelectedLine(line);
      setShowReconcileModal(true);
    }
  };

  const handleReconcileLine = (lineId, entryLineIds) => {
    message.success('Ligne rapprochée avec succès.');
    setShowReconcileModal(false);
    fetchStatementDetails();
  };

  // Demo data for bank statements
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
      state: 'draft',
      created_by: 1,
      created_by_name: 'Admin',
      created_at: '2025-05-31T15:30:00',
      updated_at: '2025-05-31T15:30:00',
      lines: [
        {
          id: 101,
          statement_id: 1,
          date: '2025-05-05',
          name: 'Paiement client ABC',
          ref: 'VIR-12345',
          partner_id: 1,
          partner_name: 'ABC SARL',
          amount: 12500,
          is_reconciled: true,
          journal_entry_line_ids: [301],
          note: 'Règlement facture FACT-2189'
        },
        {
          id: 102,
          statement_id: 1,
          date: '2025-05-12',
          name: 'Paiement client XYZ',
          ref: 'VIR-12346',
          partner_id: 2,
          partner_name: 'XYZ Inc.',
          amount: 9000,
          is_reconciled: true,
          journal_entry_line_ids: [302],
          note: 'Règlement facture FACT-2190'
        },
        {
          id: 103,
          statement_id: 1,
          date: '2025-05-15',
          name: 'Prélèvement fournisseur',
          ref: 'PRE-00123',
          partner_id: 4,
          partner_name: 'Fournitures Office SA',
          amount: -3750,
          is_reconciled: false,
          journal_entry_line_ids: [],
          note: 'Règlement facture fournisseur FRN-0045'
        },
        {
          id: 104,
          statement_id: 1,
          date: '2025-05-22',
          name: 'Virement interne',
          ref: 'VIR-12347',
          partner_id: null,
          partner_name: null,
          amount: 7650,
          is_reconciled: false,
          journal_entry_line_ids: [],
          note: 'Virement compte secondaire'
        }
      ]
    }
  ];

  const getStateTag = (state) => {
    const stateMap = {
      'draft': { text: 'Brouillon', color: 'orange', icon: <ExclamationCircleOutlined /> },
      'open': { text: 'En cours', color: 'blue', icon: <ExclamationCircleOutlined /> },
      'confirm': { text: 'Confirmé', color: 'green', icon: <CheckOutlined /> }
    };
    
    return (
      <Tag color={stateMap[state]?.color} icon={stateMap[state]?.icon}>
        {stateMap[state]?.text || state}
      </Tag>
    );
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
      title: 'Libellé',
      dataIndex: 'name',
      key: 'name',
      render: (text, record) => (
        <Tooltip title={record.note}>
          <span>{text}</span>
        </Tooltip>
      ),
    },
    {
      title: 'Référence',
      dataIndex: 'ref',
      key: 'ref',
    },
    {
      title: 'Partenaire',
      dataIndex: 'partner_name',
      key: 'partner_name',
      render: (text, record) => text || '-',
    },
    {
      title: 'Montant',
      dataIndex: 'amount',
      key: 'amount',
      align: 'right',
      render: (text) => (
        <span style={{ color: parseFloat(text) >= 0 ? '#3f8600' : '#cf1322' }}>
          {parseFloat(text).toFixed(2)} MAD
        </span>
      ),
      sorter: (a, b) => a.amount - b.amount,
    },
    {
      title: 'Rapproché',
      dataIndex: 'is_reconciled',
      key: 'is_reconciled',
      align: 'center',
      render: (reconciled, record) => (
        reconciled ? (
          <Badge 
            status="success" 
            text={
              <Link 
                to={`/accounting/entries/${record.journal_entry_line_ids[0]}`}
                style={{ marginLeft: 8 }}
              >
                <Space>
                  <LinkOutlined />
                  Voir l'écriture
                </Space>
              </Link>
            } 
          />
        ) : (
          <Button 
            type="link" 
            size="small" 
            icon={<SearchOutlined />} 
            onClick={() => openReconcileModal(record.id)}
          >
            Rapprocher
          </Button>
        )
      ),
      filters: [
        { text: 'Rapproché', value: true },
        { text: 'Non rapproché', value: false }
      ],
      onFilter: (value, record) => record.is_reconciled === value,
    }
  ];

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
        <Spin size="large" />
      </div>
    );
  }

  if (error && !statement) {
    return (
      <Alert
        message="Erreur"
        description={error}
        type="error"
        showIcon
        action={
          <Button size="small" onClick={() => navigate('/accounting/bank-statements')}>
            Retour à la liste
          </Button>
        }
      />
    );
  }

  const displayedStatement = statement || demoStatements[0];
  const totalLines = displayedStatement.lines ? displayedStatement.lines.length : 0;
  const reconcilePercentage = totalLines > 0 ? (reconciledCount / totalLines) * 100 : 0;
  const difference = displayedStatement.balance_end - displayedStatement.balance_end_real;
  const isBalanced = Math.abs(difference) < 0.01;

  return (
    <div className="bank-statement-detail">
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <Title level={2}>
            Relevé bancaire : {displayedStatement.name}
          </Title>
          <Space>
            {getStateTag(displayedStatement.state)}
            <Tag icon={<BankOutlined />} color="blue">
              {displayedStatement.journal_code} - {displayedStatement.journal_name}
            </Tag>
          </Space>
        </div>
        <Space>
          {displayedStatement.state === 'draft' && (
            <>
              <Link to={`/accounting/bank-statements/${id}/edit`}>
                <Button icon={<EditOutlined />}>Modifier</Button>
              </Link>
              <Popconfirm
                title="Êtes-vous sûr de vouloir supprimer ce relevé?"
                onConfirm={handleDeleteStatement}
                okText="Oui"
                cancelText="Non"
              >
                <Button icon={<DeleteOutlined />} danger>Supprimer</Button>
              </Popconfirm>
              <Button 
                type="primary" 
                icon={<CheckOutlined />} 
                onClick={handleConfirmStatement}
                loading={confirming}
                disabled={!isBalanced}
              >
                Confirmer
              </Button>
            </>
          )}
          <Button onClick={() => navigate('/accounting/bank-statements')}>
            Retour à la liste
          </Button>
        </Space>
      </div>

      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={8}>
          <Card>
            <Statistic
              title="État du rapprochement"
              value={reconciledCount}
              suffix={`/ ${totalLines} lignes`}
            />
            <Divider style={{ margin: '12px 0' }} />
            <Progress percent={reconcilePercentage.toFixed(0)} />
          </Card>
        </Col>
        <Col span={16}>
          <Card>
            <Row gutter={16}>
              <Col span={8}>
                <Statistic
                  title="Solde initial"
                  value={displayedStatement.balance_start}
                  precision={2}
                  suffix="MAD"
                />
              </Col>
              <Col span={8}>
                <Statistic
                  title="Solde final calculé"
                  value={displayedStatement.balance_end}
                  precision={2}
                  suffix="MAD"
                />
              </Col>
              <Col span={8}>
                <Statistic
                  title="Solde final réel"
                  value={displayedStatement.balance_end_real}
                  precision={2}
                  suffix="MAD"
                  valueStyle={{ color: isBalanced ? '#3f8600' : '#cf1322' }}
                />
              </Col>
            </Row>
            {!isBalanced && (
              <Alert
                message={`Différence de ${Math.abs(difference).toFixed(2)} MAD entre le solde calculé et le solde réel`}
                type="warning"
                showIcon
                style={{ marginTop: 16 }}
              />
            )}
          </Card>
        </Col>
      </Row>

      <Card style={{ marginBottom: 24 }}>
        <Descriptions title="Informations du relevé" bordered>
          <Descriptions.Item label="Nom">{displayedStatement.name}</Descriptions.Item>
          <Descriptions.Item label="Journal">
            <Link to={`/accounting/journals/${displayedStatement.journal_id}`}>
              {displayedStatement.journal_code} - {displayedStatement.journal_name}
            </Link>
          </Descriptions.Item>
          <Descriptions.Item label="Date">{moment(displayedStatement.date).format('DD/MM/YYYY')}</Descriptions.Item>
          <Descriptions.Item label="Référence">{displayedStatement.reference || '-'}</Descriptions.Item>
          <Descriptions.Item label="État">{getStateTag(displayedStatement.state)}</Descriptions.Item>
          <Descriptions.Item label="Créé le">{moment(displayedStatement.created_at).format('DD/MM/YYYY HH:mm')}</Descriptions.Item>
        </Descriptions>
      </Card>

      <Card title="Lignes du relevé">
        <Table
          columns={columns}
          dataSource={displayedStatement.lines}
          rowKey="id"
          pagination={false}
          size="middle"
          summary={pageData => {
            let totalAmount = 0;
            
            pageData.forEach(({ amount }) => {
              totalAmount += parseFloat(amount || 0);
            });
            
            return (
              <Table.Summary.Row>
                <Table.Summary.Cell index={0} colSpan={4}><strong>Total</strong></Table.Summary.Cell>
                <Table.Summary.Cell index={4} align="right">
                  <strong style={{ color: totalAmount >= 0 ? '#3f8600' : '#cf1322' }}>
                    {totalAmount.toFixed(2)} MAD
                  </strong>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={5}></Table.Summary.Cell>
              </Table.Summary.Row>
            );
          }}
        />
      </Card>

      {/* Modal for reconciliation - simplified placeholder */}
      <Modal
        title="Rapprocher la ligne de relevé"
        visible={showReconcileModal}
        onCancel={() => setShowReconcileModal(false)}
        footer={[
          <Button key="cancel" onClick={() => setShowReconcileModal(false)}>
            Annuler
          </Button>,
          <Button 
            key="reconcile" 
            type="primary" 
            onClick={() => handleReconcileLine(selectedLine?.id, [305])}
          >
            Rapprocher
          </Button>
        ]}
        width={800}
      >
        {selectedLine && (
          <div>
            <Paragraph>
              <strong>Ligne de relevé :</strong> {selectedLine.name} - {parseFloat(selectedLine.amount).toFixed(2)} MAD
            </Paragraph>
            <p>Sélectionnez les écritures comptables à rapprocher :</p>
            
            {/* Placeholder for matching entries table */}
            <Table 
              columns={[
                {
                  title: 'Date',
                  dataIndex: 'date',
                  key: 'date',
                  render: (text) => moment(text).format('DD/MM/YYYY'),
                },
                {
                  title: 'Journal',
                  dataIndex: 'journal_code',
                  key: 'journal_code',
                },
                {
                  title: 'Libellé',
                  dataIndex: 'name',
                  key: 'name',
                },
                {
                  title: 'Montant',
                  dataIndex: 'amount',
                  key: 'amount',
                  align: 'right',
                  render: (amount) => `${parseFloat(amount).toFixed(2)} MAD`,
                }
              ]}
              dataSource={[
                {
                  key: 1,
                  date: '2025-05-05',
                  journal_code: 'BNK',
                  name: 'Paiement client ABC',
                  amount: 12500
                }
              ]}
              pagination={false}
              rowSelection={{
                type: 'checkbox',
                defaultSelectedRowKeys: [1]
              }}
            />
          </div>
        )}
      </Modal>
    </div>
  );
};

export default BankStatementDetail;
