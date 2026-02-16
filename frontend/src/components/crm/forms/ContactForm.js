// src/components/crm/forms/ContactForm.js
import React, { useState, useEffect } from 'react';
import { 
  Form, 
  Input, 
  Button, 
  Select, 
  Switch, 
  Space, 
  Card, 
  Row, 
  Col, 
  Typography, 
  message, 
  Spin,
  Divider
} from 'antd';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import axios from '../../../utils/axiosConfig';
import { extractResultsFromResponse } from '../../../utils/apiUtils';

const { Title } = Typography;
const { Option } = Select;
const { TextArea } = Input;

const ContactForm = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const companyId = queryParams.get('company');

  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [companies, setCompanies] = useState([]);
  const [tags, setTags] = useState([]);
  const [contact, setContact] = useState(null);

  const isEditMode = !!id;

  const SOURCE_OPTIONS = [
    { value: 'website', label: 'Site Web' },
    { value: 'referral', label: 'Référence' },
    { value: 'cold_call', label: 'Appel à froid' },
    { value: 'social', label: 'Réseaux Sociaux' },
    { value: 'email', label: 'Email' },
    { value: 'chatbot', label: 'Chatbot IA' },
    { value: 'event', label: 'Événement' },
    { value: 'other', label: 'Autre' },
  ];

  useEffect(() => {
    const fetchFormData = async () => {
      setLoading(true);
      try {
        // Chargement des données de référence
        const [
          companiesResponse,
          tagsResponse
        ] = await Promise.all([
          axios.get('/api/crm/companies/'),
          axios.get('/api/crm/tags/')
        ]);

        const companiesData = extractResultsFromResponse(companiesResponse);
        setCompanies(companiesData);

        const tagsData = extractResultsFromResponse(tagsResponse);
        setTags(tagsData);

        // En mode édition, charger les données du contact
        if (isEditMode) {
          const contactResponse = await axios.get(`/api/crm/contacts/${id}/`);
          const contactData = contactResponse.data;
          setContact(contactData);

          // Formater les données pour le formulaire
          form.setFieldsValue({
            first_name: contactData.first_name,
            last_name: contactData.last_name,
            title: contactData.title,
            company_id: contactData.company_id,
            email: contactData.email,
            phone: contactData.phone,
            mobile: contactData.mobile,
            linkedin: contactData.linkedin,
            twitter: contactData.twitter,
            source: contactData.source,
            source_detail: contactData.source_detail,
            notes: contactData.notes,
            is_active: contactData.is_active,
            tag_ids: contactData.tags?.map(tag => tag.id) || []
          });
        } else {
          // En mode création, initialiser les valeurs par défaut
          form.setFieldsValue({
            is_active: true,
            source: 'website'
          });

          // Pré-remplir avec l'entreprise spécifiée dans l'URL
          if (companyId) {
            form.setFieldsValue({
              company_id: parseInt(companyId)
            });
          }
        }
      } catch (error) {
        console.error("Erreur lors du chargement des données:", error);
        message.error("Impossible de charger les données nécessaires");
      } finally {
        setLoading(false);
      }
    };

    fetchFormData();
  }, [id, form, companyId, isEditMode]);

  const onFinish = async (values) => {
    setSubmitting(true);
    try {
      // Adapter les données pour l'API
      const formData = {
        first_name: values.first_name,
        last_name: values.last_name,
        title: values.title,
        company_id: values.company_id,
        email: values.email,
        phone: values.phone,
        mobile: values.mobile,
        linkedin: values.linkedin,
        twitter: values.twitter,
        source: values.source,
        source_detail: values.source_detail,
        notes: values.notes,
        is_active: values.is_active,
        tag_ids: values.tag_ids,
        assigned_to_id: 1
      };

      if (isEditMode) {
        // Mode édition
        await axios.put(`/api/crm/contacts/${id}/`, formData);
        message.success('Contact mis à jour avec succès');
      } else {
        // Mode création
        const response = await axios.post('/api/crm/contacts/', formData);
        message.success('Contact créé avec succès');
        // Naviguer vers la page de détail du nouveau contact
        navigate(`/crm/contacts/${response.data.id}`);
        return; // Sortir de la fonction pour éviter la redirection en bas
      }

      // Rediriger vers la page de détail du contact
      navigate(`/crm/contacts/${id}`);
    } catch (error) {
      console.error("Erreur lors de l'enregistrement:", error);
      message.error("Impossible d'enregistrer le contact");
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
    <Card title={isEditMode ? 'Modifier le contact' : 'Nouveau contact'}>
      <Form
        form={form}
        layout="vertical"
        onFinish={onFinish}
        onFinishFailed={onFinishFailed}
        initialValues={{
          is_active: true,
          source: 'website'
        }}
      >
        <Row gutter={16}>
          <Col xs={24} md={12}>
            <Form.Item
              name="first_name"
              label="Prénom"
              rules={[{ required: true, message: 'Veuillez saisir un prénom' }]}
            >
              <Input placeholder="Ex: Ahmed" />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item
              name="last_name"
              label="Nom"
              rules={[{ required: true, message: 'Veuillez saisir un nom' }]}
            >
              <Input placeholder="Ex: Bennani" />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col xs={24} md={12}>
            <Form.Item
              name="title"
              label="Fonction"
            >
              <Input placeholder="Ex: Directeur Commercial" />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item
              name="company_id"
              label="Entreprise"
              rules={[{ required: true, message: 'Veuillez sélectionner une entreprise' }]}
            >
              <Select
                placeholder="Sélectionner une entreprise"
                showSearch
                optionFilterProp="children"
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
        </Row>

        <Title level={5}>Coordonnées</Title>
        <Row gutter={16}>
          <Col xs={24} md={12}>
            <Form.Item
              name="email"
              label="Email"
              rules={[
                { type: 'email', message: 'Veuillez saisir un email valide' }
              ]}
            >
              <Input placeholder="Ex: ahmed.bennani@example.com" />
            </Form.Item>
          </Col>
          <Col xs={24} md={6}>
            <Form.Item
              name="phone"
              label="Téléphone fixe"
            >
              <Input placeholder="Ex: +212 5 22 123 456" />
            </Form.Item>
          </Col>
          <Col xs={24} md={6}>
            <Form.Item
              name="mobile"
              label="Mobile"
            >
              <Input placeholder="Ex: +212 6 12 345 678" />
            </Form.Item>
          </Col>
        </Row>

        <Title level={5}>Profils sociaux</Title>
        <Row gutter={16}>
          <Col xs={24} md={12}>
            <Form.Item
              name="linkedin"
              label="LinkedIn"
            >
              <Input placeholder="Ex: https://www.linkedin.com/in/username" />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item
              name="twitter"
              label="Twitter"
            >
              <Input placeholder="Ex: username (sans @)" />
            </Form.Item>
          </Col>
        </Row>

        <Title level={5}>Source et suivi</Title>
        <Row gutter={16}>
          <Col xs={24} md={12}>
            <Form.Item
              name="source"
              label="Source"
              rules={[{ required: true, message: 'Veuillez sélectionner une source' }]}
            >
              <Select placeholder="Sélectionner une source">
                {SOURCE_OPTIONS.map(option => (
                  <Option key={option.value} value={option.value}>{option.label}</Option>
                ))}
              </Select>
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item
              name="source_detail"
              label="Détails de la source"
            >
              <Input placeholder="Ex: Salon Gitex 2024" />
            </Form.Item>
          </Col>
        </Row>

        <Form.Item
          name="notes"
          label="Notes"
        >
          <TextArea rows={4} placeholder="Notes supplémentaires sur le contact..." />
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
              name="is_active"
              label="Statut"
              valuePropName="checked"
            >
              <Switch 
                checkedChildren="Actif" 
                unCheckedChildren="Inactif" 
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

export default ContactForm;
