// src/components/sales/InvoiceDetail.js
import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  Card,
  Descriptions,
  Tag,
  Statistic,
  Button,
  Space,
  Row,
  Col,
  Typography,
  Spin,
  message,
  Tabs,
  Timeline,
  Modal,
  Form,
  Input,
  Divider,
  List,
  Avatar,
  Table,
  Popconfirm,
  Badge,
  Alert,
  DatePicker,
  Select,
  Radio
} from 'antd';
import {
  ArrowLeftOutlined,
  EditOutlined,
  DeleteOutlined,
  HistoryOutlined,
  FileTextOutlined,
  FileOutlined,
  TeamOutlined,
  MailOutlined,
  UserOutlined,
  PhoneOutlined,
  DollarOutlined,
  BankOutlined,
  PlusOutlined,
  CloseOutlined
} from '@ant-design/icons';
import axios from '../../utils/axiosConfig';
import { extractResultsFromResponse } from '../../utils/apiUtils';
import moment from 'moment';

const { Title, Text, Paragraph } = Typography;
const { TabPane } = Tabs;
const { TextArea } = Input;
const { Option } = Select;
const InvoiceDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [invoice, setInvoice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState([]);
  const [payments, setPayments] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [loadingAction, setLoadingAction] = useState(false);
  const [sendEmailModal, setSendEmailModal] = useState(false);
  const [addPaymentModal, setAddPaymentModal] = useState(false);
  const [createCreditNoteModal, setCreateCreditNoteModal] = useState(false);
  const [emailForm] = Form.useForm();
  const [paymentForm] = Form.useForm();
  const [creditNoteForm] = Form.useForm();
  const [creditAmount, setCreditAmount] = useState(0);
  const [useFullAmount, setUseFullAmount] = useState(true);

  useEffect(() => {
    fetchInvoiceDetails();
  }, [id]);

  const fetchInvoiceDetails = async () => {
    setLoading(true);
    try {
      // Récupérer les détails de la facture
      const invoiceResponse = await axios.get(`/api/sales/invoices/${id}/`);
      const invoiceData = invoiceResponse.data;
      setInvoice(invoiceData);

      // Récupérer les éléments de la facture
      if (invoiceData.id) {
        try {
          const itemsResponse = await axios.get(`/api/sales/invoice-items/?invoice=${invoiceData.id}`);
          const itemsData = extractResultsFromResponse(itemsResponse);
          setItems(itemsData);
        } catch (error) {
          console.error("Erreur lors de la récupération des éléments de la facture:", error);
          setItems([]);
        }

        // Récupérer les paiements associés à la facture
        try {
          const paymentsResponse = await axios.get(`/api/sales/payments/?invoice=${invoiceData.id}`);
          const paymentsData = extractResultsFromResponse(paymentsResponse);
          setPayments(paymentsData);
        } catch (error) {
          console.error("Erreur lors de la récupération des paiements:", error);
          setPayments([]);
        }

        // Récupérer les contacts associés à l'entreprise
        if (invoiceData.company) {
          try {
            const contactsResponse = await axios.get(`/api/crm/companies/${invoiceData.company}/contacts/`);
            const contactsData = extractResultsFromResponse(contactsResponse);
            setContacts(contactsData);
          } catch (error) {
            console.error("Erreur lors de la récupération des contacts:", error);
            setContacts([]);
          }
        }

        // Initialiser le montant de crédit pour l'avoir
        setCreditAmount(invoiceData.total);
      }
    } catch (error) {
      console.error("Erreur lors de la récupération des détails de la facture:", error);
      message.error("Impossible de charger les détails de la facture");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteInvoice = async () => {
    setLoadingAction(true);
    try {
      await axios.delete(`/api/sales/invoices/${id}/`);
      message.success('Facture supprimée avec succès');
      navigate('/sales/invoices');
    } catch (error) {
      console.error("Erreur lors de la suppression:", error);
      message.error("Impossible de supprimer la facture");
    } finally {
      setLoadingAction(false);
    }
  };

  const handleMarkAsPaid = async () => {
    setLoadingAction(true);
    try {
      await axios.post(`/api/sales/invoices/${id}/mark_as_paid/`);
      message.success('Facture marquée comme payée');
      fetchInvoiceDetails();
    } catch (error) {
      console.error("Erreur lors du marquage comme payée:", error);
      message.error("Impossible de marquer la facture comme payée");
    } finally {
      setLoadingAction(false);
    }
  };

  const handleCancel = async () => {
    setLoadingAction(true);
    try {
      await axios.post(`/api/sales/invoices/${id}/cancel/`);
      message.success('Facture annulée avec succès');
      fetchInvoiceDetails();
    } catch (error) {
      console.error("Erreur lors de l'annulation de la facture:", error);
      message.error("Impossible d'annuler la facture");
    } finally {
      setLoadingAction(false);
    }
  };

  const handleGeneratePdf = async () => {
    setLoadingAction(true);
    try {
      await axios.post(`/api/sales/invoices/${id}/generate_pdf/`);
      message.success('PDF généré avec succès');
      // Ouvrir le PDF dans un nouvel onglet
      window.open(`/api/sales/invoices/${id}/download_pdf/`, '_blank');
      fetchInvoiceDetails();
    } catch (error) {
      console.error("Erreur lors de la génération du PDF:", error);
      message.error("Impossible de générer le PDF");
    } finally {
      setLoadingAction(false);
    }
  };

  const showSendEmailModal = () => {
    emailForm.resetFields();
    // Pré-remplir l'adresse email avec celle du contact si disponible
    if (invoice && invoice.contact) {
      const contact = contacts.find(c => c.id === invoice.contact);
      if (contact && contact.email) {
        emailForm.setFieldsValue({
          recipient_email: contact.email
        });
      }
    }
    setSendEmailModal(true);
  };

  const handleSendEmail = async (values) => {
    setLoadingAction(true);
    try {
      await axios.post(`/api/sales/invoices/${id}/send_by_email/`, values);
      message.success('Email envoyé avec succès');
      setSendEmailModal(false);
      fetchInvoiceDetails();
    } catch (error) {
      console.error("Erreur lors de l'envoi de l'email:", error);
      message.error("Impossible d'envoyer l'email");
    } finally {
      setLoadingAction(false);
    }
  };

  const showAddPaymentModal = () => {
    paymentForm.resetFields();
    paymentForm.setFieldsValue({
      amount: invoice?.amount_due || 0,
      date: moment(),
      method: 'bank_transfer'
    });
    setAddPaymentModal(true);
  };

  const handleAddPayment = async (values) => {
    setLoadingAction(true);
    try {
      const paymentData = {
        ...values,
        invoice: id,
        date: values.date.format('YYYY-MM-DD')
      };
      await axios.post('/api/sales/payments/', paymentData);
      message.success('Paiement ajouté avec succès');
      setAddPaymentModal(false);
      fetchInvoiceDetails();
    } catch (error) {
      console.error("Erreur lors de l'ajout du paiement:", error);
      message.error("Impossible d'ajouter le paiement");
    } finally {
      setLoadingAction(false);
    }
  };

  const showCreateCreditNoteModal = () => {
    creditNoteForm.resetFields();
    creditNoteForm.setFieldsValue({
      amount: invoice?.total || 0,
      reason: "Remboursement"
    });
    setUseFullAmount(true);
    setCreditAmount(invoice?.total || 0);
    setCreateCreditNoteModal(true);
  };

  const handleCreateCreditNote = async (values) => {
    setLoadingAction(true);
    try {
      await axios.post(`/api/sales/invoices/${id}/create_credit_note/`, {
        amount: useFullAmount ? invoice.total : values.amount,
        reason: values.reason
      });
      message.success('Avoir créé avec succès');
      setCreateCreditNoteModal(false);
      fetchInvoiceDetails();
    } catch (error) {
      console.error("Erreur lors de la création de l'avoir:", error);
      message.error("Impossible de créer l'avoir");
    } finally {
      setLoadingAction(false);
    }
  };

  const handleCreditAmountChange = (e) => {
    const value = parseFloat(e.target.value);
    if (!isNaN(value) && value <= invoice.total) {
      setCreditAmount(value);
    }
  };

  const formatStatusTag = (status) => {
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
  };

  const formatTypeTag = (type) => {
    const typeConfig = {
      'standard': { color: 'blue', text: 'Facture standard' },
      'deposit': { color: 'purple', text: 'Facture d\'acompte' },
      'credit_note': { color: 'orange', text: 'Avoir' }
    };

    return (
      <Tag color={typeConfig[type]?.color || 'default'}>
        {typeConfig[type]?.text || type}
      </Tag>
    );
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <Spin size="large" />
      </div>
    );
  }

  if (!invoice) {
    return <div>Facture non trouvée</div>;
  }

  // Colonnes pour le tableau des éléments de la facture
  const itemColumns = [
    {
      title: 'Référence',
      dataIndex: 'product_reference',
      key: 'product_reference',
    },
    {
      title: 'Produit',
      dataIndex: 'product_name',
      key: 'product_name',
    },
    {
      title: 'Description',
      dataIndex: 'description',
      key: 'description',
      render: text => text || '-',
      ellipsis: true,
    },
    {
      title: 'Quantité',
      dataIndex: 'quantity',
      key: 'quantity',
      align: 'right',
    },
    {
      title: 'Prix unitaire',
      dataIndex: 'unit_price',
      key: 'unit_price',
      align: 'right',
      render: (text, record) => `${text} ${invoice.currency_code || ''}`,
    },
    {
      title: 'TVA (%)',
      dataIndex: 'tax_rate',
      key: 'tax_rate',
      align: 'right',
      render: text => `${text}%`,
    },
    {
      title: 'Total HT',
      dataIndex: 'subtotal',
      key: 'subtotal',
      align: 'right',
      render: (text, record) => `${text || (record.quantity * record.unit_price).toFixed(2)} ${invoice.currency_code || ''}`,
    },
  ];

  // Colonnes pour le tableau des paiements
  const paymentColumns = [
    {
      title: 'Date',
      dataIndex: 'date',
      key: 'date',
      render: text => moment(text).format('DD/MM/YYYY'),
    },
    {
      title: 'Montant',
      dataIndex: 'amount',
      key: 'amount',
      align: 'right',
      render: (text) => `${text} ${invoice.currency_code || ''}`,
    },
    {
      title: 'Méthode',
      dataIndex: 'method',
      key: 'method',
      render: (method) => {
        const methodMap = {
          'bank_transfer': 'Virement bancaire',
          'check': 'Chèque',
          'cash': 'Espèces',
          'credit_card': 'Carte de crédit',
          'other': 'Autre'
        };
        return methodMap[method] || method;
      },
    },
    {
      title: 'Référence',
      dataIndex: 'reference',
      key: 'reference',
    },
    {
      title: 'Notes',
      dataIndex: 'notes',
      key: 'notes',
      ellipsis: true,
    },
  ];

  return (
    <div className="invoice-detail">
      <Card>
        <Space style={{ marginBottom: 16 }}>
          <Button icon={<ArrowLeftOutlined />}>
            <Link to="/sales/invoices">Retour à la liste</Link>
          </Button>

          {/* Actions spécifiques selon le type et le statut de la facture */}
          {invoice.type === 'standard' && invoice.payment_status === 'unpaid' && (
            <Button
              type="primary"
              icon={<EditOutlined />}
              onClick={() => navigate(`/sales/invoices/${id}/edit`)}
            >
              Modifier
            </Button>
          )}

          {invoice.payment_status === 'unpaid' && (
            <Button
              type="primary"
              icon={<DollarOutlined />}
              onClick={handleMarkAsPaid}
              loading={loadingAction}
              style={{ backgroundColor: 'green', borderColor: 'green' }}
            >
              Marquer comme payée
            </Button>
          )}

          {invoice.payment_status === 'partial' && (
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={showAddPaymentModal}
              loading={loadingAction}
            >
              Ajouter un paiement
            </Button>
          )}

          {invoice.type === 'standard' && ['paid', 'partial'].includes(invoice.payment_status) && (
            <Button
              type="primary"
              icon={<FileTextOutlined />}
              onClick={showCreateCreditNoteModal}
              loading={loadingAction}
              style={{ backgroundColor: '#fa8c16', borderColor: '#fa8c16' }}
            >
              Créer un avoir
            </Button>
          )}

          {invoice.payment_status === 'unpaid' && invoice.type !== 'credit_note' && (
            <Button
              danger
              icon={<CloseOutlined />}
              onClick={handleCancel}
              loading={loadingAction}
            >
              Annuler
            </Button>
          )}

          <Button
            icon={<FileOutlined />}
            onClick={handleGeneratePdf}
            loading={loadingAction}
          >
            Générer PDF
          </Button>

          <Button
            icon={<MailOutlined />}
            onClick={showSendEmailModal}
            loading={loadingAction}
          >
            Envoyer par email
          </Button>

          {(invoice.payment_status === 'unpaid' && invoice.type === 'standard') && (
            <Popconfirm
              title="Êtes-vous sûr de vouloir supprimer cette facture ?"
              onConfirm={handleDeleteInvoice}
              okText="Oui"
              cancelText="Non"
            >
              <Button danger icon={<DeleteOutlined />} loading={loadingAction}>
                Supprimer
              </Button>
            </Popconfirm>
          )}
        </Space>

        <Title level={2}>Facture {invoice.number}</Title>

        <Space style={{ marginBottom: 16 }}>
          {formatTypeTag(invoice.type)}
          {formatStatusTag(invoice.payment_status)}

          {invoice.parent_invoice && (
            <Badge status="processing" text={
              <span>
                Avoir pour la facture <Link to={`/sales/invoices/${invoice.parent_invoice}`}>{invoice.parent_invoice_number}</Link>
              </span>
            } />
          )}

          {invoice.type === 'deposit' && (
            <Badge status="processing" text="Facture d'acompte" />
          )}
        </Space>

        <Tabs defaultActiveKey="1">
          <TabPane tab="Informations" key="1">
            <Row gutter={[16, 16]}>
              <Col xs={24} md={16}>
                <Card title="Détails de la facture" style={{ marginBottom: 16 }}>
                  <Descriptions bordered column={{ xxl: 2, xl: 2, lg: 2, md: 1, sm: 1, xs: 1 }}>
                    <Descriptions.Item label="Numéro">{invoice.number}</Descriptions.Item>
                    <Descriptions.Item label="Type">{
                      invoice.type === 'standard' ? 'Facture standard' :
                      invoice.type === 'deposit' ? 'Facture d\'acompte' :
                      invoice.type === 'credit_note' ? 'Avoir' : invoice.type
                    }</Descriptions.Item>
                    <Descriptions.Item label="Date d'émission">{invoice.date}</Descriptions.Item>
                    <Descriptions.Item label="Date d'échéance">{invoice.due_date}</Descriptions.Item>
                    <Descriptions.Item label="Entreprise">
                      <Link to={`/crm/companies/${invoice.company}`}>{invoice.company_name}</Link>
                    </Descriptions.Item>
                    <Descriptions.Item label="Contact">
                      {invoice.contact ? (
                        <Link to={`/crm/contacts/${invoice.contact}`}>{invoice.contact_name}</Link>
                      ) : '-'}
                    </Descriptions.Item>
                    <Descriptions.Item label="Statut de paiement">
                      {formatStatusTag(invoice.payment_status)}
                    </Descriptions.Item>
                    <Descriptions.Item label="Conditions de paiement">
                      {
                        invoice.payment_terms === 'immediate' ? 'Paiement immédiat' :
                        invoice.payment_terms === '30_days' ? 'Paiement à 30 jours' :
                        invoice.payment_terms === '60_days' ? 'Paiement à 60 jours' :
                        invoice.payment_terms
                      }
                    </Descriptions.Item>
                    {invoice.discount_percentage > 0 && (
                      <Descriptions.Item label="Remise">{invoice.discount_percentage}%</Descriptions.Item>
                    )}
                    <Descriptions.Item label="Exonération TVA">
                      {invoice.is_tax_exempt ? 'Oui' : 'Non'}
                    </Descriptions.Item>
                    {invoice.is_tax_exempt && invoice.tax_exemption_reason && (
                      <Descriptions.Item label="Raison d'exonération">{invoice.tax_exemption_reason}</Descriptions.Item>
                    )}
                    {invoice.credit_note_reason && (
                      <Descriptions.Item label="Motif de l'avoir" span={2}>{invoice.credit_note_reason}</Descriptions.Item>
                    )}
                    {invoice.quote && (
                      <Descriptions.Item label="Devis d'origine">
                        <Link to={`/sales/quotes/${invoice.quote}`}>{invoice.quote_number}</Link>
                      </Descriptions.Item>
                    )}
                    {invoice.order && (
                      <Descriptions.Item label="Commande d'origine">
                        <Link to={`/sales/orders/${invoice.order}`}>{invoice.order_number}</Link>
                      </Descriptions.Item>
                    )}
                    {invoice.notes && (
                      <Descriptions.Item label="Notes" span={2}>{invoice.notes}</Descriptions.Item>
                    )}
                    {invoice.terms && (
                      <Descriptions.Item label="Conditions" span={2}>{invoice.terms}</Descriptions.Item>
                    )}
                  </Descriptions>
                </Card>
              </Col>

              <Col xs={24} md={8}>
                <Card title="Résumé financier">
                  <Statistic
                    title="Sous-total HT"
                    value={invoice.subtotal}
                    precision={2}
                    suffix={invoice.currency_code}
                  />

                  {invoice.discount_percentage > 0 && (
                    <>
                      <Statistic
                        title={`Remise (${invoice.discount_percentage}%)`}
                        value={invoice.discount_amount || 0}
                        precision={2}
                        suffix={invoice.currency_code}
                        style={{ marginTop: 16 }}
                      />
                      <Statistic
                        title="Sous-total après remise"
                        value={invoice.subtotal_after_discount || 0}
                        precision={2}
                        suffix={invoice.currency_code}
                        style={{ marginTop: 16 }}
                      />
                    </>
                  )}

                  {!invoice.is_tax_exempt && (
                    <Statistic
                      title="TVA"
                      value={invoice.tax_amount}
                      precision={2}
                      suffix={invoice.currency_code}
                      style={{ marginTop: 16 }}
                    />
                  )}

                  <Statistic
                    title={`Total${!invoice.is_tax_exempt ? ' TTC' : ''}`}
                    value={invoice.total}
                    precision={2}
                    suffix={invoice.currency_code}
                    style={{ marginTop: 16 }}
                    valueStyle={{ color: '#3f8600', fontWeight: 'bold' }}
                  />

                  <Divider />

                  <Statistic
                    title="Montant payé"
                    value={invoice.amount_paid}
                    precision={2}
                    suffix={invoice.currency_code}
                    style={{ marginTop: 16 }}
                    valueStyle={{ color: '#3f8600' }}
                  />

                  <Statistic
                    title="Reste à payer"
                    value={invoice.amount_due}
                    precision={2}
                    suffix={invoice.currency_code}
                    style={{ marginTop: 16 }}
                    valueStyle={{ 
                      color: invoice.amount_due > 0 
                        ? (invoice.payment_status === 'overdue' ? '#cf1322' : '#1890ff') 
                        : '#3f8600' 
                    }}
                  />
                </Card>

                {/* Si c'est une facture d'acompte, afficher l'information sur la commande */}
                {invoice.type === 'deposit' && invoice.order && (
                  <Card title="Information sur l'acompte" style={{ marginTop: 16 }}>
                    <p>Cette facture est un acompte de {invoice.deposit_percentage || 30}% sur la commande <Link to={`/sales/orders/${invoice.order}`}>{invoice.order_number}</Link>.</p>
                    {invoice.remaining_amount > 0 && (
                      <Alert
                        message={`Reste à facturer: ${invoice.remaining_amount} ${invoice.currency_code}`}
                        type="info"
                        showIcon
                      />
                    )}
                  </Card>
                )}
              </Col>
            </Row>

            <Card title="Produits et services" style={{ marginTop: 16 }}>
              <Table
                columns={itemColumns}
                dataSource={items}
                rowKey="id"
                pagination={false}
                summary={() => (
                  <Table.Summary>
                    <Table.Summary.Row>
                      <Table.Summary.Cell index={0} colSpan={6} align="right">
                        <strong>Sous-total HT:</strong>
                      </Table.Summary.Cell>
                      <Table.Summary.Cell index={1} align="right">
                        <strong>{invoice.subtotal} {invoice.currency_code}</strong>
                      </Table.Summary.Cell>
                    </Table.Summary.Row>

                    {invoice.discount_percentage > 0 && (
                      <>
                        <Table.Summary.Row>
                          <Table.Summary.Cell index={0} colSpan={6} align="right">
                            Remise ({invoice.discount_percentage}%):
                          </Table.Summary.Cell>
                          <Table.Summary.Cell index={1} align="right">
                            -{invoice.discount_amount} {invoice.currency_code}
                          </Table.Summary.Cell>
                        </Table.Summary.Row>
                        <Table.Summary.Row>
                          <Table.Summary.Cell index={0} colSpan={6} align="right">
                            Sous-total après remise:
                          </Table.Summary.Cell>
                          <Table.Summary.Cell index={1} align="right">
                            {invoice.subtotal_after_discount} {invoice.currency_code}
                          </Table.Summary.Cell>
                        </Table.Summary.Row>
                      </>
                    )}

                    {!invoice.is_tax_exempt && (
                      <Table.Summary.Row>
                        <Table.Summary.Cell index={0} colSpan={6} align="right">
                          TVA:
                        </Table.Summary.Cell>
                        <Table.Summary.Cell index={1} align="right">
                          {invoice.tax_amount} {invoice.currency_code}
                        </Table.Summary.Cell>
                      </Table.Summary.Row>
                    )}

                    <Table.Summary.Row>
                      <Table.Summary.Cell index={0} colSpan={6} align="right">
                        <strong>Total{!invoice.is_tax_exempt ? ' TTC' : ''}:</strong>
                      </Table.Summary.Cell>
                      <Table.Summary.Cell index={1} align="right">
                        <strong>{invoice.total} {invoice.currency_code}</strong>
                      </Table.Summary.Cell>
                    </Table.Summary.Row>
                  </Table.Summary>
                )}
              />
            </Card>

            {payments.length > 0 && (
              <Card title="Paiements reçus" style={{ marginTop: 16 }}>
                <Table
                  columns={paymentColumns}
                  dataSource={payments}
                  rowKey="id"
                  pagination={false}
                  summary={() => (
                    <Table.Summary>
                      <Table.Summary.Row>
                        <Table.Summary.Cell index={0} colSpan={1} align="right">
                          <strong>Total des paiements:</strong>
                        </Table.Summary.Cell>
                        <Table.Summary.Cell index={1} align="right">
                          <strong>{invoice.amount_paid} {invoice.currency_code}</strong>
                        </Table.Summary.Cell>
                        <Table.Summary.Cell index={2} colSpan={3}></Table.Summary.Cell>
                      </Table.Summary.Row>
                      <Table.Summary.Row>
                        <Table.Summary.Cell index={0} colSpan={1} align="right">
                          <strong>Reste à payer:</strong>
                        </Table.Summary.Cell>
                        <Table.Summary.Cell index={1} align="right">
                          <strong>{invoice.amount_due} {invoice.currency_code}</strong>
                        </Table.Summary.Cell>
                        <Table.Summary.Cell index={2} colSpan={3}></Table.Summary.Cell>
                      </Table.Summary.Row>
                    </Table.Summary>
                  )}
                />
                {invoice.amount_due > 0 && invoice.payment_status !== 'cancelled' && (
                  <div style={{ marginTop: 16, textAlign: 'right' }}>
                    <Button
                      type="primary"
                      icon={<PlusOutlined />}
                      onClick={showAddPaymentModal}
                    >
                      Ajouter un paiement
                    </Button>
                  </div>
                )}
              </Card>
            )}

            {payments.length === 0 && invoice.payment_status !== 'paid' && invoice.payment_status !== 'cancelled' && (
              <Card title="Paiements" style={{ marginTop: 16 }}>
                <div style={{ textAlign: 'center', padding: '20px 0' }}>
                  <p>Aucun paiement enregistré pour cette facture.</p>
                  <Button
                    type="primary"
                    icon={<PlusOutlined />}
                    onClick={showAddPaymentModal}
                    style={{ marginTop: 16 }}
                  >
                    Ajouter un paiement
                  </Button>
                </div>
              </Card>
            )}

            {(invoice.type === 'credit_note' && invoice.parent_invoice) && (
              <Alert
                message="Information sur l'avoir"
                description={
                  <p>
                    Cet avoir a été créé pour la facture <Link to={`/sales/invoices/${invoice.parent_invoice}`}>{invoice.parent_invoice_number}</Link>.
                    {invoice.credit_note_reason && (
                      <div>Motif: {invoice.credit_note_reason}</div>
                    )}
                  </p>
                }
                type="info"
                showIcon
                style={{ marginTop: 16 }}
              />
            )}
          </TabPane>

          <TabPane tab={<span><TeamOutlined /> Contacts</span>} key="2">
            <List
              itemLayout="horizontal"
              dataSource={contacts}
              renderItem={item => (
                <List.Item
                  actions={[
                    <Link to={`/crm/contacts/${item.id}`}>Détails</Link>
                  ]}
                >
                  <List.Item.Meta
                    avatar={<Avatar icon={<UserOutlined />} />}
                    title={<Link to={`/crm/contacts/${item.id}`}>{item.first_name} {item.last_name}</Link>}
                    description={
                      <>
                        <div>{item.title} {item.company_name && `chez ${item.company_name}`}</div>
                        <div>
                          {item.email && <><MailOutlined /> {item.email} </>}
                          {item.phone && <><PhoneOutlined /> {item.phone}</>}
                        </div>
                      </>
                    }
                  />
                </List.Item>
              )}
              locale={{ emptyText: "Aucun contact associé à cette entreprise" }}
            />
          </TabPane>

          <TabPane tab={<span><HistoryOutlined /> Historique</span>} key="3">
            <Timeline mode="left">
              <Timeline.Item label={invoice.created_at}>
                <p><strong>Création de la facture</strong></p>
                <p>Type: {
                  invoice.type === 'standard' ? 'Facture standard' :
                  invoice.type === 'deposit' ? 'Facture d\'acompte' :
                  invoice.type === 'credit_note' ? 'Avoir' : invoice.type
                }</p>
                <p>Statut initial: Non payée</p>
              </Timeline.Item>

              {payments.map(payment => (
                <Timeline.Item
                  key={payment.id}
                  color="green"
                  label={payment.date}
                >
                  <p>
                    <strong>Paiement reçu</strong>
                  </p>
                  <p>Montant: {payment.amount} {invoice.currency_code}</p>
                  <p>Méthode: {
                    payment.method === 'bank_transfer' ? 'Virement bancaire' :
                    payment.method === 'check' ? 'Chèque' :
                    payment.method === 'cash' ? 'Espèces' :
                    payment.method === 'credit_card' ? 'Carte de crédit' :
                    payment.method
                  }</p>
                  {payment.reference && <p>Référence: {payment.reference}</p>}
                </Timeline.Item>
              ))}

              {invoice.email_sent && invoice.email_sent_date && (
                <Timeline.Item color="blue" label={invoice.email_sent_date}>
                  <p><strong>Envoi par email</strong></p>
                  <p>La facture a été envoyée au client</p>
                </Timeline.Item>
              )}

              {invoice.payment_status === 'paid' && (
                <Timeline.Item color="green">
                  <p><strong>Facture entièrement payée</strong></p>
                </Timeline.Item>
              )}

              {invoice.payment_status === 'cancelled' && (
                <Timeline.Item color="red">
                  <p><strong>Facture annulée</strong></p>
                </Timeline.Item>
              )}
            </Timeline>
          </TabPane>

          {(invoice.type === 'standard' || invoice.type === 'deposit') && (
            <TabPane tab={<span><FileTextOutlined /> Documents liés</span>} key="4">
              {invoice.order && (
                <Card title="Commande d'origine" style={{ marginBottom: 16 }}>
                  <Descriptions bordered column={1}>
                    <Descriptions.Item label="Numéro">
                      <Link to={`/sales/orders/${invoice.order}`}>{invoice.order_number}</Link>
                    </Descriptions.Item>
                    <Descriptions.Item label="Date">
                      {invoice.order_date || "N/A"}
                    </Descriptions.Item>
                    <Descriptions.Item label="Total">
                      {invoice.order_total || invoice.total} {invoice.currency_code}
                    </Descriptions.Item>
                  </Descriptions>
                </Card>
              )}

              {invoice.quote && (
                <Card title="Devis d'origine" style={{ marginBottom: 16 }}>
                  <Descriptions bordered column={1}>
                    <Descriptions.Item label="Numéro">
                      <Link to={`/sales/quotes/${invoice.quote}`}>{invoice.quote_number}</Link>
                    </Descriptions.Item>
                    <Descriptions.Item label="Date">
                      {invoice.quote_date || "N/A"}
                    </Descriptions.Item>
                    <Descriptions.Item label="Total">
                      {invoice.quote_total || invoice.total} {invoice.currency_code}
                    </Descriptions.Item>
                  </Descriptions>
                </Card>
              )}

              {invoice.child_invoices && invoice.child_invoices.length > 0 && (
                <Card title="Avoirs liés" style={{ marginBottom: 16 }}>
                  <List
                    bordered
                    dataSource={invoice.child_invoices}
                    renderItem={item => (
                      <List.Item
                        actions={[
                          <Link to={`/sales/invoices/${item.id}`}>Voir</Link>
                        ]}
                      >
                        <List.Item.Meta
                          title={<Link to={`/sales/invoices/${item.id}`}>Avoir {item.number}</Link>}
                          description={
                            <>
                              <div>Date: {item.date}</div>
                              <div>Montant: {item.total} {invoice.currency_code}</div>
                            </>
                          }
                        />
                      </List.Item>
                    )}
                  />
                </Card>
              )}

              {invoice.parent_invoice && (
                <Card title="Facture d'origine" style={{ marginBottom: 16 }}>
                  <Descriptions bordered column={1}>
                    <Descriptions.Item label="Numéro">
                      <Link to={`/sales/invoices/${invoice.parent_invoice}`}>{invoice.parent_invoice_number}</Link>
                    </Descriptions.Item>
                    <Descriptions.Item label="Type">
                      {invoice.parent_invoice_type === 'standard' ? 'Facture standard' :
                       invoice.parent_invoice_type === 'deposit' ? 'Facture d\'acompte' : 
                       invoice.parent_invoice_type}
                    </Descriptions.Item>
                    <Descriptions.Item label="Date">
                      {invoice.parent_invoice_date || "N/A"}
                    </Descriptions.Item>
                    <Descriptions.Item label="Total">
                      {invoice.parent_invoice_total || "N/A"} {invoice.currency_code}
                    </Descriptions.Item>
                  </Descriptions>
                </Card>
              )}

              {!(invoice.order || invoice.quote || (invoice.child_invoices && invoice.child_invoices.length > 0) || invoice.parent_invoice) && (
                <div style={{ textAlign: 'center', marginTop: 20 }}>
                  <p>Aucun document lié à cette facture pour le moment</p>
                </div>
              )}
            </TabPane>
          )}
        </Tabs>
      </Card>

      {/* Modal pour l'envoi d'email */}
      <Modal
        title="Envoyer la facture par email"
        visible={sendEmailModal}
        onCancel={() => setSendEmailModal(false)}
        footer={null}
      >
        <Form
          form={emailForm}
          layout="vertical"
          onFinish={handleSendEmail}
        >
          <Form.Item
            name="recipient_email"
            label="Email du destinataire"
            rules={[
              { required: true, message: 'Veuillez saisir l\'email du destinataire' },
              { type: 'email', message: 'Format d\'email invalide' }
            ]}
          >
            <Input placeholder="exemple@domaine.com" />
          </Form.Item>

          <Form.Item
            name="subject"
            label="Objet"
          >
            <Input placeholder={`Facture ${invoice.number} - ECINTELLIGENCE`} />
          </Form.Item>

          <Form.Item
            name="message"
            label="Message additionnel"
          >
            <TextArea rows={4} placeholder="Votre message personnalisé (optionnel)" />
          </Form.Item>

          <Form.Item>
            <div style={{ textAlign: 'right' }}>
              <Button onClick={() => setSendEmailModal(false)} style={{ marginRight: 8 }}>
                Annuler
              </Button>
              <Button type="primary" htmlType="submit" loading={loadingAction}>
                Envoyer
              </Button>
            </div>
          </Form.Item>
        </Form>
      </Modal>

      {/* Modal pour l'ajout d'un paiement */}
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
            name="amount"
            label="Montant"
            rules={[
              { required: true, message: 'Veuillez saisir le montant' },
              { 
                validator: (_, value) => {
                  if (value <= 0) {
                    return Promise.reject('Le montant doit être supérieur à 0');
                  }
                  if (value > invoice.amount_due) {
                    return Promise.reject(`Le montant ne peut pas dépasser le reste à payer (${invoice.amount_due} ${invoice.currency_code})`);
                  }
                  return Promise.resolve();
                } 
              }
            ]}
          >
            <Input type="number" step="0.01" addonAfter={invoice.currency_code} />
          </Form.Item>

          <Form.Item
            name="date"
            label="Date du paiement"
            rules={[
              { required: true, message: 'Veuillez sélectionner la date du paiement' }
            ]}
          >
            <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
          </Form.Item>

          <Form.Item
            name="method"
            label="Méthode de paiement"
            rules={[
              { required: true, message: 'Veuillez sélectionner la méthode de paiement' }
            ]}
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
              <Button type="primary" htmlType="submit" loading={loadingAction}>
                Enregistrer
              </Button>
            </div>
          </Form.Item>
        </Form>
      </Modal>

      {/* Modal pour la création d'un avoir */}
      <Modal
        title="Créer un avoir"
        visible={createCreditNoteModal}
        onCancel={() => setCreateCreditNoteModal(false)}
        footer={null}
      >
        <Form
          form={creditNoteForm}
          layout="vertical"
          onFinish={handleCreateCreditNote}
        >
          <Form.Item
            label="Type d'avoir"
          >
            <Radio.Group value={useFullAmount} onChange={e => setUseFullAmount(e.target.value)}>
              <Radio value={true}>Avoir total</Radio>
              <Radio value={false}>Avoir partiel</Radio>
            </Radio.Group>
          </Form.Item>

          <Form.Item
            name="amount"
            label="Montant"
            rules={[
              { required: !useFullAmount, message: 'Veuillez saisir le montant' },
              { 
                validator: (_, value) => {
                  if (!useFullAmount && (value <= 0 || value > invoice.total)) {
                    return Promise.reject(`Le montant doit être compris entre 0 et ${invoice.total} ${invoice.currency_code}`);
                  }
                  return Promise.resolve();
                } 
              }
            ]}
          >
            <Input 
              type="number" 
              step="0.01" 
              addonAfter={invoice.currency_code}
              disabled={useFullAmount}
              onChange={handleCreditAmountChange}
            />
          </Form.Item>

          <Form.Item
            name="reason"
            label="Motif de l'avoir"
            rules={[
              { required: true, message: 'Veuillez saisir le motif de l\'avoir' }
            ]}
          >
            <TextArea rows={3} placeholder="Motif de l'avoir (remboursement, correction, etc.)" />
          </Form.Item>

          <Alert
            message="Informations sur l'avoir"
            description={
              <>
                <p>
                  Un avoir va être créé pour {useFullAmount ? 'la totalité' : 'une partie'} de la facture {invoice.number}.
                </p>
                <p>
                  Montant de l'avoir : {useFullAmount ? invoice.total : creditAmount} {invoice.currency_code}
                </p>
                {invoice.payment_status === 'paid' && (
                  <p>
                    <strong>Attention :</strong> Cette facture est déjà payée. Créer un avoir total annulera le statut de paiement.
                  </p>
                )}
              </>
            }
            type="info"
            showIcon
            style={{ marginBottom: 16 }}
          />

          <Form.Item>
            <div style={{ textAlign: 'right' }}>
              <Button onClick={() => setCreateCreditNoteModal(false)} style={{ marginRight: 8 }}>
                Annuler
              </Button>
              <Button type="primary" htmlType="submit" loading={loadingAction}>
                Créer l'avoir
              </Button>
            </div>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default InvoiceDetail;
