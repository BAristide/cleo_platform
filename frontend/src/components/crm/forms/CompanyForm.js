// src/components/crm/forms/CompanyForm.js
import React, { useState, useEffect } from 'react';
import { 
  Form, 
  Input, 
  Button, 
  Select, 
  InputNumber, 
  Space, 
  Card, 
  Row, 
  Col, 
  Typography, 
  message, 
  Spin,
  Divider,
  Slider
} from 'antd';
import { useNavigate, useParams } from 'react-router-dom';
import axios from '../../../utils/axiosConfig';
import { extractResultsFromResponse } from '../../../utils/apiUtils';

const { Title } = Typography;
const { Option } = Select;
const { TextArea } = Input;

const CompanyForm = () => {
  const navigate = useNavigate();
  const { id } = useParams();

  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [industries, setIndustries] = useState([]);
  const [tags, setTags] = useState([]);
  const [company, setCompany] = useState(null);

  const isEditMode = !!id;

  useEffect(() => {
    const fetchFormData = async () => {
      setLoading(true);
      try {
        // Chargement des données de référence
        const [
          industriesResponse,
          tagsResponse
        ] = await Promise.all([
          axios.get('/api/crm/industries/'),
          axios.get('/api/crm/tags/')
        ]);

        const industriesData = extractResultsFromResponse(industriesResponse);
        setIndustries(industriesData);

        const tagsData = extractResultsFromResponse(tagsResponse);
        setTags(tagsData);

        // En mode édition, charger les données de l'entreprise
        if (isEditMode) {
          const companyResponse = await axios.get(`/api/crm/companies/${id}/`);
          const companyData = companyResponse.data;
          setCompany(companyData);

          // Formater les données pour le formulaire
          form.setFieldsValue({
            name: companyData.name,
            industry_id: companyData.industry_id,
            website: companyData.website,
            phone: companyData.phone,
            email: companyData.email,
            address_line1: companyData.address_line1,
            address_line2: companyData.address_line2,
            city: companyData.city,
            state: companyData.state,
            postal_code: companyData.postal_code,
            country: companyData.country,
            description: companyData.description,
            annual_revenue: companyData.annual_revenue,
            employee_count: companyData.employee_count,
            score: companyData.score,
            tag_ids: companyData.tags?.map(tag => tag.id) || []
          });
        } else {
          // En mode création, initialiser les valeurs par défaut
          form.setFieldsValue({
            score: 0
          });
        }
      } catch (error) {
        console.error("Erreur lors du chargement des données:", error);
        message.error("Impossible de charger les données nécessaires");
      } finally {
        setLoading(false);
      }
    };

    fetchFormData();
  }, [id, form, isEditMode]);

  const onFinish = async (values) => {
    setSubmitting(true);
    try {
      // Adapter les données pour l'API
      const formData = {
        name: values.name,
        industry_id: values.industry_id,
        website: values.website,
        phone: values.phone,
        email: values.email,
        address_line1: values.address_line1,
        address_line2: values.address_line2,
        city: values.city,
        state: values.state,
        postal_code: values.postal_code,
        country: values.country,
        description: values.description,
        annual_revenue: values.annual_revenue,
        employee_count: values.employee_count,
        score: values.score,
        tag_ids: values.tag_ids,
        assigned_to_id: 1
      };

      if (isEditMode) {
        // Mode édition
        await axios.put(`/api/crm/companies/${id}/`, formData);
        message.success('Entreprise mise à jour avec succès');
      } else {
        // Mode création
        const response = await axios.post('/api/crm/companies/', formData);
        message.success('Entreprise créée avec succès');
        // Naviguer vers la page de détail de la nouvelle entreprise
        navigate(`/crm/companies/${response.data.id}`);
        return; // Sortir de la fonction pour éviter la redirection en bas
      }

      // Rediriger vers la page de détail de l'entreprise
      navigate(`/crm/companies/${id}`);
    } catch (error) {
      console.error("Erreur lors de l'enregistrement:", error);
      message.error("Impossible d'enregistrer l'entreprise");
    } finally {
      setSubmitting(false);
    }
  };

  const onFinishFailed = (errorInfo) => {
    console.log('Échec de la validation:', errorInfo);
    message.error('Veuillez corriger les erreurs dans le formulaire');
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <Card title={isEditMode ? 'Modifier l\'entreprise' : 'Nouvelle entreprise'}>
      <Form
        form={form}
        layout="vertical"
        onFinish={onFinish}
        onFinishFailed={onFinishFailed}
        initialValues={{
          score: 0
        }}
      >
        <Title level={5}>Informations de base</Title>
        <Row gutter={16}>
          <Col xs={24} md={12}>
            <Form.Item
              name="name"
              label="Nom de l'entreprise"
              rules={[{ required: true, message: 'Veuillez saisir un nom' }]}
            >
              <Input placeholder="Ex: TechMaroc" />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item
              name="industry_id"
              label="Industrie"
            >
              <Select
                placeholder="Sélectionner une industrie"
                allowClear
              >
                {industries.map(industry => (
                  <Option key={industry.id} value={industry.id}>{industry.name}</Option>
                ))}
              </Select>
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col xs={24} md={8}>
            <Form.Item
              name="website"
              label="Site web"
            >
              <Input placeholder="Ex: https://www.example.com" />
            </Form.Item>
          </Col>
          <Col xs={24} md={8}>
            <Form.Item
              name="phone"
              label="Téléphone"
            >
              <Input placeholder="Ex: +212 5 22 123 456" />
            </Form.Item>
          </Col>
          <Col xs={24} md={8}>
            <Form.Item
              name="email"
              label="Email"
              rules={[
                { type: 'email', message: 'Veuillez saisir un email valide' }
              ]}
            >
              <Input placeholder="Ex: contact@example.com" />
            </Form.Item>
          </Col>
        </Row>

        <Title level={5}>Adresse</Title>
        <Row gutter={16}>
          <Col xs={24} md={12}>
            <Form.Item
              name="address_line1"
              label="Adresse ligne 1"
            >
              <Input placeholder="Ex: 123 Avenue Hassan II" />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item
              name="address_line2"
              label="Adresse ligne 2"
            >
              <Input placeholder="Ex: Étage 3, Bureau 301" />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col xs={24} md={6}>
            <Form.Item
              name="city"
              label="Ville"
            >
              <Input placeholder="Ex: Casablanca" />
            </Form.Item>
          </Col>
          <Col xs={24} md={6}>
            <Form.Item
              name="state"
              label="Région"
            >
              <Input placeholder="Ex: Casablanca-Settat" />
            </Form.Item>
          </Col>
          <Col xs={24} md={6}>
            <Form.Item
              name="postal_code"
              label="Code postal"
            >
              <Input placeholder="Ex: 20250" />
            </Form.Item>
          </Col>
          <Col xs={24} md={6}>
            <Form.Item
              name="country"
              label="Pays"
            >
              <Input placeholder="Ex: Maroc" />
            </Form.Item>
          </Col>
        </Row>

        <Title level={5}>Informations supplémentaires</Title>
        <Row gutter={16}>
          <Col xs={24} md={12}>
            <Form.Item
              name="annual_revenue"
              label="Chiffre d'affaires annuel"
            >
              <InputNumber
                style={{ width: '100%' }}
                min={0}
                formatter={value => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                parser={value => value.replace(/\$\s?|(,*)/g, '')}
                placeholder="Ex: 10000000"
              />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item
              name="employee_count"
              label="Nombre d'employés"
            >
              <InputNumber
                style={{ width: '100%' }}
                min={0}
                placeholder="Ex: 50"
              />
            </Form.Item>
          </Col>
        </Row>

        <Form.Item
          name="description"
          label="Description"
        >
          <TextArea rows={4} placeholder="Description de l'entreprise..." />
        </Form.Item>

        <Row gutter={16}>
          <Col xs={24} md={12}>
            <Form.Item
              name="tag_ids"
              label="Tags"
            >
              <Select
                mode="multiple"
                placeholder="Sélectionner des tags"
              >
                {tags.map(tag => (
                  <Option key={tag.id} value={tag.id}>
                    <span style={{ color: tag.color }}>■</span> {tag.name}
                  </Option>
                ))}
              </Select>
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item
              name="score"
              label="Score de qualification (0-100)"
            >
              <Slider
                min={0}
                max={100}
                marks={{
                  0: '0',
                  25: '25',
                  50: '50',
                  75: '75',
                  100: '100'
                }}
              />
            </Form.Item>
          </Col>
        </Row>

        <Divider />

        <Form.Item>
          <Space>
            <Button type="primary" htmlType="submit" loading={submitting}>
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

export default CompanyForm;
