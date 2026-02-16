// src/components/sales/forms/OrderForm.js
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Form, Input, Button, Select, DatePicker, InputNumber, Card, Row, Col,
  Typography, Spin, message, Divider, Space, Switch, Table, Popconfirm,
  Alert
} from 'antd';
import {
  PlusOutlined, DeleteOutlined, SaveOutlined, ArrowLeftOutlined,
  TagOutlined, BankOutlined, ShopOutlined
} from '@ant-design/icons';
import axios from '../../../utils/axiosConfig';
import moment from 'moment';
import { extractResultsFromResponse } from '../../../utils/apiUtils';

const { Title, Text } = Typography;
const { Option } = Select;
const { TextArea } = Input;

const OrderForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const isEditMode = !!id;

  const [loading, setLoading] = useState(isEditMode);
  const [submitting, setSubmitting] = useState(false);
  const [companies, setCompanies] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [contactOptions, setContactOptions] = useState([]);
  const [quotes, setQuotes] = useState([]);
  const [selectedCompany, setSelectedCompany] = useState(null);
  const [selectedQuote, setSelectedQuote] = useState(null);
  const [currencies, setCurrencies] = useState([]);
  const [bankAccounts, setBankAccounts] = useState([]);
  const [filteredBankAccounts, setFilteredBankAccounts] = useState([]);
  const [products, setProducts] = useState([]);
  const [orderItems, setOrderItems] = useState([]);
  const [newProductVisible, setNewProductVisible] = useState(false);
  const [currentProduct, setCurrentProduct] = useState(null);
  const [currentQuantity, setCurrentQuantity] = useState(1);
  const [currentDescription, setCurrentDescription] = useState('');
  const [isExempt, setIsExempt] = useState(false);
  const [loadingQuoteItems, setLoadingQuoteItems] = useState(false);

  // États pour les calculs financiers
  const [subtotal, setSubtotal] = useState(0);
  const [discountAmount, setDiscountAmount] = useState(0);
  const [subtotalAfterDiscount, setSubtotalAfterDiscount] = useState(0);
  const [taxAmount, setTaxAmount] = useState(0);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    fetchInitialData();
    if (isEditMode) {
      fetchOrderDetails();
    }
  }, [id]);

  const fetchInitialData = async () => {
    try {
      const [companiesRes, currenciesRes, bankAccountsRes, productsRes, quotesRes] = await Promise.all([
        axios.get('/api/crm/companies/'),
        axios.get('/api/core/currencies/'),
        axios.get('/api/sales/bank-accounts/'),
        axios.get('/api/sales/products/'),
        axios.get('/api/sales/quotes/?status=accepted')
      ]);

      const companiesData = extractResultsFromResponse(companiesRes);
      const currenciesData = extractResultsFromResponse(currenciesRes);
      const bankAccountsData = extractResultsFromResponse(bankAccountsRes);
      const productsData = extractResultsFromResponse(productsRes);
      const quotesData = extractResultsFromResponse(quotesRes);

      setCompanies(companiesData);
      setCurrencies(currenciesData);
      setBankAccounts(bankAccountsData);
      setProducts(productsData);
      setQuotes(quotesData);

      // Initialiser le formulaire avec des valeurs par défaut si en mode création
      if (!isEditMode) {
        const defaultCurrency = currenciesData.find(c => c.is_default) || (currenciesData.length > 0 ? currenciesData[0] : null);
        if (defaultCurrency) {
          const defaultBankAccounts = bankAccountsData.filter(ba => ba.currency === defaultCurrency.id);
          setFilteredBankAccounts(defaultBankAccounts);
          
          form.setFieldsValue({
            date: moment(),
            currency: defaultCurrency.id,
            payment_terms: '30_days',
            bank_account: defaultBankAccounts.length > 0 ? defaultBankAccounts[0].id : null,
            discount_percentage: 0,
            is_tax_exempt: false,
            status: 'draft'
          });
        }
      }
    } catch (error) {
      console.error("Erreur lors du chargement des données initiales:", error);
      message.error("Impossible de charger les données nécessaires");
    }
  };

  const fetchOrderDetails = async () => {
    setLoading(true);
    try {
      // Récupérer les détails de la commande
      const orderResponse = await axios.get(`/api/sales/orders/${id}/`);
      const orderData = orderResponse.data;

      // Récupérer les contacts de l'entreprise
      if (orderData.company) {
        await fetchContactsByCompany(orderData.company);
        setSelectedCompany(orderData.company);
      }

      // Filtrer les comptes bancaires par devise
      if (orderData.currency) {
        const filteredAccounts = bankAccounts.filter(ba => ba.currency === orderData.currency);
        setFilteredBankAccounts(filteredAccounts);
      }

      // Si un devis est lié, le sélectionner
      if (orderData.quote) {
        setSelectedQuote(orderData.quote);
      }

      // Mettre à jour le formulaire
      form.setFieldsValue({
        ...orderData,
        date: orderData.date ? moment(orderData.date) : null,
        delivery_date: orderData.delivery_date ? moment(orderData.delivery_date) : null,
      });

      // Récupérer les éléments de la commande
      const itemsResponse = await axios.get(`/api/sales/order-items/?order=${id}`);
      const itemsData = extractResultsFromResponse(itemsResponse);
      setOrderItems(itemsData);

      // Mettre à jour l'état d'exonération de TVA
      setIsExempt(orderData.is_tax_exempt || false);

      // Calculer les totaux
      calculateTotals(itemsData, orderData.discount_percentage || 0, orderData.is_tax_exempt || false);
    } catch (error) {
      console.error("Erreur lors de la récupération des détails de la commande:", error);
      message.error("Impossible de charger les détails de la commande");
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
        label: `${contact.first_name} ${contact.last_name}`,
      }));
      
      setContactOptions(options);
      setContacts(contactsData);
    } catch (error) {
      console.error("Erreur lors de la récupération des contacts:", error);
      message.error("Impossible de charger les contacts");
      setContactOptions([]);
    }
  };

  const fetchQuoteItems = async (quoteId) => {
    if (!quoteId) return;
    
    setLoadingQuoteItems(true);
    try {
      const response = await axios.get(`/api/sales/quote-items/?quote=${quoteId}`);
      const itemsData = extractResultsFromResponse(response);
      
      // Convertir les éléments du devis en éléments de commande
      const convertedItems = itemsData.map(item => ({
        id: `temp_${Date.now()}_${item.id}`,
        product: item.product,
        product_name: item.product_name,
        product_reference: item.product_reference,
        description: item.description,
        quantity: item.quantity,
        unit_price: item.unit_price,
        tax_rate: item.tax_rate,
        subtotal: item.quantity * item.unit_price,
        tax_amount: isExempt ? 0 : (item.quantity * item.unit_price * (item.tax_rate / 100)),
        total: item.quantity * item.unit_price * (isExempt ? 1 : (1 + item.tax_rate / 100))
      }));
      
      setOrderItems(convertedItems);
      
      // Calculer les totaux pour les nouveaux éléments
      calculateTotals(convertedItems, form.getFieldValue('discount_percentage') || 0, isExempt);
      
      // Récupérer également les informations du devis pour préremplir le formulaire
      const quoteResponse = await axios.get(`/api/sales/quotes/${quoteId}/`);
      const quoteData = quoteResponse.data;
      
      // Mettre à jour les informations du formulaire à partir du devis
      if (quoteData) {
        // Chercher la compagnie du devis
        if (quoteData.company && (!form.getFieldValue('company') || !isEditMode)) {
          form.setFieldsValue({ company: quoteData.company });
          setSelectedCompany(quoteData.company);
          await fetchContactsByCompany(quoteData.company);
        }
        
        // Chercher le contact du devis
        if (quoteData.contact && (!form.getFieldValue('contact') || !isEditMode)) {
          form.setFieldsValue({ contact: quoteData.contact });
        }
        
        // Copier les informations financières
        if (!isEditMode) {
          form.setFieldsValue({
            currency: quoteData.currency,
            payment_terms: quoteData.payment_terms,
            discount_percentage: quoteData.discount_percentage || 0,
            is_tax_exempt: quoteData.is_tax_exempt || false,
            tax_exemption_reason: quoteData.tax_exemption_reason,
            notes: quoteData.notes,
            terms: quoteData.terms
          });
          
          // Mettre à jour l'exonération de TVA
          setIsExempt(quoteData.is_tax_exempt || false);
          
          // Filtrer les comptes bancaires par devise
          const filteredAccounts = bankAccounts.filter(ba => ba.currency === quoteData.currency);
          setFilteredBankAccounts(filteredAccounts);
          
          // Sélectionner le même compte bancaire ou le premier compte compatible
          if (quoteData.bank_account) {
            form.setFieldsValue({ bank_account: quoteData.bank_account });
          } else if (filteredAccounts.length > 0) {
            const defaultAccount = filteredAccounts.find(ba => ba.is_default) || filteredAccounts[0];
            form.setFieldsValue({ bank_account: defaultAccount.id });
          }
        }
      }
      
    } catch (error) {
      console.error("Erreur lors de la récupération des éléments du devis:", error);
      message.error("Impossible de charger les éléments du devis");
    } finally {
      setLoadingQuoteItems(false);
    }
  };

  const handleCompanyChange = (value) => {
    setSelectedCompany(value);
    form.setFieldsValue({ contact: undefined });
    fetchContactsByCompany(value);
  };

  const handleQuoteChange = (value) => {
    setSelectedQuote(value);
    
    // Si une quote est sélectionnée, récupérer ses éléments
    if (value) {
      fetchQuoteItems(value);
    } else {
      // Sinon, réinitialiser les éléments
      setOrderItems([]);
      calculateTotals([], form.getFieldValue('discount_percentage') || 0, isExempt);
    }
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
    calculateTotals(orderItems, form.getFieldValue('discount_percentage') || 0, isForeignCurrency);
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
    calculateTotals(orderItems, form.getFieldValue('discount_percentage') || 0, checked);
  };

  const handleDiscountChange = (value) => {
    calculateTotals(orderItems, value || 0, isExempt);
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
    const updatedItems = [...orderItems, newItem];
    setOrderItems(updatedItems);
    
    // Recalculer les totaux
    calculateTotals(updatedItems, form.getFieldValue('discount_percentage') || 0, isExempt);
    
    // Réinitialiser le formulaire d'ajout
    setCurrentProduct(null);
    setCurrentQuantity(1);
    setCurrentDescription('');
    setNewProductVisible(false);
  };

  const handleRemoveItem = (itemId) => {
    const updatedItems = orderItems.filter(item => item.id !== itemId);
    setOrderItems(updatedItems);
    
    // Recalculer les totaux
    calculateTotals(updatedItems, form.getFieldValue('discount_percentage') || 0, isExempt);
  };

  const onFinish = async (values) => {
    if (orderItems.length === 0) {
      message.error("Veuillez ajouter au moins un produit à la commande");
      return;
    }
    
    setSubmitting(true);
    try {
      // Formater les données pour l'API
      const formData = {
        ...values,
        date: values.date.format('YYYY-MM-DD'),
        delivery_date: values.delivery_date ? values.delivery_date.format('YYYY-MM-DD') : null,
        is_tax_exempt: isExempt,
        // Pas besoin d'envoyer les montants calculés, ils seront recalculés par le backend
      };
      
      let orderId;
      
      // Créer ou mettre à jour la commande
      if (isEditMode) {
        await axios.put(`/api/sales/orders/${id}/`, formData);
        orderId = id;
        message.success("Commande mise à jour avec succès");
      } else {
        const response = await axios.post('/api/sales/orders/', formData);
        orderId = response.data.id;
        message.success("Commande créée avec succès");
      }
      
      // Pour chaque élément temporaire, créer un élément réel
      for (const item of orderItems) {
        const itemData = {
          order: orderId,
          product: item.product,
          description: item.description,
          quantity: item.quantity,
          unit_price: item.unit_price,
          tax_rate: item.tax_rate
        };
        
        if (item.id && (item.id.toString().startsWith('temp_') || !isEditMode)) {
          // Nouvel élément
          await axios.post('/api/sales/order-items/', itemData);
        } else {
          // Élément existant à mettre à jour
          await axios.put(`/api/sales/order-items/${item.id}/`, itemData);
        }
      }
      
      // Naviguer vers la page de détail de la commande
      navigate(`/sales/orders/${orderId}`);
    } catch (error) {
      console.error("Erreur lors de l'enregistrement de la commande:", error);
      message.error("Impossible d'enregistrer la commande");
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
    <Card title={isEditMode ? "Modifier la commande" : "Nouvelle commande"}>
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
          payment_terms: '30_days',
          discount_percentage: 0,
          is_tax_exempt: false,
          status: 'draft'
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
              label="Date"
              rules={[{ required: true, message: 'Veuillez sélectionner une date' }]}
            >
              <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item
              name="delivery_date"
              label="Date de livraison prévue"
            >
              <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item
              name="status"
              label="Statut"
              rules={[{ required: true, message: 'Veuillez sélectionner un statut' }]}
            >
              <Select placeholder="Sélectionner un statut">
                <Option value="draft">Brouillon</Option>
                <Option value="confirmed">Confirmée</Option>
                <Option value="in_progress">En cours</Option>
                <Option value="delivered">Livrée</Option>
                <Option value="cancelled">Annulée</Option>
              </Select>
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              name="quote"
              label="Devis d'origine"
            >
              <Select 
                placeholder="Sélectionner un devis" 
                allowClear
                onChange={handleQuoteChange}
                disabled={isEditMode}
              >
                {quotes.map(quote => (
                  <Option key={quote.id} value={quote.id}>
                    {quote.number} - {quote.company_name} ({quote.total} {quote.currency_code})
                  </Option>
                ))}
              </Select>
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              name="delivery_address"
              label="Adresse de livraison"
            >
              <Input.TextArea rows={1} />
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

        {selectedQuote && loadingQuoteItems && (
          <div style={{ textAlign: 'center', margin: '20px 0' }}>
            <Spin tip="Chargement des éléments du devis..." />
          </div>
        )}

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
          dataSource={orderItems}
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
              <TextArea rows={4} placeholder="Conditions spécifiques à cette commande" />
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

export default OrderForm;
