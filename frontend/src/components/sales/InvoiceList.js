// src/components/sales/InvoiceList.js
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Table, Button, Space, Typography, Card, Input, Select,
  DatePicker, Tag, Popconfirm, message, Badge, Row, Col, Alert
} from 'antd';
import {
  PlusOutlined, SearchOutlined, EditOutlined, DeleteOutlined,
  MailOutlined, DollarOutlined, FileOutlined, FileTextOutlined
} from '@ant-design/icons';
import axios from '../../utils/axiosConfig';
import moment from 'moment';
import { extractResultsFromResponse } from '../../utils/apiUtils';

const { Title } = Typography;
const { Option } = Select;
const { RangePicker } = DatePicker;

const InvoiceList = () => {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [dateRange, setDateRange] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0,
  });

  const navigate = useNavigate();

  useEffect(() => {
    fetchInvoices();
  }, [statusFilter, typeFilter, pagination.current, pagination.pageSize]);

  const fetchInvoices = async () => {
    setLoading(true);
    try {
      // Construire les paramètres de requête
      const params = {
        page: pagination.current,
        page_size: pagination.pageSize,
      };

      // Ajouter les filtres si définis
      if (statusFilter && statusFilter !== 'all') {
        params.payment_status = statusFilter;
      }

      if (typeFilter && typeFilter !== 'all') {
        params.type = typeFilter;
      }

      if (searchText) {
        params.search = searchText;
      }

      if (dateRange && dateRange[0] && dateRange[1]) {
        params.date_min = dateRange[0].format('YYYY-MM-DD');
        params.date_max = dateRange[1].format('YYYY-MM-DD');
      }

      const response = await axios.get('/api/sales/invoices/', { params });

      // Extraire les résultats avec l'utilitaire
      const invoicesData = extractResultsFromResponse(response);

      // Mettre à jour la pagination avec la réponse
      if (response.data && response.data.count !== undefined) {
        setPagination({
          ...pagination,
          total: response.data.count,
        });
      }

      setInvoices(invoicesData);
    } catch (error) {
      console.error('Erreur lors de la récupération des factures:', error);
      message.error('Impossible de charger les factures');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    // Réinitialiser à la première page lors d'une recherche
    setPagination({
      ...pagination,
      current: 1,
    });
    fetchInvoices();
  };

  const resetFilters = () => {
    setSearchText('');
    setStatusFilter('all');
    setTypeFilter('all');
    setDateRange(null);
    setPagination({
      ...pagination,
      current: 1,
    });
    fetchInvoices();
  };

  const handleTableChange = (pagination, filters, sorter) => {
    setPagination(pagination);
  };

  const handleStatusChange = (value) => {
    setStatusFilter(value);
    setPagination({
      ...pagination,
      current: 1,
    });
  };

  const handleTypeChange = (value) => {
    setTypeFilter(value);
    setPagination({
      ...pagination,
      current: 1,
    });
  };

  const handleDateRangeChange = (dates) => {
    setDateRange(dates);
  };

  const handleDeleteInvoice = async (id) => {
    setActionLoading(true);
    try {
      await axios.delete(`/api/sales/invoices/${id}/`);
      message.success('Facture supprimée avec succès');
      fetchInvoices();
    } catch (error) {
      console.error("Erreur lors de la suppression de la facture:", error);
      message.error("Impossible de supprimer la facture");
    } finally {
      setActionLoading(false);
    }
  };

  const handleMarkAsPaid = async (id) => {
    setActionLoading(true);
    try {
      await axios.post(`/api/sales/invoices/${id}/mark_as_paid/`);
      message.success('Facture marquée comme payée avec succès');
      fetchInvoices();
    } catch (error) {
      console.error("Erreur lors du marquage de la facture comme payée:", error);
      message.error("Impossible de marquer la facture comme payée");
    } finally {
      setActionLoading(false);
    }
  };

  const handleGeneratePdf = async (id) => {
    setActionLoading(true);
    try {
      await axios.post(`/api/sales/invoices/${id}/generate_pdf/`);
      message.success('PDF généré avec succès');
      // Ouvrir le PDF dans un nouvel onglet
      window.open(`/api/sales/invoices/${id}/download_pdf/`, '_blank');
      fetchInvoices();
    } catch (error) {
      console.error("Erreur lors de la génération du PDF:", error);
      message.error("Impossible de générer le PDF");
    } finally {
      setActionLoading(false);
    }
  };

  const handleSendByEmail = async (id) => {
    setActionLoading(true);
    try {
      await axios.post(`/api/sales/invoices/${id}/send_by_email/`);
      message.success('Facture envoyée par email avec succès');
      fetchInvoices();
    } catch (error) {
      console.error("Erreur lors de l'envoi de la facture par email:", error);
      message.error("Impossible d'envoyer la facture par email");
      // Rediriger vers la page de détail pour l'envoi manuel
      navigate(`/sales/invoices/${id}`);
    } finally {
      setActionLoading(false);
    }
  };

  const columns = [
    {
      title: 'Numéro',
      dataIndex: 'number',
      key: 'number',
      render: (text, record) => <Link to={`/sales/invoices/${record.id}`}>{text}</Link>,
    },
    {
      title: 'Type',
      dataIndex: 'type',
      key: 'type',
      render: (type) => {
        const typeConfig = {
          'standard': { color: 'blue', text: 'Standard' },
          'deposit': { color: 'purple', text: 'Acompte' },
          'credit_note': { color: 'orange', text: 'Avoir' }
        };
        return (
          <Tag color={typeConfig[type]?.color || 'default'}>
            {typeConfig[type]?.text || type}
          </Tag>
        );
      },
    },
    {
      title: 'Entreprise',
      dataIndex: 'company_name',
      key: 'company_name',
    },
    {
      title: 'Date',
      dataIndex: 'date',
      key: 'date',
      render: text => text ? moment(text).format('DD/MM/YYYY') : '-',
    },
    {
      title: 'Échéance',
      dataIndex: 'due_date',
      key: 'due_date',
      render: (text, record) => {
        if (!text) return '-';
        
        const dueDate = moment(text);
        const now = moment();
        const isOverdue = dueDate.isBefore(now) && record.payment_status === 'unpaid';

        return (
          <span style={{ color: isOverdue ? 'red' : 'inherit' }}>
            {dueDate.format('DD/MM/YYYY')}
            {isOverdue && <Badge status="error" style={{ marginLeft: 8 }} />}
          </span>
        );
      },
    },
    {
      title: 'Total',
      dataIndex: 'total',
      key: 'total',
      render: (text, record) => `${text} ${record.currency_code || ''}`,
    },
    {
      title: 'Reste à payer',
      dataIndex: 'amount_due',
      key: 'amount_due',
      render: (text, record) => `${text} ${record.currency_code || ''}`,
    },
    {
      title: 'Statut',
      dataIndex: 'payment_status',
      key: 'payment_status',
      render: (status) => {
        const statusConfig = {
          'unpaid': { color: 'orange', text: 'Non payée' },
          'partial': { color: 'blue', text: 'Partiellement payée' },
          'paid': { color: 'green', text: 'Payée' },
          'overdue': { color: 'red', text: 'En retard' },
          'cancelled': { color: 'default', text: 'Annulée' }
        };
        return (
          <Tag color={statusConfig[status]?.color || 'default'}>
            {statusConfig[status]?.text || status}
          </Tag>
        );
      },
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Space size="small">
          <Button size="small" type="primary">
            <Link to={`/sales/invoices/${record.id}`}>Détails</Link>
          </Button>

          {record.payment_status === 'unpaid' && record.type !== 'credit_note' && (
            <Button
              size="small"
              type="primary"
              icon={<DollarOutlined />}
              onClick={() => handleMarkAsPaid(record.id)}
              loading={actionLoading}
              style={{ backgroundColor: 'green', borderColor: 'green' }}
            >
              Payer
            </Button>
          )}

          <Button
            size="small"
            icon={<FileOutlined />}
            onClick={() => handleGeneratePdf(record.id)}
            loading={actionLoading}
          >
            PDF
          </Button>

          <Button
            size="small"
            icon={<MailOutlined />}
            onClick={() => handleSendByEmail(record.id)}
            loading={actionLoading}
          >
            Email
          </Button>

          {record.payment_status === 'unpaid' && record.type === 'standard' && (
            <Popconfirm
              title="Êtes-vous sûr de vouloir supprimer cette facture?"
              onConfirm={() => handleDeleteInvoice(record.id)}
              okText="Oui"
              cancelText="Non"
            >
              <Button
                size="small"
                danger
                icon={<DeleteOutlined />}
                loading={actionLoading}
              >
                Supprimer
              </Button>
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div className="invoice-list-container">
      <Card>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
          <Title level={2}>Factures</Title>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => navigate('/sales/invoices/new')}
          >
            Nouvelle facture
          </Button>
        </div>

        {/* Filtres */}
        <div style={{ marginBottom: 16 }}>
          <Row gutter={16}>
            <Col span={7}>
              <Input
                placeholder="Rechercher par numéro, entreprise ou contact"
                value={searchText}
                onChange={e => setSearchText(e.target.value)}
                onPressEnter={handleSearch}
                prefix={<SearchOutlined />}
              />
            </Col>
            <Col span={5}>
              <Select
                placeholder="Filtrer par statut"
                style={{ width: '100%' }}
                value={statusFilter}
                onChange={handleStatusChange}
              >
                <Option value="all">Tous les statuts</Option>
                <Option value="unpaid">Non payée</Option>
                <Option value="partial">Partiellement payée</Option>
                <Option value="paid">Payée</Option>
                <Option value="overdue">En retard</Option>
                <Option value="cancelled">Annulée</Option>
              </Select>
            </Col>
            <Col span={4}>
              <Select
                placeholder="Filtrer par type"
                style={{ width: '100%' }}
                value={typeFilter}
                onChange={handleTypeChange}
              >
                <Option value="all">Tous les types</Option>
                <Option value="standard">Standard</Option>
                <Option value="deposit">Acompte</Option>
                <Option value="credit_note">Avoir</Option>
              </Select>
            </Col>
            <Col span={8}>
              <Space>
                <RangePicker
                  placeholder={['Date début', 'Date fin']}
                  value={dateRange}
                  onChange={handleDateRangeChange}
                />
                <Button onClick={handleSearch} type="primary">Rechercher</Button>
                {(searchText || statusFilter !== 'all' || typeFilter !== 'all' || dateRange) && (
                  <Button onClick={resetFilters}>Réinitialiser</Button>
                )}
              </Space>
            </Col>
          </Row>
        </div>

        {/* Tableau des factures */}
        <Table
          columns={columns}
          dataSource={invoices}
          rowKey="id"
          loading={loading}
          pagination={pagination}
          onChange={handleTableChange}
          locale={{ emptyText: 'Aucune facture trouvée' }}
          summary={pageData => {
            if (pageData.length === 0) return null;

            // Calculer les statistiques
            let totalAmount = 0;
            let totalDue = 0;

            pageData.forEach(item => {
              totalAmount += Number(item.total || 0);
              totalDue += Number(item.amount_due || 0);
            });

            return (
              <Table.Summary.Row>
                <Table.Summary.Cell index={0} colSpan={5}>
                  <strong>Total de la page</strong>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={1}>
                  <strong>{totalAmount.toLocaleString()} {pageData[0]?.currency_code || ''}</strong>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={2}>
                  <strong>{totalDue.toLocaleString()} {pageData[0]?.currency_code || ''}</strong>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={3} colSpan={2}></Table.Summary.Cell>
              </Table.Summary.Row>
            );
          }}
        />
      </Card>
    </div>
  );
};

export default InvoiceList;
