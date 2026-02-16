// src/components/accounting/forms/AssetForm.js
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Form,
  Input,
  InputNumber,
  Select,
  DatePicker,
  Button,
  Space,
  Card,
  Typography,
  Divider,
  Switch,
  Radio,
  Spin,
  Alert,
  message,
  Tooltip,
  Row
} from 'antd';
import {
  SaveOutlined,
  QuestionCircleOutlined,
  CalculatorOutlined,
  InfoCircleOutlined
} from '@ant-design/icons';
import axios from '../../../utils/axiosConfig';
import { extractResultsFromResponse } from '../../../utils/apiUtils';
import moment from 'moment';

const { Title, Text } = Typography;
const { Option } = Select;
const { TextArea } = Input;

const AssetForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const isEditing = !!id;

  const [loading, setLoading] = useState(isEditing);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [customMethod, setCustomMethod] = useState(false);
  const [customDuration, setCustomDuration] = useState(false);

  useEffect(() => {
    fetchCategories();
    if (isEditing) {
      fetchAssetDetails();
    }
  }, [id]);

  const fetchCategories = async () => {
    try {
      const response = await axios.get('/api/accounting/asset-categories/');
      const categoriesData = extractResultsFromResponse(response);
      setCategories(categoriesData.length > 0 ? categoriesData : demoCategories);
    } catch (error) {
      console.error('Erreur lors de la récupération des catégories:', error);
      setCategories(demoCategories);
    }
  };

  const fetchAssetDetails = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await axios.get(`/api/accounting/assets/${id}/`);
      const asset = response.data;
      
      form.setFieldsValue({
        code: asset.code,
        name: asset.name,
        category_id: asset.category_id,
        acquisition_date: moment(asset.acquisition_date),
        acquisition_value: asset.acquisition_value,
        salvage_value: asset.salvage_value,
        method: asset.method,
        duration_years: asset.duration_years,
        first_depreciation_date: asset.first_depreciation_date ? moment(asset.first_depreciation_date) : null,
        note: asset.note
      });
      
      setSelectedCategory(asset.category_id);
      setCustomMethod(!!asset.method); // true if asset has a custom method
      setCustomDuration(!!asset.duration_years); // true if asset has a custom duration
    } catch (error) {
      console.error('Erreur lors de la récupération des détails de l\'immobilisation:', error);
      setError('Impossible de charger les détails de l\'immobilisation. Veuillez réessayer plus tard.');
      
      // If API fails, use demo data
      if (id && demoAssets[id - 1]) {
        const demoAsset = demoAssets[id - 1];
        
        form.setFieldsValue({
          code: demoAsset.code,
          name: demoAsset.name,
          category_id: demoAsset.category_id,
          acquisition_date: moment(demoAsset.acquisition_date),
          acquisition_value: demoAsset.acquisition_value,
          salvage_value: demoAsset.salvage_value,
          method: demoAsset.method,
          duration_years: demoAsset.duration_years,
          first_depreciation_date: demoAsset.first_depreciation_date ? moment(demoAsset.first_depreciation_date) : null,
          note: demoAsset.note || ''
        });
        
        setSelectedCategory(demoAsset.category_id);
        setCustomMethod(!!demoAsset.method);
        setCustomDuration(!!demoAsset.duration_years);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCategoryChange = (categoryId) => {
    setSelectedCategory(categoryId);
    
    // Reset custom method and duration when category changes
    setCustomMethod(false);
    setCustomDuration(false);
    
    // Clear method and duration fields
    form.setFieldsValue({
      method: null,
      duration_years: null
    });
  };

  const handleSubmit = async (values) => {
    setSubmitting(true);
    
    try {
      const assetData = {
        ...values,
        acquisition_date: values.acquisition_date.format('YYYY-MM-DD'),
        first_depreciation_date: values.first_depreciation_date ? 
          values.first_depreciation_date.format('YYYY-MM-DD') : null,
        method: customMethod ? values.method : null,
        duration_years: customDuration ? values.duration_years : null
      };
      
      let response;
      if (isEditing) {
        response = await axios.put(`/api/accounting/assets/${id}/`, assetData);
      } else {
        response = await axios.post('/api/accounting/assets/', assetData);
      }
      
      message.success(isEditing ? 'Immobilisation modifiée avec succès.' : 'Immobilisation créée avec succès.');
      navigate(`/accounting/assets/${response.data.id || id}`);
    } catch (error) {
      console.error('Erreur lors de l\'enregistrement de l\'immobilisation:', error);
      message.error('Erreur lors de l\'enregistrement de l\'immobilisation. Veuillez réessayer.');
    } finally {
      setSubmitting(false);
    }
  };

  const getCategoryMethod = () => {
    if (!selectedCategory) return null;
    
    const category = categories.find(cat => cat.id === selectedCategory);
    return category ? category.method : null;
  };

  const getCategoryDuration = () => {
    if (!selectedCategory) return null;
    
    const category = categories.find(cat => cat.id === selectedCategory);
    return category ? category.duration_years : null;
  };

  // Demo data
  const demoCategories = [
    {
      id: 1,
      name: 'Matériel informatique',
      account_asset_id: 211,
      account_asset_code: '211000',
      account_asset_name: 'Matériel informatique',
      account_depreciation_id: 281,
      account_depreciation_code: '281000',
      account_depreciation_name: 'Amortissements matériel informatique',
      account_expense_id: 681,
      account_expense_code: '681000',
      account_expense_name: 'Dotations aux amortissements',
      method: 'linear',
      duration_years: 3
    },
    {
      id: 2,
      name: 'Mobilier de bureau',
      account_asset_id: 212,
      account_asset_code: '212000',
      account_asset_name: 'Mobilier de bureau',
      account_depreciation_id: 282,
      account_depreciation_code: '282000',
      account_depreciation_name: 'Amortissements mobilier de bureau',
      account_expense_id: 682,
      account_expense_code: '682000',
      account_expense_name: 'Dotations aux amortissements',
      method: 'linear',
      duration_years: 10
    },
    {
      id: 3,
      name: 'Véhicules',
      account_asset_id: 213,
      account_asset_code: '213000',
      account_asset_name: 'Véhicules',
      account_depreciation_id: 283,
      account_depreciation_code: '283000',
      account_depreciation_name: 'Amortissements véhicules',
      account_expense_id: 683,
      account_expense_code: '683000',
      account_expense_name: 'Dotations aux amortissements',
      method: 'degressive',
      duration_years: 5
    },
    {
      id: 4,
      name: 'Terrains',
      account_asset_id: 214,
      account_asset_code: '214000',
      account_asset_name: 'Terrains',
      account_depreciation_id: 284,
      account_depreciation_code: '284000',
      account_depreciation_name: 'Amortissements terrains',
      account_expense_id: 684,
      account_expense_code: '684000',
      account_expense_name: 'Dotations aux amortissements',
      method: 'linear',
      duration_years: 0
    }
  ];

  const demoAssets = [
    {
      id: 1,
      code: 'A-0001',
      name: 'Serveur Dell PowerEdge',
      category_id: 1,
      category_name: 'Matériel informatique',
      acquisition_date: '2023-01-15',
      acquisition_value: 50000,
      salvage_value: 5000,
      depreciation_value: 30000, // 60% amorti
      method: null, // Uses category's method
      duration_years: null, // Uses category's duration
      state: 'open',
      first_depreciation_date: '2023-01-31',
      note: 'Serveur destiné à l\'hébergement des applications internes'
    },
    {
      id: 2,
      code: 'A-0002',
      name: 'Bureaux open space',
      category_id: 2,
      category_name: 'Mobilier de bureau',
      acquisition_date: '2022-06-10',
      acquisition_value: 75000,
      salvage_value: 7500,
      depreciation_value: 13500, // 18% amorti
      method: null, // Uses category's method
      duration_years: null, // Uses category's duration
      state: 'open',
      first_depreciation_date: '2022-06-30',
      note: 'Mobilier pour les postes de travail du nouveau bâtiment'
    },
    {
      id: 3,
      code: 'A-0003',
      name: 'Renault Kangoo',
      category_id: 3,
      category_name: 'Véhicules',
      acquisition_date: '2021-10-05',
      acquisition_value: 120000,
      salvage_value: 20000,
      depreciation_value: 80000, // 67% amorti
      method: 'degressive', // Custom method
      duration_years: 5, // Custom duration
      state: 'open',
      first_depreciation_date: '2021-10-31',
      note: 'Véhicule de service pour les livraisons'
    }
  ];

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div className="asset-form">
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 24 }}>
        <Title level={2}>{isEditing ? 'Modifier une immobilisation' : 'Nouvelle immobilisation'}</Title>
        <Space>
          <Button onClick={() => navigate(-1)}>Annuler</Button>
          <Button
            type="primary"
            icon={<SaveOutlined />}
            onClick={() => form.submit()}
            loading={submitting}
          >
            Enregistrer
          </Button>
        </Space>
      </div>

      {error && (
        <Alert
          message="Erreur"
          description={error}
          type="error"
          showIcon
          style={{ marginBottom: 24 }}
        />
      )}

      <Card>
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          initialValues={{
            code: '',
            name: '',
            acquisition_date: moment(),
            acquisition_value: 0,
            salvage_value: 0,
            note: ''
          }}
        >
          <div style={{ marginBottom: 24 }}>
            <Title level={4}>Informations générales</Title>
            <Divider style={{ margin: '12px 0 24px' }} />
            
            <Row gutter={16}>
              <Form.Item
                name="code"
                label="Code"
                rules={[{ required: true, message: 'Veuillez saisir un code' }]}
                style={{ display: 'inline-block', width: 'calc(25% - 8px)', marginRight: 16 }}
              >
                <Input placeholder="Ex: A-0001" />
              </Form.Item>
              
              <Form.Item
                name="name"
                label="Nom"
                rules={[{ required: true, message: 'Veuillez saisir un nom' }]}
                style={{ display: 'inline-block', width: 'calc(75% - 8px)' }}
              >
                <Input placeholder="Nom de l'immobilisation" />
              </Form.Item>
            </Row>
            
            <Row gutter={16}>
              <Form.Item
                name="category_id"
                label="Catégorie"
                rules={[{ required: true, message: 'Veuillez sélectionner une catégorie' }]}
                style={{ display: 'inline-block', width: 'calc(50% - 8px)', marginRight: 16 }}
              >
                <Select
                  placeholder="Sélectionner une catégorie"
                  onChange={handleCategoryChange}
                  disabled={isEditing} // Can't change category in edit mode
                >
                  {categories.map(category => (
                    <Option key={category.id} value={category.id}>
                      {category.name}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
              
              <Form.Item
                name="acquisition_date"
                label="Date d'acquisition"
                rules={[{ required: true, message: 'Veuillez sélectionner une date' }]}
                style={{ display: 'inline-block', width: 'calc(50% - 8px)' }}
              >
                <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
              </Form.Item>
            </Row>
          </div>

          <div style={{ marginBottom: 24 }}>
            <Title level={4}>Valorisation</Title>
            <Divider style={{ margin: '12px 0 24px' }} />
            
            <Row gutter={16}>
              <Form.Item
                name="acquisition_value"
                label="Valeur d'acquisition"
                rules={[{ required: true, message: 'Veuillez saisir une valeur' }]}
                style={{ display: 'inline-block', width: 'calc(50% - 8px)', marginRight: 16 }}
              >
                <InputNumber
                  style={{ width: '100%' }}
                  min={0}
                  step={1000}
                  formatter={value => `${value} MAD`}
                  parser={value => value.replace(' MAD', '')}
                />
              </Form.Item>
              
              <Form.Item
                name="salvage_value"
                label={
                  <span>
                    Valeur résiduelle
                    <Tooltip title="Valeur estimée de l'actif à la fin de sa durée d'utilisation">
                      <QuestionCircleOutlined style={{ marginLeft: 8 }} />
                    </Tooltip>
                  </span>
                }
                style={{ display: 'inline-block', width: 'calc(50% - 8px)' }}
              >
                <InputNumber
                  style={{ width: '100%' }}
                  min={0}
                  step={1000}
                  formatter={value => `${value} MAD`}
                  parser={value => value.replace(' MAD', '')}
                />
              </Form.Item>
            </Row>
          </div>

          <div style={{ marginBottom: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Title level={4}>Plan d'amortissement</Title>
              <Button
                type="link"
                icon={<CalculatorOutlined />}
                disabled={!selectedCategory}
              >
                Calculer le tableau d'amortissement
              </Button>
            </div>
            <Divider style={{ margin: '12px 0 24px' }} />
            
            <Row gutter={16}>
              <Form.Item
                label={
                  <span>
                    Méthode d'amortissement
                    <Tooltip title="Par défaut, utilise la méthode définie dans la catégorie">
                      <InfoCircleOutlined style={{ marginLeft: 8 }} />
                    </Tooltip>
                  </span>
                }
                style={{ display: 'inline-block', width: 'calc(50% - 24px)', marginRight: 16 }}
              >
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <Switch
                    checked={customMethod}
                    onChange={checked => setCustomMethod(checked)}
                    style={{ marginRight: 16 }}
                  />
                  {customMethod ? (
                    <Form.Item
                      name="method"
                      noStyle
                      rules={[{ required: customMethod, message: 'Veuillez sélectionner une méthode' }]}
                    >
                      <Radio.Group>
                        <Radio value="linear">Linéaire</Radio>
                        <Radio value="degressive">Dégressive</Radio>
                      </Radio.Group>
                    </Form.Item>
                  ) : (
                    <Text>
                      {selectedCategory ? (
                        getCategoryMethod() === 'linear' ? 'Linéaire' :
                        getCategoryMethod() === 'degressive' ? 'Dégressive' :
                        'Non définie'
                      ) : 'Non définie'}
                    </Text>
                  )}
                </div>
              </Form.Item>
              
              <Form.Item
                label={
                  <span>
                    Durée d'amortissement (années)
                    <Tooltip title="Par défaut, utilise la durée définie dans la catégorie">
                      <InfoCircleOutlined style={{ marginLeft: 8 }} />
                    </Tooltip>
                  </span>
                }
                style={{ display: 'inline-block', width: 'calc(50% - 8px)' }}
              >
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <Switch
                    checked={customDuration}
                    onChange={checked => setCustomDuration(checked)}
                    style={{ marginRight: 16 }}
                  />
                  {customDuration ? (
                    <Form.Item
                      name="duration_years"
                      noStyle
                      rules={[{ required: customDuration, message: 'Veuillez saisir une durée' }]}
                    >
                      <InputNumber min={0} max={50} />
                    </Form.Item>
                  ) : (
                    <Text>
                      {selectedCategory ? (
                        getCategoryDuration() > 0 ? 
                        `${getCategoryDuration()} ans` : 
                        'Non amortissable'
                      ) : 'Non définie'}
                    </Text>
                  )}
                </div>
              </Form.Item>
            </Row>
            
            <Form.Item
              name="first_depreciation_date"
              label="Date de première dotation"
              style={{ marginTop: 16 }}
            >
              <DatePicker format="DD/MM/YYYY" />
            </Form.Item>
          </div>

          <Form.Item
            name="note"
            label="Notes"
          >
            <TextArea
              placeholder="Notes ou commentaires sur cette immobilisation"
              autoSize={{ minRows: 3, maxRows: 6 }}
            />
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
};

export default AssetForm;
