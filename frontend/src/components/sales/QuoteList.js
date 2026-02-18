// src/components/sales/QuoteList.js
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Table, Button, Space, Input, Card, Tag, Typography, message, Popconfirm, Select,
  DatePicker, Row, Col, Drawer, Form, Badge
} from 'antd';
import {
  SearchOutlined,
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  CheckOutlined,
  CloseOutlined,
  ShoppingCartOutlined,
  FileOutlined,
  MailOutlined
} from '@ant-design/icons';
import axios from '../../utils/axiosConfig';
import moment from 'moment';
import { extractResultsFromResponse } from '../../utils/apiUtils';

const { Title } = Typography;
const { Option } = Select;
const { RangePicker } = DatePicker;

const QuoteList = () => {
  const [loading, setLoading] = useState(true);
  const [quotes, setQuotes] = useState([]);
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateRange, setDateRange] = useState(null);
  const [companies, setCompanies] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [showCreateDrawer, setShowCreateDrawer] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [quoteForm] = Form.useForm();
  const [selectedCompany, setSelectedCompany] = useState(null);
  const [contactOptions, setContactOptions] = useState([]);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0,
  });

  const navigate = useNavigate();

  useEffect(() => {
    fetchQuotes();
    fetchCompanies();
  }, [statusFilter, pagination.current, pagination.pageSize]);

  const fetchQuotes = async () => {
    setLoading(true);
    try {
      // Construire les paramètres de requête
      const params = {
        page: pagination.current,
        page_size: pagination.pageSize,
      };

      // Ajouter les filtres si définis
      if (statusFilter && statusFilter !== 'all') {
        params.status = statusFilter;
      }

      if (searchText) {
        params.search = searchText;
      }

      if (dateRange && dateRange[0] && dateRange[1]) {
        params.date_min = dateRange[0].format('YYYY-MM-DD');
        params.date_max = dateRange[1].format('YYYY-MM-DD');
      }

      const response = await axios.get('/api/sales/quotes/', { params });

      // Extraire les résultats avec l'utilitaire
      const quotesData = extractResultsFromResponse(response);

      // Mettre à jour la pagination avec la réponse
      if (response.data && response.data.count !== undefined) {
        setPagination({
          ...pagination,
          total: response.data.count,
        });
      }

      setQuotes(quotesData);
    } catch (error) {
      console.error('Erreur lors de la récupération des devis:', error);
      message.error('Impossible de charger les devis');
    } finally {
      setLoading(false);
    }
  };

  const fetchCompanies = async () => {
    try {
      const response = await axios.get('/api/crm/companies/');
      const companiesData = extractResultsFromResponse(response);
      setCompanies(companiesData);
    } catch (error) {
      console.error('Erreur lors de la récupération des entreprises:', error);
      message.error('Impossible de charger les entreprises');
    }
  };

  const fetchContactsByCompany = async (companyId) => {
    if (!companyId) {
      setContactOptions([]);
      return;
    }

    try {
      const response = await axios.get(`/api/crm/companies/${companyId}/contacts/`);
      const contactsData = extractResultsFromResponse(response);

      console.log("Contacts récupérés:", contactsData);

      // Stocker les contacts complets pour une utilisation ultérieure
      setContacts(contactsData);

      console.log('Contacts après extraction:', contactsData);

      // Stocker les contacts complets pour une utilisation ultérieure
      setContacts(contactsData);

      // Vérifier la structure des données et créer les options de manière appropriée
      if (Array.isArray(contactsData)) {
        // Utiliser full_name au lieu de first_name + last_name
        const options = contactsData.map(contact => ({
          value: contact.id,
          label: contact.full_name || `Contact #${contact.id}`
        }));
        console.log('Options formatées:', options);
        setContactOptions(options);
      } else {
        setContactOptions([]);
      }




    } catch (error) {
      console.error('Erreur lors de la récupération des contacts:', error);
      message.error('Impossible de charger les contacts');
      setContactOptions([]);
    }
  };

  const handleSearch = () => {
    // Réinitialiser à la première page lors d'une recherche
    setPagination({
      ...pagination,
      current: 1,
    });
    fetchQuotes();
  };

  const resetFilters = () => {
    setSearchText('');
    setStatusFilter('all');
    setDateRange(null);
    setPagination({
      ...pagination,
      current: 1,
    });
    fetchQuotes();
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

  const handleDateRangeChange = (dates) => {
    setDateRange(dates);
  };

  const handleCompanyChange = (value) => {
    setSelectedCompany(value);
    quoteForm.setFieldsValue({ contact: undefined });
    fetchContactsByCompany(value);
  };

  const handleCreateQuote = async (values) => {
    setActionLoading(true);
    try {
      const formData = {
        ...values,
        date: values.date.format('YYYY-MM-DD'),
        status: 'draft',
      };

      const response = await axios.post('/api/sales/quotes/', formData);
      message.success('Devis créé avec succès');
      setShowCreateDrawer(false);
      quoteForm.resetFields();

      // Rediriger vers la page de détail du nouveau devis
      navigate(`/sales/quotes/${response.data.id}`);
    } catch (error) {
      console.error('Erreur lors de la création du devis:', error);
      if (error.response && error.response.data) {
        const errors = error.response.data;
        const errorMessages = Object.entries(errors)
          .map(([field, msgs]) => `${field}: ${Array.isArray(msgs) ? msgs.join(', ') : msgs}`)
          .join(' | ');
        message.error(`Erreur de validation : ${errorMessages}`);
      } else {
        message.error('Impossible de créer le devis');
      }
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteQuote = async (id) => {
    setActionLoading(true);
    try {
      await axios.delete(`/api/sales/quotes/${id}/`);
      message.success('Devis supprimé avec succès');
      fetchQuotes();
    } catch (error) {
      console.error('Erreur lors de la suppression du devis:', error);
      message.error('Impossible de supprimer le devis');
    } finally {
      setActionLoading(false);
    }
  };

  const handleAcceptQuote = async (id) => {
    setActionLoading(true);
    try {
      await axios.post(`/api/sales/quotes/${id}/accept/`);
      message.success('Devis marqué comme accepté');
      fetchQuotes();
    } catch (error) {
      console.error("Erreur lors de l'acceptation du devis:", error);
      message.error("Impossible d'accepter le devis");
    } finally {
      setActionLoading(false);
    }
  };

  const handleRejectQuote = async (id) => {
    setActionLoading(true);
    try {
      await axios.post(`/api/sales/quotes/${id}/reject/`);
      message.success('Devis marqué comme refusé');
      fetchQuotes();
    } catch (error) {
      console.error("Erreur lors du refus du devis:", error);
      message.error("Impossible de refuser le devis");
    } finally {
      setActionLoading(false);
    }
  };

  const handleConvertToOrder = async (id) => {
    setActionLoading(true);
    try {
      const response = await axios.post(`/api/sales/quotes/${id}/convert_to_order/`);
      message.success('Devis converti en commande avec succès');

      // Si la réponse contient l'ID de la commande, naviguer vers la page de détail
      if (response.data && response.data.order && response.data.order.id) {
        navigate(`/sales/orders/${response.data.order.id}`);
      } else {
        fetchQuotes();
      }
    } catch (error) {
      console.error("Erreur lors de la conversion du devis:", error);
      message.error("Impossible de convertir le devis en commande");
      setActionLoading(false);
    }
  };

  const handleGeneratePdf = async (id) => {
    setActionLoading(true);
    try {
      await axios.post(`/api/sales/quotes/${id}/generate_pdf/`);
      message.success('PDF généré avec succès');
      // Ouvrir le PDF dans un nouvel onglet
      window.open(`/api/sales/quotes/${id}/download_pdf/`, '_blank');
      fetchQuotes();
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
      // Récupérer l'email du contact associé au devis
      const quote = quotes.find(q => q.id === id);
      const contact = quote && quote.contact_id ? contacts.find(c => c.id === quote.contact_id) : null;

      if (contact && contact.email) {
        await axios.post(`/api/sales/quotes/${id}/send_by_email/`, {
          recipient_email: contact.email,
        });
        message.success('Devis envoyé par email avec succès');
      } else {
        message.warning('Aucune adresse email de contact trouvée. Veuillez l\'ajouter manuellement.');
        navigate(`/sales/quotes/${id}`);
        return;
      }

      fetchQuotes();
    } catch (error) {
      console.error("Erreur lors de l'envoi du devis par email:", error);
      message.error("Impossible d'envoyer le devis par email");
    } finally {
      setActionLoading(false);
    }
  };

  const columns = [
    {
      title: 'Numéro',
      dataIndex: 'number',
      key: 'number',
      render: (text, record) => <Link to={`/sales/quotes/${record.id}`}>{text}</Link>,
    },
    {
      title: 'Entreprise',
      dataIndex: 'company_name',
      key: 'company_name',
    },
    {
      title: 'Contact',
      dataIndex: 'contact_name',
      key: 'contact_name',
    },
    {
      title: 'Date',
      dataIndex: 'date',
      key: 'date',
      render: text => text ? moment(text).format('DD/MM/YYYY') : '-',
    },
    {
      title: 'Expiration',
      dataIndex: 'expiration_date',
      key: 'expiration_date',
      render: text => text ? moment(text).format('DD/MM/YYYY') : '-',
    },
    {
      title: 'Total',
      dataIndex: 'total',
      key: 'total',
      render: (text, record) => `${text} ${record.currency_code || ''}`,
    },
    {
      title: 'Statut',
      dataIndex: 'status',
      key: 'status',
      render: (status, record) => {
        let color, label;
        switch (status) {
          case 'draft':
            color = 'default';
            label = 'Brouillon';
            break;
          case 'sent':
            color = 'blue';
            label = 'Envoyé';
            break;
          case 'accepted':
            color = 'green';
            label = 'Accepté';
            break;
          case 'rejected':
            color = 'red';
            label = 'Refusé';
            break;
          case 'expired':
            color = 'orange';
            label = 'Expiré';
            break;
          case 'cancelled':
            color = 'default';
            label = 'Annulé';
            break;
          default:
            color = 'default';
            label = status;
        }
        return (
          <Space>
            <Tag color={color}>{label}</Tag>
            {record.converted_to_order && <Badge status="success" text="→ Commande" />}
          </Space>
        );
      },
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Space size="small">
          <Button size="small" type="primary">
            <Link to={`/sales/quotes/${record.id}`}>Détails</Link>
          </Button>

          {record.status === 'sent' && (
            <>
              <Button
                size="small"
                type="primary"
                icon={<CheckOutlined />}
                onClick={() => handleAcceptQuote(record.id)}
                style={{ backgroundColor: 'green', borderColor: 'green' }}
                loading={actionLoading}
              >
                Accepter
              </Button>
              <Button
                size="small"
                danger
                icon={<CloseOutlined />}
                onClick={() => handleRejectQuote(record.id)}
                loading={actionLoading}
              >
                Refuser
              </Button>
            </>
          )}

          {record.status === 'accepted' && !record.converted_to_order && (
            <Button
              size="small"
              type="primary"
              icon={<ShoppingCartOutlined />}
              onClick={() => handleConvertToOrder(record.id)}
              loading={actionLoading}
            >
              Convertir
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

          {['draft', 'sent', 'accepted'].includes(record.status) && (
            <Button
              size="small"
              icon={<MailOutlined />}
              onClick={() => handleSendByEmail(record.id)}
              loading={actionLoading}
            >
              Email
            </Button>
          )}

          {['draft', 'sent'].includes(record.status) && (
            <Popconfirm
              title="Êtes-vous sûr de vouloir supprimer ce devis?"
              onConfirm={() => handleDeleteQuote(record.id)}
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
    <div className="quote-list-container">
      <Card>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
          <Title level={2}>Devis</Title>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => navigate('/sales/quotes/new')}
          >
            Nouveau devis
          </Button>
        </div>

        {/* Filtres */}
        <div style={{ marginBottom: 16 }}>
          <Row gutter={16}>
            <Col span={8}>
              <Input
                placeholder="Rechercher par numéro, entreprise ou contact"
                value={searchText}
                onChange={e => setSearchText(e.target.value)}
                onPressEnter={handleSearch}
                prefix={<SearchOutlined />}
              />
            </Col>
            <Col span={6}>
              <Select
                placeholder="Filtrer par statut"
                style={{ width: '100%' }}
                value={statusFilter}
                onChange={handleStatusChange}
              >
                <Option value="all">Tous les statuts</Option>
                <Option value="draft">Brouillon</Option>
                <Option value="sent">Envoyé</Option>
                <Option value="accepted">Accepté</Option>
                <Option value="rejected">Refusé</Option>
                <Option value="expired">Expiré</Option>
                <Option value="cancelled">Annulé</Option>
              </Select>
            </Col>
            <Col span={10}>
              <Space>
                <RangePicker
                  placeholder={['Date début', 'Date fin']}
                  value={dateRange}
                  onChange={handleDateRangeChange}
                />
                <Button onClick={handleSearch} type="primary">Rechercher</Button>
                {(searchText || statusFilter !== 'all' || dateRange) && (
                  <Button onClick={resetFilters}>Réinitialiser</Button>
                )}
              </Space>
            </Col>
          </Row>
        </div>

        {/* Tableau des devis */}
        <Table
          columns={columns}
          dataSource={quotes}
          rowKey="id"
          loading={loading}
          pagination={pagination}
          onChange={handleTableChange}
          locale={{ emptyText: 'Aucun devis trouvé' }}
          summary={pageData => {
            if (pageData.length === 0) return null;

            // Calculer les statistiques
            let totalAmount = 0;

            pageData.forEach(item => {
              totalAmount += Number(item.total || 0);
            });

            return (
              <Table.Summary.Row>
                <Table.Summary.Cell index={0} colSpan={5}>
                  <strong>Total de la page</strong>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={1}>
                  <strong>{totalAmount.toLocaleString()} {pageData[0]?.currency_code || ''}</strong>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={2} colSpan={2}></Table.Summary.Cell>
              </Table.Summary.Row>
            );
          }}
        />
      </Card>

      {/* Drawer pour créer un nouveau devis */}
      <Drawer
        title="Créer un nouveau devis"
        width={720}
        onClose={() => setShowCreateDrawer(false)}
        visible={showCreateDrawer}
        bodyStyle={{ paddingBottom: 80 }}
        footer={
          <div style={{ textAlign: 'right' }}>
            <Button
              onClick={() => setShowCreateDrawer(false)}
              style={{ marginRight: 8 }}
            >
              Annuler
            </Button>
            <Button
              onClick={() => quoteForm.submit()}
              type="primary"
              loading={actionLoading}
            >
              Créer
            </Button>
          </div>
        }
      >
        <Form
          form={quoteForm}
          layout="vertical"
          onFinish={handleCreateQuote}
          initialValues={{
            date: moment(),
            validity_period: 20,
            currency: 1, // ID de la devise par défaut (MAD)
            payment_terms: '30_days',
          }}
        >
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="company"
                label="Entreprise"
                rules={[{ required: true, message: 'Veuillez sélectionner une entreprise' }]}
              >
                <Select
                  placeholder="Sélectionner une entreprise"
                  onChange={handleCompanyChange}
                  showSearch
                  filterOption={(input, option) =>
                    option.children.toLowerCase().indexOf(input.toLowerCase()) >= 0
                  }
                >
                  {companies.map(company => (
                    <Option key={company.id} value={company.id}>{company.name}</Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="contact"
                label="Contact"
                rules={[{ required: true, message: 'Veuillez sélectionner un contact' }]}
              >
                <Select
                  placeholder="Sélectionner un contact"
                  disabled={!selectedCompany}
                >
                  {contactOptions.map(option => (
                    <Option key={option.value} value={option.value}>{option.label}</Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="date"
                label="Date d'émission"
                rules={[{ required: true, message: 'Veuillez sélectionner une date' }]}
              >
                <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="validity_period"
                label="Validité (jours)"
                rules={[{ required: true, message: 'Veuillez indiquer une durée de validité' }]}
              >
                <Input type="number" min={1} />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item
                name="currency"
                label="Devise"
                rules={[{ required: true, message: 'Veuillez sélectionner une devise' }]}
              >
                <Select placeholder="Sélectionner une devise">
                  <Option value={1}>MAD - Dirham Marocain</Option>
                  <Option value={2}>EUR - Euro</Option>
                  <Option value={3}>USD - Dollar américain</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name="payment_terms"
                label="Conditions de paiement"
                rules={[{ required: true, message: 'Veuillez sélectionner des conditions de paiement' }]}
              >
                <Select placeholder="Sélectionner les conditions">
                  <Option value="immediate">Paiement immédiat</Option>
                  <Option value="30_days">Paiement à 30 jours</Option>
                  <Option value="60_days">Paiement à 60 jours</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name="discount_percentage"
                label="Remise (%)"
                initialValue={0}
              >
                <Input type="number" min={0} max={100} />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item
            name="notes"
            label="Notes"
          >
            <Input.TextArea rows={4} />
          </Form.Item>
          <Form.Item
            name="terms"
            label="Conditions"
          >
            <Input.TextArea rows={4} />
          </Form.Item>
        </Form>
      </Drawer>
    </div>
  );
};

export default QuoteList;
