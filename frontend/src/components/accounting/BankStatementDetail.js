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
  Dropdown,
  message
} from 'antd';
import {
  EditOutlined,
  DeleteOutlined,
  CheckOutlined,
  ExclamationCircleOutlined,
  BankOutlined,
  SearchOutlined,
  UploadOutlined,
  ThunderboltOutlined,
  FilePdfOutlined,
  DownOutlined
} from '@ant-design/icons';
import { handleApiError } from '../../utils/apiUtils';
import axios from '../../utils/axiosConfig';
import moment from 'moment';
import { useCurrency } from '../../context/CurrencyContext';
import OFXImportModal from './OFXImportModal';
import PDFImportModal from './PDFImportModal';
import ReconciliationModal from './ReconciliationModal';

const { Title, Text } = Typography;
const { confirm } = Modal;

const BankStatementDetail = () => {
  const { currencySymbol, currencyCode } = useCurrency();
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState(null);
  const [statement, setStatement] = useState(null);
  const [reconciledCount, setReconciledCount] = useState(0);
  const [showReconcileModal, setShowReconcileModal] = useState(false);
  const [selectedLine, setSelectedLine] = useState(null);
  const [showOFXModal, setShowOFXModal] = useState(false);
  const [showPDFModal, setShowPDFModal] = useState(false);
  const [autoReconciling, setAutoReconciling] = useState(false);

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
      if (statementData.lines) {
        const reconciled = statementData.lines.filter(line => line.is_reconciled).length;
        setReconciledCount(reconciled);
      }
    } catch (error) {
      console.error('Erreur lors de la récupération des détails du relevé:', error);
      setError('Impossible de charger les détails du relevé. Veuillez réessayer plus tard.');
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
          handleApiError(error, null, 'Erreur lors de la suppression du relevé.');
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
      handleApiError(error, null, 'Erreur lors de la confirmation du relevé.');
    } finally {
      setConfirming(false);
    }
  };

  const openReconcileModal = (lineId) => {
    const line = statement.lines.find(l => l.id === lineId);
    if (line) {
      setSelectedLine(line);
      setShowReconcileModal(true);
    }
  };

  const handleReconcileLine = () => {
    message.success('Ligne rapprochée avec succès.');
    setShowReconcileModal(false);
    fetchStatementDetails();
  };

  const handleAutoReconcile = async () => {
    setAutoReconciling(true);
    try {
      const response = await axios.post(`/api/accounting/bank-statements/${id}/auto_reconcile/`);
      if (response.data.success) {
        message.success(response.data.message);
        fetchStatementDetails();
      } else {
        message.error(response.data.message);
      }
    } catch (error) {
      handleApiError(error, null, 'Erreur lors du rapprochement automatique.');
    } finally {
      setAutoReconciling(false);
    }
  };

  const handleUnreconcileLine = async (lineId) => {
    try {
      const response = await axios.post(
        `/api/accounting/bank-statements/${id}/lines/${lineId}/unreconcile/`
      );
      if (response.data.success) {
        message.success('Rapprochement annulé');
        fetchStatementDetails();
      }
    } catch (error) {
      handleApiError(error, null, "Erreur lors de l'annulation du rapprochement.");
    }
  };

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
      render: (text) => text || '-',
    },
    {
      title: 'Montant',
      dataIndex: 'amount',
      key: 'amount',
      align: 'right',
      render: (text) => (
        <span style={{ color: parseFloat(text) >= 0 ? '#3f8600' : '#cf1322' }}>
          {parseFloat(text).toFixed(2)} {currencyCode}
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
          <Space>
            <Badge status="success" text="Rapproché" />
            {displayedStatement && displayedStatement.state !== 'confirm' && (
              <Button type="link" size="small" danger onClick={() => handleUnreconcileLine(record.id)}>
                Annuler
              </Button>
            )}
          </Space>
        ) : (
          <Button type="link" size="small" icon={<SearchOutlined />} onClick={() => openReconcileModal(record.id)}>
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

  const displayedStatement = statement;
  if (!displayedStatement) return null;

  const totalLines = displayedStatement.lines ? displayedStatement.lines.length : 0;
  const reconcilePercentage = totalLines > 0 ? (reconciledCount / totalLines) * 100 : 0;
  const difference = displayedStatement.balance_end - displayedStatement.balance_end_real;
  const isBalanced = Math.abs(difference) < 0.01;

  // Menu dropdown import
  const importMenuItems = [
    {
      key: 'ofx',
      label: 'Importer OFX',
      icon: <UploadOutlined />,
      onClick: () => setShowOFXModal(true),
    },
    {
      key: 'pdf',
      label: 'Importer PDF',
      icon: <FilePdfOutlined />,
      onClick: () => setShowPDFModal(true),
    },
  ];

  return (
    <div className="bank-statement-detail">
      {/* En-tête */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <Title level={2} style={{ marginBottom: 8 }}>
            Relevé bancaire : {displayedStatement.name}
          </Title>
          <Space>
            {getStateTag(displayedStatement.state)}
            <Tag icon={<BankOutlined />} color="blue">
              {displayedStatement.journal_code} - {displayedStatement.journal_name}
            </Tag>
          </Space>
        </div>

        {/* Barre d'actions — compacte */}
        <Space wrap size={8}>
          {displayedStatement.state === 'draft' && (
            <>
              {/* Import groupé dans un dropdown */}
              <Dropdown menu={{ items: importMenuItems }} trigger={['click']}>
                <Button icon={<UploadOutlined />}>
                  Importer <DownOutlined />
                </Button>
              </Dropdown>

              {/* Rapprochement auto */}
              <Button
                icon={<ThunderboltOutlined />}
                onClick={handleAutoReconcile}
                loading={autoReconciling}
                style={{ backgroundColor: '#722ed1', borderColor: '#722ed1', color: '#fff' }}
              >
                Rappr. auto
              </Button>

              {/* Modifier */}
              <Link to={`/accounting/bank-statements/${id}/edit`}>
                <Button icon={<EditOutlined />}>Modifier</Button>
              </Link>

              {/* Supprimer */}
              <Popconfirm
                title="Supprimer ce relevé ?"
                onConfirm={handleDeleteStatement}
                okText="Oui"
                cancelText="Non"
              >
                <Button icon={<DeleteOutlined />} danger>Supprimer</Button>
              </Popconfirm>

              {/* Confirmer */}
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

          {/* Télécharger PDF source — visible si disponible */}
          {displayedStatement.source_pdf_url && (
            <Button
              icon={<FilePdfOutlined style={{ color: '#ff4d4f' }} />}
              href={displayedStatement.source_pdf_url}
              target="_blank"
            >
              PDF
            </Button>
          )}

          <Button onClick={() => navigate('/accounting/bank-statements')}>
            Retour
          </Button>
        </Space>
      </div>

      {/* Statistiques */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={8}>
          <Card>
            <Statistic
              title="État du rapprochement"
              value={reconciledCount}
              suffix={`/ ${totalLines} lignes`}
            />
            <Divider style={{ margin: '12px 0' }} />
            <Progress percent={parseFloat(reconcilePercentage.toFixed(0))} />
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
                  suffix={currencyCode}
                />
              </Col>
              <Col span={8}>
                <Statistic
                  title="Solde final calculé"
                  value={displayedStatement.balance_end}
                  precision={2}
                  suffix={currencyCode}
                />
              </Col>
              <Col span={8}>
                <Statistic
                  title="Solde final réel"
                  value={displayedStatement.balance_end_real}
                  precision={2}
                  suffix={currencyCode}
                  valueStyle={{ color: isBalanced ? '#3f8600' : '#cf1322' }}
                />
              </Col>
            </Row>
            {!isBalanced && (
              <Alert
                message={`Différence de ${Math.abs(difference).toFixed(2)} ${currencyCode} entre le solde calculé et le solde réel`}
                type="warning"
                showIcon
                style={{ marginTop: 16 }}
              />
            )}
          </Card>
        </Col>
      </Row>

      {/* Informations */}
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

      {/* Lignes */}
      <Card title="Lignes du relevé">
        <Table
          columns={columns}
          dataSource={displayedStatement.lines}
          rowKey="id"
          pagination={false}
          size="middle"
          summary={pageData => {
            let totalAmount = 0;
            pageData.forEach(({ amount }) => { totalAmount += parseFloat(amount || 0); });
            return (
              <Table.Summary.Row>
                <Table.Summary.Cell index={0} colSpan={4}><strong>Total</strong></Table.Summary.Cell>
                <Table.Summary.Cell index={4} align="right">
                  <strong style={{ color: totalAmount >= 0 ? '#3f8600' : '#cf1322' }}>
                    {totalAmount.toFixed(2)} {currencyCode}
                  </strong>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={5} />
              </Table.Summary.Row>
            );
          }}
        />
      </Card>

      {/* Modals */}
      <ReconciliationModal
        visible={showReconcileModal}
        statementId={id}
        line={selectedLine}
        onClose={() => setShowReconcileModal(false)}
        onSuccess={() => { setShowReconcileModal(false); fetchStatementDetails(); }}
      />
      <OFXImportModal
        visible={showOFXModal}
        statementId={id}
        onClose={() => setShowOFXModal(false)}
        onSuccess={() => { setShowOFXModal(false); fetchStatementDetails(); }}
      />
      <PDFImportModal
        visible={showPDFModal}
        statementId={id}
        onClose={() => setShowPDFModal(false)}
        onSuccess={() => { setShowPDFModal(false); fetchStatementDetails(); }}
      />
    </div>
  );
};

export default BankStatementDetail;
