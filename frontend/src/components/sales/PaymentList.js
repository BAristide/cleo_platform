// src/components/sales/PaymentList.js
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Table, Button, Space, Typography, Card, Input, Select,
  DatePicker, Tag, Popconfirm, message, Row, Col, Modal, Form, InputNumber
} from 'antd';
import {
  SearchOutlined, DeleteOutlined, PlusOutlined, BankOutlined,
  CreditCardOutlined, DollarOutlined, FileTextOutlined
} from '@ant-design/icons';
import axios from '../../utils/axiosConfig';
import moment from 'moment';
import { extractResultsFromResponse } from '../../utils/apiUtils';

const { Title } = Typography;
const { Option } = Select;
const { RangePicker } = DatePicker;
const { TextArea } = Input;

const PaymentList = () => {
  const [payments, setPayments] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState('');
  const [methodFilter, setMethodFilter] = useState('all');
  const [dateRange, setDateRange] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [addPaymentModal, setAddPaymentModal] = useState(false);
  const [paymentForm] = Form.useForm();
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0,
  });

  const navigate = useNavigate();

  useEffect(() => {
    fetchPayments();
    fetchUnpaidInvoices();
  }, [methodFilter, pagination.current, pagination.pageSize]);

  const fetchPayments = async () => {
    setLoading(true);
    try {
      // Construire les paramètres de requête
      const params = {
        page: pagination.current,
        page_size: pagination.pageSize,
      };

      // Ajouter les filtres si définis
      if (methodFilter && methodFilter !== 'all') {
        params.method = methodFilter;
      }

      if (searchText) {
        params.search = searchText;
      }

      if (dateRange && dateRange[0] && dateRange[1]) {
        params.date_min = dateRange[0].format('YYYY-MM-DD');
        params.date_max = dateRange[1].format('YYYY-MM-DD');
      }

      const response = await axios.get('/api/sales/payments/', { params });

      // Extraire les résultats avec l'utilitaire
      const paymentsData = extractResultsFromResponse(response);

      // Mettre à jour la pagination avec la réponse
      if (response.data && response.data.count !== undefined) {
        setPagination({
          ...pagination,
          total: response.data.count,
        });
      }

      setPayments(paymentsData);
    } catch (error) {
      console.error('Erreur lors de la récupération des paiements:', error);
      message.error('Impossible de charger les paiements');
    } finally {
      setLoading(false);
    }
  };

  const fetchUnpaidInvoices = async () => {
    try {
      const response = await axios.get('/api/sales/invoices/', {
        params: {
          payment_status: 'unpaid,partial',
        }
      });
      const invoicesData = extractResultsFromResponse(response);
      setInvoices(invoicesData);
    } catch (error) {
      console.error('Erreur lors de la récupération des factures impayées:', error);
      message.error('Impossible de charger les factures impayées');
    }
  };

  const handleSearch = () => {
    // Réinitialiser à la première page lors d'une recherche
    setPagination({
      ...pagination,
      current: 1,
    });
    fetchPayments();
  };

  const resetFilters = () => {
    setSearchText('');
    setMethodFilter('all');
    setDateRange(null);
    setPagination({
      ...pagination,
      current: 1,
    });
    fetchPayments();
  };

  const handleTableChange = (pagination, filters, sorter) => {
    setPagination(pagination);
  };

  const handleMethodChange = (value) => {
    setMethodFilter(value);
    setPagination({
      ...pagination,
      current: 1,
    });
  };

  const handleDateRangeChange = (dates) => {
    setDateRange(dates);
  };

  const handleDeletePayment = async (id) => {
    setActionLoading(true);
    try {
      await axios.delete(`/api/sales/payments/${id}/`);
      message.success('Paiement supprimé avec succès');
      fetchPayments();
      fetchUnpaidInvoices(); // Rafraîchir les factures car le statut de paiement a changé
    } catch (error) {
      console.error("Erreur lors de la suppression du paiement:", error);
      message.error("Impossible de supprimer le paiement");
    } finally {
      setActionLoading(false);
    }
  };

  const showAddPaymentModal = () => {
    paymentForm.resetFields();
    paymentForm.setFieldsValue({
      date: moment(),
      method: 'bank_transfer'
    });
    setSelectedInvoice(null);
    setAddPaymentModal(true);
  };

  const handleInvoiceSelect = (invoiceId) => {
    const invoice = invoices.find(inv => inv.id === invoiceId);
    if (invoice) {
      paymentForm.setFieldsValue({
        amount: invoice.amount_due
      });
      setSelectedInvoice(invoice);
    }
  };

  const handleAddPayment = async (values) => {
    if (!values.invoice) {
      message.error("Veuillez sélectionner une facture");
      return;
    }

    setActionLoading(true);
    try {
      const paymentData = {
        ...values,
        date: values.date.format('YYYY-MM-DD')
      };

      await axios.post('/api/sales/payments/', paymentData);
      message.success('Paiement ajouté avec succès');
      setAddPaymentModal(false);
      fetchPayments();
      fetchUnpaidInvoices(); // Rafraîchir les factures car le statut de paiement a changé
    } catch (error) {
      console.error("Erreur lors de l'ajout du paiement:", error);
      message.error("Impossible d'ajouter le paiement");
    } finally {
      setActionLoading(false);
    }
  };

  const columns = [
    {
      title: 'Facture',
      dataIndex: 'invoice',
      key: 'invoice',
      render: (_, record) => (
        <Link to={`/sales/invoices/${record.invoice}`}>
          {record.invoice_number || `Facture #${record.invoice}`}
        </Link>
      ),
    },
    {
      title: 'Date',
      dataIndex: 'date',
      key: 'date',
      render: text => text ? moment(text).format('DD/MM/YYYY') : '-',
      sorter: (a, b) => moment(a.date).valueOf() - moment(b.date).valueOf(),
    },
    {
      title: 'Montant',
      dataIndex: 'amount',
      key: 'amount',
      render: (text, record) => `${text} ${record.currency_code || ''}`,
      sorter: (a, b) => a.amount - b.amount,
    },
    {
      title: 'Méthode',
      dataIndex: 'method',
      key: 'method',
      render: (method) => {
        const methodConfig = {
          'bank_transfer': { icon: <BankOutlined />, text: 'Virement bancaire' },
          'check': { icon: <FileTextOutlined />, text: 'Chèque' },
          'cash': { icon: <DollarOutlined />, text: 'Espèces' },
          'credit_card': { icon: <CreditCardOutlined />, text: 'Carte de crédit' },
          'other': { icon: <span>•</span>, text: 'Autre' }
        };
        return (
          <Space>
            {methodConfig[method]?.icon || <span>•</span>}
            {methodConfig[method]?.text || method}
          </Space>
        );
      },
    },
    {
      title: 'Référence',
      dataIndex: 'reference',
      key: 'reference',
      render: text => text || '-',
    },
    {
      title: 'Notes',
      dataIndex: 'notes',
      key: 'notes',
      render: text => text || '-',
      ellipsis: true,
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Space size="small">
          <Link to={`/sales/invoices/${record.invoice}`}>
            <Button size="small" type="primary">
              Voir facture
            </Button>
          </Link>
          <Popconfirm
            title="Êtes-vous sûr de vouloir supprimer ce paiement?"
            description="Cette action réinitialisera le statut de paiement de la facture associée."
            onConfirm={() => handleDeletePayment(record.id)}
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
        </Space>
      ),
    },
  ];

  return (
    <div className="payment-list-container">
      <Card>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
          <Title level={2}>Paiements</Title>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={showAddPaymentModal}
          >
            Nouveau paiement
          </Button>
        </div>

        {/* Filtres */}
        <div style={{ marginBottom: 16 }}>
          <Row gutter={16}>
            <Col span={8}>
              <Input
                placeholder="Rechercher par référence ou numéro de facture"
                value={searchText}
                onChange={e => setSearchText(e.target.value)}
                onPressEnter={handleSearch}
                prefix={<SearchOutlined />}
              />
            </Col>
            <Col span={6}>
              <Select
                placeholder="Filtrer par méthode"
                style={{ width: '100%' }}
                value={methodFilter}
                onChange={handleMethodChange}
              >
                <Option value="all">Toutes les méthodes</Option>
                <Option value="bank_transfer">Virement bancaire</Option>
                <Option value="check">Chèque</Option>
                <Option value="cash">Espèces</Option>
                <Option value="credit_card">Carte de crédit</Option>
                <Option value="other">Autre</Option>
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
                {(searchText || methodFilter !== 'all' || dateRange) && (
                  <Button onClick={resetFilters}>Réinitialiser</Button>
                )}
              </Space>
            </Col>
          </Row>
        </div>

        {/* Tableau des paiements */}
        <Table
          columns={columns}
          dataSource={payments}
          rowKey="id"
          loading={loading}
          pagination={pagination}
          onChange={handleTableChange}
          locale={{ emptyText: 'Aucun paiement trouvé' }}
          summary={pageData => {
            if (pageData.length === 0) return null;

            // Calculer le montant total des paiements sur la page
            let totalAmount = 0;
            pageData.forEach(item => {
              totalAmount += Number(item.amount || 0);
            });

            return (
              <Table.Summary.Row>
                <Table.Summary.Cell index={0} colSpan={2}>
                  <strong>Total de la page</strong>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={2}>
                  <strong>{totalAmount.toLocaleString()} {pageData[0]?.currency_code || ''}</strong>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={3} colSpan={4}></Table.Summary.Cell>
              </Table.Summary.Row>
            );
          }}
        />
      </Card>

      {/* Modal pour ajouter un paiement */}
      <Modal
        title="Ajouter un paiement"
        visible={addPaymentModal}
        onCancel={() => setAddPaymentModal(false)}
        footer={null}
      >
        <Form
          form={paymentForm}
          layout="vertical"
          onFinish={handleAddPayment}
        >
          <Form.Item
            name="invoice"
            label="Facture"
            rules={[{ required: true, message: 'Veuillez sélectionner une facture' }]}
          >
            <Select
              placeholder="Sélectionner une facture"
              onChange={handleInvoiceSelect}
              filterOption={(input, option) =>
                option.children.toLowerCase().indexOf(input.toLowerCase()) >= 0
              }
            >
              {invoices.map(invoice => (
                <Option key={invoice.id} value={invoice.id}>
                  {invoice.number} - {invoice.company_name} ({invoice.amount_due} {invoice.currency_code})
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="amount"
            label="Montant"
            rules={[
              { required: true, message: 'Veuillez saisir le montant' },
              { 
                validator: (_, value) => {
                  if (value <= 0) {
                    return Promise.reject('Le montant doit être supérieur à 0');
                  }
                  if (selectedInvoice && value > selectedInvoice.amount_due) {
                    return Promise.reject(`Le montant ne peut pas dépasser le reste à payer (${selectedInvoice.amount_due} ${selectedInvoice.currency_code})`);
                  }
                  return Promise.resolve();
                } 
              }
            ]}
          >
            <InputNumber
              style={{ width: '100%' }}
              min={0.01}
              step={0.01}
              precision={2}
              addonAfter={selectedInvoice?.currency_code || ''}
            />
          </Form.Item>

          <Form.Item
            name="date"
            label="Date du paiement"
            rules={[{ required: true, message: 'Veuillez sélectionner la date du paiement' }]}
          >
            <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
          </Form.Item>

          <Form.Item
            name="method"
            label="Méthode de paiement"
            rules={[{ required: true, message: 'Veuillez sélectionner la méthode de paiement' }]}
          >
            <Select>
              <Option value="bank_transfer">Virement bancaire</Option>
              <Option value="check">Chèque</Option>
              <Option value="cash">Espèces</Option>
              <Option value="credit_card">Carte de crédit</Option>
              <Option value="other">Autre</Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="reference"
            label="Référence"
          >
            <Input placeholder="Numéro du chèque, référence du virement, etc." />
          </Form.Item>

          <Form.Item
            name="notes"
            label="Notes"
          >
            <TextArea rows={3} placeholder="Notes additionnelles sur le paiement" />
          </Form.Item>

          <Form.Item>
            <div style={{ textAlign: 'right' }}>
              <Button onClick={() => setAddPaymentModal(false)} style={{ marginRight: 8 }}>
                Annuler
              </Button>
              <Button type="primary" htmlType="submit" loading={actionLoading}>
                Enregistrer
              </Button>
            </div>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default PaymentList;
