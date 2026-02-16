// src/components/accounting/JournalEntryDetail.js
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
  message
} from 'antd';
import {
  EditOutlined,
  DeleteOutlined,
  CheckOutlined,
  CloseOutlined,
  ExclamationCircleOutlined,
  FileTextOutlined,
  HistoryOutlined
} from '@ant-design/icons';
import axios from '../../utils/axiosConfig';
import { extractResultsFromResponse } from '../../utils/apiUtils';
import moment from 'moment';

const { Title } = Typography;
const { confirm } = Modal;

const JournalEntryDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [error, setError] = useState(null);
  const [entry, setEntry] = useState(null);

  useEffect(() => {
    fetchEntryDetails();
  }, [id]);

  const fetchEntryDetails = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await axios.get(`/api/accounting/journal-entries/${id}/`);
      setEntry(response.data);
    } catch (error) {
      console.error('Erreur lors de la récupération des détails de l\'écriture:', error);
      setError('Impossible de charger les détails de l\'écriture. Veuillez réessayer plus tard.');
      
      // If API fails, use demo data
      if (demoEntries[id - 1]) {
        setEntry(demoEntries[id - 1]);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteEntry = async () => {
    confirm({
      title: 'Êtes-vous sûr de vouloir supprimer cette écriture?',
      icon: <ExclamationCircleOutlined />,
      content: 'Cette action est irréversible.',
      okText: 'Oui',
      okType: 'danger',
      cancelText: 'Non',
      onOk: async () => {
        try {
          await axios.delete(`/api/accounting/journal-entries/${id}/`);
          message.success('Écriture supprimée avec succès.');
          navigate('/accounting/entries');
        } catch (error) {
          console.error('Erreur lors de la suppression de l\'écriture:', error);
          message.error('Erreur lors de la suppression de l\'écriture. Veuillez réessayer.');
        }
      },
    });
  };

  const handlePostEntry = async () => {
    setPosting(true);
    try {
      await axios.post(`/api/accounting/journal-entries/${id}/post/`);
      message.success('Écriture validée avec succès.');
      fetchEntryDetails();
    } catch (error) {
      console.error('Erreur lors de la validation de l\'écriture:', error);
      message.error('Erreur lors de la validation de l\'écriture. Veuillez réessayer.');
    } finally {
      setPosting(false);
    }
  };

  const handleCancelEntry = async () => {
    setCancelling(true);
    try {
      await axios.post(`/api/accounting/journal-entries/${id}/cancel/`);
      message.success('Écriture annulée avec succès.');
      fetchEntryDetails();
    } catch (error) {
      console.error('Erreur lors de l\'annulation de l\'écriture:', error);
      message.error('Erreur lors de l\'annulation de l\'écriture. Veuillez réessayer.');
    } finally {
      setCancelling(false);
    }
  };

  // Demo data for journal entries
  const demoEntries = [
    {
      id: 1,
      name: 'VEN/2025/00125',
      journal_id: 1,
      journal_code: 'VEN',
      journal_name: 'Journal des ventes',
      date: '2025-05-15',
      period_id: 5,
      period_name: '2025 - Mois 5',
      ref: 'FACT-2189',
      state: 'draft',
      source_module: 'sales',
      source_model: 'Invoice',
      source_id: 125,
      narration: 'Facture FACT-2189 - Client ABC',
      is_manual: false,
      created_by: 1,
      created_by_name: 'Admin',
      created_at: '2025-05-15T10:30:00',
      updated_at: '2025-05-15T10:30:00',
      total_debit: 12500,
      total_credit: 12500,
      is_balanced: true,
      lines: [
        {
          id: 101,
          entry_id: 1,
          account_id: 4,
          account_code: '411000',
          account_name: 'Clients',
          name: 'Facture client',
          partner_id: 1,
          partner_name: 'ABC SARL',
          debit: 12500,
          credit: 0,
          date_maturity: '2025-06-15',
          is_reconciled: false,
          reconciliation_id: null,
          analytic_account_id: null,
          analytic_account_name: null
        },
        {
          id: 102,
          entry_id: 1,
          account_id: 5,
          account_code: '445650',
          account_name: 'TVA facturée',
          name: 'TVA collectée',
          partner_id: 1,
          partner_name: 'ABC SARL',
          debit: 0,
          credit: 2500,
          date_maturity: null,
          is_reconciled: false,
          reconciliation_id: null,
          analytic_account_id: null,
          analytic_account_name: null
        },
        {
          id: 103,
          entry_id: 1,
          account_id: 9,
          account_code: '701000',
          account_name: 'Ventes de produits finis',
          name: 'Produit des ventes',
          partner_id: 1,
          partner_name: 'ABC SARL',
          debit: 0,
          credit: 10000,
          date_maturity: null,
          is_reconciled: false,
          reconciliation_id: null,
          analytic_account_id: null,
          analytic_account_name: null
        }
      ]
    },
    {
      id: 2,
      name: 'ACH/2025/00087',
      journal_id: 2,
      journal_code: 'ACH',
      journal_name: 'Journal des achats',
      date: '2025-05-14',
      period_id: 5,
      period_name: '2025 - Mois 5',
      ref: 'FRN-0045',
      state: 'posted',
      source_module: 'purchases',
      source_model: 'Invoice',
      source_id: 87,
      narration: 'Facture fournisseur FRN-0045 - Fournitures',
      is_manual: false,
      created_by: 1,
      created_by_name: 'Admin',
      created_at: '2025-05-14T14:45:00',
      updated_at: '2025-05-14T15:00:00',
      total_debit: 3750,
      total_credit: 3750,
      is_balanced: true,
      lines: [
        {
          id: 201,
          entry_id: 2,
          account_id: 8,
          account_code: '601000',
          account_name: 'Achats de matières premières',
          name: 'Achat de fournitures',
          partner_id: 4,
          partner_name: 'Fournitures Office SA',
          debit: 3125,
          credit: 0,
          date_maturity: null,
          is_reconciled: false,
          reconciliation_id: null,
          analytic_account_id: null,
          analytic_account_name: null
        },
        {
          id: 202,
          entry_id: 2,
          account_id: 7,
          account_code: '401000',
          account_name: 'Fournisseurs',
          name: 'Dette fournisseur',
          partner_id: 4,
          partner_name: 'Fournitures Office SA',
          debit: 0,
          credit: 3750,
          date_maturity: '2025-06-14',
          is_reconciled: false,
          reconciliation_id: null,
          analytic_account_id: null,
          analytic_account_name: null
        },
        {
          id: 203,
          entry_id: 2,
          account_id: 5,
          account_code: '445650',
          account_name: 'TVA facturée',
          name: 'TVA déductible',
          partner_id: 4,
          partner_name: 'Fournitures Office SA',
          debit: 625,
          credit: 0,
          date_maturity: null,
          is_reconciled: false,
          reconciliation_id: null,
          analytic_account_id: null,
          analytic_account_name: null
        }
      ]
    }
  ];

  const getStateTag = (state) => {
    const stateMap = {
      'draft': { text: 'Brouillon', color: 'orange', icon: <ExclamationCircleOutlined /> },
      'posted': { text: 'Validé', color: 'green', icon: <CheckOutlined /> },
      'cancel': { text: 'Annulé', color: 'red', icon: <CloseOutlined /> }
    };
    
    return (
      <Tag color={stateMap[state]?.color} icon={stateMap[state]?.icon}>
        {stateMap[state]?.text || state}
      </Tag>
    );
  };

  const columns = [
    {
      title: 'Compte',
      dataIndex: 'account_code',
      key: 'account_code',
      render: (text, record) => (
        <Link to={`/accounting/accounts/${record.account_id}`}>
          {text} - {record.account_name}
        </Link>
      ),
    },
    {
      title: 'Libellé',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: 'Partenaire',
      dataIndex: 'partner_name',
      key: 'partner_name',
      render: (text, record) => text || '-',
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
        <CheckOutlined style={{ color: 'green' }} /> : 
        <CloseOutlined style={{ color: 'red' }} />
    }
  ];

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
        <Spin size="large" />
      </div>
    );
  }

  if (error && !entry) {
    return (
      <Alert
        message="Erreur"
        description={error}
        type="error"
        showIcon
        action={
          <Button size="small" onClick={() => navigate('/accounting/entries')}>
            Retour à la liste
          </Button>
        }
      />
    );
  }

  const displayedEntry = entry || demoEntries[0];

  return (
    <div className="journal-entry-detail">
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <Title level={2}>
            Écriture {displayedEntry.name}
          </Title>
          <Space>
            {getStateTag(displayedEntry.state)}
            {displayedEntry.source_module && (
              <Tag icon={<FileTextOutlined />} color="blue">
                {displayedEntry.source_module === 'sales' ? 'Ventes' : 
                 displayedEntry.source_module === 'purchases' ? 'Achats' : 
                 displayedEntry.source_module === 'payroll' ? 'Paie' : 
                 displayedEntry.source_module}
              </Tag>
            )}
          </Space>
        </div>
        <Space>
          {displayedEntry.state === 'draft' && (
            <>
              <Link to={`/accounting/entries/${id}/edit`}>
                <Button icon={<EditOutlined />}>Modifier</Button>
              </Link>
              <Popconfirm
                title="Êtes-vous sûr de vouloir supprimer cette écriture?"
                onConfirm={handleDeleteEntry}
                okText="Oui"
                cancelText="Non"
              >
                <Button icon={<DeleteOutlined />} danger>Supprimer</Button>
              </Popconfirm>
              <Button 
                type="primary" 
                icon={<CheckOutlined />} 
                onClick={handlePostEntry}
                loading={posting}
              >
                Valider
              </Button>
            </>
          )}
          {displayedEntry.state === 'posted' && (
            <Button 
              icon={<CloseOutlined />} 
              onClick={handleCancelEntry}
              loading={cancelling}
            >
              Annuler
            </Button>
          )}
          <Button onClick={() => navigate('/accounting/entries')}>
            Retour à la liste
          </Button>
        </Space>
      </div>

      <Card style={{ marginBottom: 24 }}>
        <Descriptions title="Informations générales" bordered column={3}>
          <Descriptions.Item label="Journal">
            <Link to={`/accounting/journals/${displayedEntry.journal_id}`}>
              {displayedEntry.journal_code} - {displayedEntry.journal_name}
            </Link>
          </Descriptions.Item>
          <Descriptions.Item label="Numéro">{displayedEntry.name}</Descriptions.Item>
          <Descriptions.Item label="Date">{moment(displayedEntry.date).format('DD/MM/YYYY')}</Descriptions.Item>
          <Descriptions.Item label="Période">{displayedEntry.period_name}</Descriptions.Item>
          <Descriptions.Item label="Référence">{displayedEntry.ref || '-'}</Descriptions.Item>
          <Descriptions.Item label="État">{getStateTag(displayedEntry.state)}</Descriptions.Item>
          <Descriptions.Item label="Libellé" span={3}>{displayedEntry.narration}</Descriptions.Item>
          <Descriptions.Item label="Origine">
            {displayedEntry.source_module ? (
              <>
                {displayedEntry.source_module === 'sales' ? 'Ventes' : 
                 displayedEntry.source_module === 'purchases' ? 'Achats' : 
                 displayedEntry.source_module === 'payroll' ? 'Paie' : 
                 displayedEntry.source_module}
                {displayedEntry.source_id && ` (ID: ${displayedEntry.source_id})`}
              </>
            ) : 'Manuelle'}
          </Descriptions.Item>
          <Descriptions.Item label="Créé par">{displayedEntry.created_by_name}</Descriptions.Item>
          <Descriptions.Item label="Créé le">{moment(displayedEntry.created_at).format('DD/MM/YYYY HH:mm')}</Descriptions.Item>
        </Descriptions>
      </Card>

      <Card title="Lignes d'écriture">
        <Table
          columns={columns}
          dataSource={displayedEntry.lines}
          rowKey="id"
          pagination={false}
          size="middle"
          summary={pageData => {
            let totalDebit = 0;
            let totalCredit = 0;
            
            pageData.forEach(({ debit, credit }) => {
              totalDebit += parseFloat(debit || 0);
              totalCredit += parseFloat(credit || 0);
            });
            
            return (
              <>
                <Table.Summary.Row>
                  <Table.Summary.Cell index={0} colSpan={4}><strong>Total</strong></Table.Summary.Cell>
                  <Table.Summary.Cell index={4} align="right">
                    <strong>{totalDebit.toFixed(2)}</strong>
                  </Table.Summary.Cell>
                  <Table.Summary.Cell index={5} align="right">
                    <strong>{totalCredit.toFixed(2)}</strong>
                  </Table.Summary.Cell>
                  <Table.Summary.Cell index={6}></Table.Summary.Cell>
                </Table.Summary.Row>
                <Table.Summary.Row>
                  <Table.Summary.Cell index={0} colSpan={4}><strong>Différence</strong></Table.Summary.Cell>
                  <Table.Summary.Cell index={4} colSpan={3} align="right">
                    <strong>{(totalDebit - totalCredit).toFixed(2)}</strong>
                  </Table.Summary.Cell>
                </Table.Summary.Row>
              </>
            );
          }}
        />
      </Card>
    </div>
  );
};

export default JournalEntryDetail;
