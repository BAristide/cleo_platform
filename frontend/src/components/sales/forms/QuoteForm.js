// src/components/sales/forms/QuoteForm.js
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Form, Input, Button, Select, DatePicker, InputNumber, Card, Row, Col,
  Typography, Spin, message, Divider, Space, Switch, Table, Popconfirm
} from 'antd';
import {
  PlusOutlined, DeleteOutlined, SaveOutlined, ArrowLeftOutlined,
  TagOutlined, BankOutlined, DollarOutlined
} from '@ant-design/icons';
import axios from '../../../utils/axiosConfig';
import moment from 'moment';
import { extractResultsFromResponse } from '../../../utils/apiUtils';

const { Title, Text } = Typography;
const { Option } = Select;
const { TextArea } = Input;

const QuoteForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const isEditMode = !!id;

  const [loading, setLoading] = useState(isEditMode);
  const [submitting, setSubmitting] = useState(false);
  const [companies, setCompanies] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [contactOptions, setContactOptions] = useState([]);
  const [selectedCompany, setSelectedCompany] = useState(null);
  const [currencies, setCurrencies] = useState([]);
  const [bankAccounts, setBankAccounts] = useState([]);
  const [filteredBankAccounts, setFilteredBankAccounts] = useState([]);
  const [products, setProducts] = useState([]);
  const [quoteItems, setQuoteItems] = useState([]);
  const [newProductVisible, setNewProductVisible] = useState(false);
  const [currentProduct, setCurrentProduct] = useState(null);
  const [currentQuantity, setCurrentQuantity] = useState(1);
  const [currentDescription, setCurrentDescription] = useState('');
  const [isExempt, setIsExempt] = useState(false);

  // États pour les calculs financiers
  const [subtotal, setSubtotal] = useState(0);
  const [discountAmount, setDiscountAmount] = useState(0);
  const [subtotalAfterDiscount, setSubtotalAfterDiscount] = useState(0);
  const [taxAmount, setTaxAmount] = useState(0);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    fetchInitialData();
    if (isEditMode) {
      fetchQuoteDetails();
    }
  }, [id]);

  const fetchInitialData = async () => {
    try {
      const [companiesRes, currenciesRes, bankAccountsRes, productsRes] = await Promise.all([
        axios.get('/api/crm/companies/'),
        axios.get('/api/core/currencies/'),
        axios.get('/api/sales/bank-accounts/'),
        axios.get('/api/sales/products/')
      ]);

      const companiesData = extractResultsFromResponse(companiesRes);
      const currenciesData = extractResultsFromResponse(currenciesRes);
      const bankAccountsData = extractResultsFromResponse(bankAccountsRes);
      const productsData = extractResultsFromResponse(productsRes);

      setCompanies(companiesData);
      setCurrencies(currenciesData);
      setBankAccounts(bankAccountsData);
      setProducts(productsData);

      // Initialiser le formulaire avec des valeurs par défaut si en mode création
      if (!isEditMode) {
        const defaultCurrency = currenciesData.find(c => c.is_default) || (currenciesData.length > 0 ? currenciesData[0] : null);
        if (defaultCurrency) {
          const defaultBankAccounts = bankAccountsData.filter(ba => ba.currency === defaultCurrency.id);
          setFilteredBankAccounts(defaultBankAccounts);

          form.setFieldsValue({
            date: moment(),
            validity_period: 20,
            currency: defaultCurrency.id,
            payment_terms: '30_days',
            bank_account: defaultBankAccounts.length > 0 ? defaultBankAccounts[0].id : null,
            discount_percentage: 0,
            is_tax_exempt: false
          });
        }
      }
    } catch (error) {
      console.error("Erreur lors du chargement des données initiales:", error);
      message.error("Impossible de charger les données nécessaires");
    }
  };

  const fetchQuoteDetails = async () => {
    setLoading(true);
    try {
      // Récupérer les détails du devis
      const quoteResponse = await axios.get(`/api/sales/quotes/${id}/`);
      const quoteData = quoteResponse.data;

      // Récupérer les contacts de l'entreprise
      if (quoteData.company) {
        await fetchContactsByCompany(quoteData.company);
        setSelectedCompany(quoteData.company);
      }

      // Filtrer les comptes bancaires par devise
      if (quoteData.currency) {
        const filteredAccounts = bankAccounts.filter(ba => ba.currency === quoteData.currency);
        setFilteredBankAccounts(filteredAccounts);
      }

      // Mettre à jour la forme
      form.setFieldsValue({
        ...quoteData,
        date: quoteData.date ? moment(quoteData.date) : null,
        expiration_date: quoteData.expiration_date ? moment(quoteData.expiration_date) : null,
      });

      // Récupérer les éléments du devis
      const itemsResponse = await axios.get(`/api/sales/quote-items/?quote=${id}`);
      const itemsData = extractResultsFromResponse(itemsResponse);
      setQuoteItems(itemsData);

      // Mettre à jour l'état d'exonération de TVA
      setIsExempt(quoteData.is_tax_exempt || false);

      // Calculer les totaux
      calculateTotals(itemsData, quoteData.discount_percentage || 0, quoteData.is_tax_exempt || false);
    } catch (error) {
      console.error("Erreur lors de la récupération des détails du devis:", error);
      message.error("Impossible de charger les détails du devis");
    } finally {
      setLoading(false);
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

      const options = contactsData.map(contact => ({
        value: contact.id,
        label: contact.full_name || `Contact #${contact.id}`,
      }));

      setContactOptions(options);
      setContacts(contactsData);
    } catch (error) {
      console.error("Erreur lors de la récupération des contacts:", error);
      message.error("Impossible de charger les contacts");
      setContactOptions([]);
    }
  };

  const handleCompanyChange = (value) => {
    setSelectedCompany(value);
    form.setFieldsValue({ contact: undefined });
    fetchContactsByCompany(value);
  };

  const handleCurrencyChange = (value) => {
    const filtered = bankAccounts.filter(ba => ba.currency === value);
    setFilteredBankAccounts(filtered);

    // Si pas de compte bancaire pour cette devise, réinitialiser la sélection
    if (filtered.length === 0) {
      form.setFieldsValue({ bank_account: undefined });
    } else {
      // Sélectionner le compte par défaut ou le premier compte disponible
      const defaultAccount = filtered.find(ba => ba.is_default);
      form.setFieldsValue({ bank_account: defaultAccount ? defaultAccount.id : filtered[0].id });
    }

    // Vérifier si c'est une devise étrangère (différente de MAD)
    const isForeignCurrency = value !== 1; // On assume que l'ID 1 correspond au MAD
    if (isForeignCurrency) {
      setIsExempt(true);
      form.setFieldsValue({
        is_tax_exempt: true,
        tax_exemption_reason: "Exonération de TVA pour facturation en devise étrangère"
      });
    } else {
      setIsExempt(false);
      form.setFieldsValue({
        is_tax_exempt: false,
        tax_exemption_reason: null
      });
    }

    // Recalculer les totaux
    calculateTotals(quoteItems, form.getFieldValue('discount_percentage') || 0, isForeignCurrency);
  };

  const handleExemptChange = (checked) => {
    setIsExempt(checked);

    // Si exonération activée, suggérer une raison
    if (checked) {
      form.setFieldsValue({
        tax_exemption_reason: "Exonération de TVA pour facturation en devise étrangère"
      });
    } else {
      form.setFieldsValue({ tax_exemption_reason: null });
    }

    // Recalculer les totaux
    calculateTotals(quoteItems, form.getFieldValue('discount_percentage') || 0, checked);
  };

  const handleDiscountChange = (value) => {
    calculateTotals(quoteItems, value || 0, isExempt);
  };

  const calculateTotals = (items, discountPercentage, taxExempt) => {
    const itemsSubtotal = items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);

    // Calculer le montant de la remise
    const discount = (itemsSubtotal * discountPercentage) / 100;
    const afterDiscount = itemsSubtotal - discount;

    // Calculer la TVA (sauf si exonéré)
    let tax = 0;
    if (!taxExempt) {
      tax = items.reduce((sum, item) => {
        const itemSubtotal = item.quantity * item.unit_price;
        const itemDiscountAmount = (itemSubtotal / itemsSubtotal) * discount;
        const itemAfterDiscount = itemSubtotal - itemDiscountAmount;
        return sum + (itemAfterDiscount * (item.tax_rate / 100));
      }, 0);
    }

    const totalAmount = afterDiscount + tax;

    setSubtotal(itemsSubtotal);
    setDiscountAmount(discount);
    setSubtotalAfterDiscount(afterDiscount);
    setTaxAmount(tax);
    setTotal(totalAmount);
  };

  const handleAddItem = () => {
    if (!currentProduct) {
      message.error("Veuillez sélectionner un produit");
      return;
    }

    if (currentQuantity <= 0) {
      message.error("La quantité doit être supérieure à 0");
      return;
    }

    const product = products.find(p => p.id === currentProduct);
    if (!product) {
      message.error("Produit non trouvé");
      return;
    }

    // Créer le nouvel élément
    const newItem = {
      id: `temp_${Date.now()}`,  // ID temporaire pour l'UI
      product: product.id,
      product_name: product.name,
      product_reference: product.reference,
      description: currentDescription || product.description,
      quantity: currentQuantity,
      unit_price: product.unit_price,
      tax_rate: product.tax_rate,
      subtotal: product.unit_price * currentQuantity,
      tax_amount: isExempt ? 0 : (product.unit_price * currentQuantity * (product.tax_rate / 100)),
      total: product.unit_price * currentQuantity * (isExempt ? 1 : (1 + product.tax_rate / 100))
    };

    // Ajouter l'élément à la liste
    const updatedItems = [...quoteItems, newItem];
    setQuoteItems(updatedItems);

    // Recalculer les totaux
    calculateTotals(updatedItems, form.getFieldValue('discount_percentage') || 0, isExempt);

    // Réinitialiser le formulaire d'ajout
    setCurrentProduct(null);
    setCurrentQuantity(1);
    setCurrentDescription('');
    setNewProductVisible(false);
  };

  const handleRemoveItem = (itemId) => {
    const updatedItems = quoteItems.filter(item => item.id !== itemId);
    setQuoteItems(updatedItems);

    // Recalculer les totaux
    calculateTotals(updatedItems, form.getFieldValue('discount_percentage') || 0, isExempt);
  };

  const onFinish = async (values) => {
    if (quoteItems.length === 0) {
      message.error("Veuillez ajouter au moins un produit au devis");
      return;
    }

    setSubmitting(true);
    try {
      // Formater les données pour l'API
      const formData = {
        ...values,
        date: values.date.format('YYYY-MM-DD'),
        is_tax_exempt: isExempt,
        // Pas besoin d'envoyer les montants calculés, ils seront recalculés par le backend
      };

      let quoteId;

      // Créer ou mettre à jour le devis
      if (isEditMode) {
        await axios.put(`/api/sales/quotes/${id}/`, formData);
        quoteId = id;
        message.success("Devis mis à jour avec succès");
      } else {
        const response = await axios.post('/api/sales/quotes/', formData);
        quoteId = response.data.id;
        message.success("Devis créé avec succès");
      }

      // Pour chaque élément temporaire, créer un élément réel
      for (const item of quoteItems) {
        const itemData = {
          quote: quoteId,
          product: item.product,
          description: item.description,
          quantity: item.quantity,
          unit_price: item.unit_price,
          tax_rate: item.tax_rate
        };

        if (item.id && item.id.toString().startsWith('temp_')) {
          // Nouvel élément
          await axios.post('/api/sales/quote-items/', itemData);
        } else {
          // Élément existant à mettre à jour
          await axios.put(`/api/sales/quote-items/${item.id}/`, itemData);
        }
      }

      // Naviguer vers la page de détail du devis
      navigate(`/sales/quotes/${quoteId}`);
    } catch (error) {
      console.error("Erreur lors de l'enregistrement du devis:", error);
      if (error.response && error.response.data) {
        const errors = error.response.data;
        const errorMessages = Object.entries(errors)
          .map(([field, msgs]) => `${field}: ${Array.isArray(msgs) ? msgs.join(', ') : msgs}`)
          .join(' | ');
        message.error(`Erreur de validation : ${errorMessages}`);
      } else {
        message.error("Impossible d'enregistrer le devis");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const itemColumns = [
    {
      title: 'Référence',
      dataIndex: 'product_reference',
      key: 'reference',
    },
    {
      title: 'Produit',
      dataIndex: 'product_name',
      key: 'product',
    },
    {
      title: 'Description',
      dataIndex: 'description',
      key: 'description',
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
      render: (text, record) => {
        const currency = currencies.find(c => c.id === form.getFieldValue('currency'));
        return `${text} ${currency ? currency.code : ''}`;
      },
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
      key: 'subtotal',
      align: 'right',
      render: (_, record) => {
        const subtotal = record.quantity * record.unit_price;
        const currency = currencies.find(c => c.id === form.getFieldValue('currency'));
        return `${subtotal.toFixed(2)} ${currency ? currency.code : ''}`;
      },
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Popconfirm
          title="Êtes-vous sûr de vouloir supprimer cet élément?"
          onConfirm={() => handleRemoveItem(record.id)}
          okText="Oui"
          cancelText="Non"
        >
          <Button
            danger
            icon={<DeleteOutlined />}
            size="small"
          />
        </Popconfirm>
      ),
    },
  ];

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <Card title={isEditMode ? "Modifier le devis" : "Nouveau devis"}>
      <Button
        icon={<ArrowLeftOutlined />}
        onClick={() => navigate(-1)}
        style={{ marginBottom: 16 }}
      >
        Retour
      </Button>

      <Form
        form={form}
        layout="vertical"
        onFinish={onFinish}
        initialValues={{
          date: moment(),
          validity_period: 20,
          payment_terms: '30_days',
          discount_percentage: 0,
          is_tax_exempt: false
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
                disabled={isEditMode}
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
                disabled={!selectedCompany || isEditMode}
                options={contactOptions}
              />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={8}>
            <Form.Item
              name="date"
              label="Date d'émission"
              rules={[{ required: true, message: 'Veuillez sélectionner une date' }]}
            >
              <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item
              name="validity_period"
              label="Validité (jours)"
              rules={[{ required: true, message: 'Veuillez indiquer une durée de validité' }]}
            >
              <InputNumber style={{ width: '100%' }} min={1} />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item
              name="status"
              label="Statut"
              rules={[{ required: true, message: 'Veuillez sélectionner un statut' }]}
              initialValue="draft"
            >
              <Select placeholder="Sélectionner un statut">
                <Option value="draft">Brouillon</Option>
                <Option value="sent">Envoyé</Option>
                <Option value="accepted">Accepté</Option>
                <Option value="rejected">Refusé</Option>
                <Option value="cancelled">Annulé</Option>
              </Select>
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
              <Select
                placeholder="Sélectionner une devise"
                onChange={handleCurrencyChange}
              >
                {currencies.map(currency => (
                  <Option key={currency.id} value={currency.id}>{currency.code} - {currency.name}</Option>
                ))}
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
              name="bank_account"
              label="Compte bancaire"
              rules={[{ required: true, message: 'Veuillez sélectionner un compte bancaire' }]}
            >
              <Select placeholder="Sélectionner un compte bancaire">
                {filteredBankAccounts.map(account => (
                  <Option key={account.id} value={account.id}>
                    {account.name} - {account.bank_name}
                  </Option>
                ))}
              </Select>
            </Form.Item>
          </Col>
        </Row>

        <Divider>Produits et services</Divider>

        <div style={{ marginBottom: 16 }}>
          {newProductVisible ? (
            <Card size="small" title="Ajouter un produit">
              <Row gutter={16}>
                <Col span={10}>
                  <Form.Item
                    label="Produit"
                    required
                  >
                    <Select
                      placeholder="Sélectionner un produit"
                      value={currentProduct}
                      onChange={setCurrentProduct}
                      style={{ width: '100%' }}
                    >
                      {products.map(product => (
                        <Option key={product.id} value={product.id}>
                          {product.reference} - {product.name} ({product.unit_price} {product.currency_code})
                        </Option>
                      ))}
                    </Select>
                  </Form.Item>
                </Col>
                <Col span={4}>
                  <Form.Item
                    label="Quantité"
                    required
                  >
                    <InputNumber
                      value={currentQuantity}
                      onChange={setCurrentQuantity}
                      min={1}
                      style={{ width: '100%' }}
                    />
                  </Form.Item>
                </Col>
                <Col span={10}>
                  <Form.Item
                    label="Description personnalisée"
                  >
                    <Input.TextArea
                      value={currentDescription}
                      onChange={e => setCurrentDescription(e.target.value)}
                      rows={2}
                    />
                  </Form.Item>
                </Col>
              </Row>
              <div style={{ textAlign: 'right' }}>
                <Button onClick={() => setNewProductVisible(false)} style={{ marginRight: 8 }}>
                  Annuler
                </Button>
                <Button type="primary" onClick={handleAddItem}>
                  Ajouter
                </Button>
              </div>
            </Card>
          ) : (
            <Button
              type="dashed"
              icon={<PlusOutlined />}
              onClick={() => setNewProductVisible(true)}
              style={{ width: '100%' }}
            >
              Ajouter un produit
            </Button>
          )}
        </div>

        <Table
          columns={itemColumns}
          dataSource={quoteItems}
          rowKey="id"
          pagination={false}
          summary={() => (
            <Table.Summary>
              <Table.Summary.Row>
                <Table.Summary.Cell index={0} colSpan={6} align="right">
                  <strong>Sous-total HT:</strong>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={1} align="right" colSpan={2}>
                  {subtotal.toFixed(2)} {currencies.find(c => c.id === form.getFieldValue('currency'))?.code || ''}
                </Table.Summary.Cell>
              </Table.Summary.Row>

              <Table.Summary.Row>
                <Table.Summary.Cell index={0} colSpan={6} align="right">
                  <Form.Item
                    name="discount_percentage"
                    noStyle
                  >
                    <InputNumber
                      min={0}
                      max={100}
                      formatter={value => `${value}%`}
                      parser={value => value.replace('%', '')}
                      onChange={handleDiscountChange}
                      style={{ width: 80, marginRight: 8 }}
                    />
                  </Form.Item>
                  <strong>Remise:</strong>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={1} align="right" colSpan={2}>
                  {discountAmount.toFixed(2)} {currencies.find(c => c.id === form.getFieldValue('currency'))?.code || ''}
                </Table.Summary.Cell>
              </Table.Summary.Row>

              <Table.Summary.Row>
                <Table.Summary.Cell index={0} colSpan={6} align="right">
                  <strong>Sous-total après remise:</strong>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={1} align="right" colSpan={2}>
                  {subtotalAfterDiscount.toFixed(2)} {currencies.find(c => c.id === form.getFieldValue('currency'))?.code || ''}
                </Table.Summary.Cell>
              </Table.Summary.Row>

              <Table.Summary.Row>
                <Table.Summary.Cell index={0} colSpan={6} align="right">
                  <Form.Item
                    name="is_tax_exempt"
                    noStyle
                  >
                    <Switch
                      checked={isExempt}
                      onChange={handleExemptChange}
                      style={{ marginRight: 8 }}
                    />
                  </Form.Item>
                  <strong>TVA{isExempt ? ' (Exonéré)' : ''}:</strong>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={1} align="right" colSpan={2}>
                  {isExempt ? '0.00' : taxAmount.toFixed(2)} {currencies.find(c => c.id === form.getFieldValue('currency'))?.code || ''}
                </Table.Summary.Cell>
              </Table.Summary.Row>

              <Table.Summary.Row>
                <Table.Summary.Cell index={0} colSpan={6} align="right">
                  <strong>Total{!isExempt ? ' TTC' : ''}:</strong>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={1} align="right" colSpan={2}>
                  <strong>{total.toFixed(2)} {currencies.find(c => c.id === form.getFieldValue('currency'))?.code || ''}</strong>
                </Table.Summary.Cell>
              </Table.Summary.Row>
            </Table.Summary>
          )}
        />

        {isExempt && (
          <Form.Item
            name="tax_exemption_reason"
            label="Raison d'exonération de TVA"
            style={{ marginTop: 16 }}
          >
            <Input />
          </Form.Item>
        )}

        <Divider>Informations complémentaires</Divider>

        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              name="notes"
              label="Notes"
            >
              <TextArea rows={4} placeholder="Informations supplémentaires pour le client" />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              name="terms"
              label="Conditions"
            >
              <TextArea rows={4} placeholder="Conditions spécifiques à ce devis" />
            </Form.Item>
          </Col>
        </Row>

        <Form.Item>
          <Space>
            <Button
              type="primary"
              htmlType="submit"
              icon={<SaveOutlined />}
              loading={submitting}
            >
              {isEditMode ? 'Mettre à jour' : 'Créer'}
            </Button>
            <Button onClick={() => navigate(-1)}>
              Annuler
            </Button>
          </Space>
        </Form.Item>
      </Form>
    </Card>
  );
};

export default QuoteForm;
