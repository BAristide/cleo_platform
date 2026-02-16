// src/components/recruitment/JobOpeningForm.js
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Form, Input, Select, DatePicker, Switch, Button, Card, Typography, Row, Col, message, Spin } from 'antd';
import { SaveOutlined, SendOutlined, RollbackOutlined } from '@ant-design/icons';
import axios from '../../utils/axiosConfig';
import moment from 'moment';

const { Title } = Typography;
const { Option } = Select;
const { TextArea } = Input;

const JobOpeningForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const isEditing = Boolean(id);
  
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [departments, setDepartments] = useState([]);
  const [jobTitles, setJobTitles] = useState([]);
  const [selectedDepartment, setSelectedDepartment] = useState(null);
  
  // Charger les données initiales (départements, postes)
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        // Charger tous les départements
        const deptResponse = await axios.get('/api/hr/departments/');
        const departments = deptResponse.data.results || deptResponse.data;
        setDepartments(departments);
        
        // Charger les postes (sans filtre de département pour le moment)
        const jobTitleResponse = await axios.get('/api/hr/job-titles/');
        const jobTitles = jobTitleResponse.data.results || jobTitleResponse.data;
        setJobTitles(jobTitles);
      } catch (error) {
        console.error('Erreur lors du chargement des données initiales:', error);
        message.error('Erreur lors du chargement des données. Veuillez réessayer.');
      }
    };
    
    fetchInitialData();
  }, []);
  
  // Si édition, charger les données de l'offre
  useEffect(() => {
    if (isEditing) {
      const fetchJobOpening = async () => {
        setLoading(true);
        try {
          const response = await axios.get(`/api/recruitment/job-openings/${id}/`);
          const jobOpening = response.data;
          
          // Format des dates pour le formulaire
          if (jobOpening.opening_date) {
            jobOpening.opening_date = moment(jobOpening.opening_date);
          }
          if (jobOpening.closing_date) {
            jobOpening.closing_date = moment(jobOpening.closing_date);
          }
          
          // Définir le département sélectionné pour filtrer les postes
          setSelectedDepartment(jobOpening.department);
          
          // Remplir le formulaire
          form.setFieldsValue(jobOpening);
          setLoading(false);
        } catch (error) {
          console.error('Erreur lors du chargement de l\'offre d\'emploi:', error);
          message.error('Erreur lors du chargement de l\'offre. Veuillez réessayer.');
          setLoading(false);
        }
      };
      
      fetchJobOpening();
    }
  }, [id, isEditing, form]);
  
  // Filtrer les postes en fonction du département sélectionné
  const filteredJobTitles = selectedDepartment
    ? jobTitles.filter(job => job.department === selectedDepartment)
    : jobTitles;
  
  // Gestionnaire de soumission du formulaire
  const handleSubmit = async (values) => {
    setSubmitting(true);
    
    try {
      // Formater les dates
      if (values.opening_date) {
        values.opening_date = values.opening_date.format('YYYY-MM-DD');
      }
      if (values.closing_date) {
        values.closing_date = values.closing_date.format('YYYY-MM-DD');
      }
      
      if (isEditing) {
        // Mise à jour d'une offre existante
        await axios.put(`/api/recruitment/job-openings/${id}/`, values);
        message.success('Offre d\'emploi mise à jour avec succès!');
      } else {
        // Création d'une nouvelle offre
        await axios.post('/api/recruitment/job-openings/', values);
        message.success('Offre d\'emploi créée avec succès!');
      }
      
      // Rediriger vers la liste des offres
      navigate('/recruitment/job-openings');
    } catch (error) {
      console.error('Erreur lors de l\'enregistrement de l\'offre d\'emploi:', error);
      message.error('Erreur lors de l\'enregistrement. Veuillez vérifier les données et réessayer.');
    } finally {
      setSubmitting(false);
    }
  };
  
  // Gestionnaire pour la sélection de département
  const handleDepartmentChange = (value) => {
    setSelectedDepartment(value);
    // Réinitialiser le poste sélectionné si le département change
    form.setFieldsValue({ job_title: undefined });
  };
  
  // Publier l'offre directement
  const handlePublish = async () => {
    try {
      // D'abord soumettre le formulaire pour sauvegarder
      const values = await form.validateFields();
      values.status = 'published'; // Forcer le statut à "publié"
      
      setSubmitting(true);
      
      // Formater les dates
      if (values.opening_date) {
        values.opening_date = values.opening_date.format('YYYY-MM-DD');
      }
      if (values.closing_date) {
        values.closing_date = values.closing_date.format('YYYY-MM-DD');
      }
      
      if (isEditing) {
        await axios.put(`/api/recruitment/job-openings/${id}/`, values);
        message.success('Offre d\'emploi publiée avec succès!');
      } else {
        const response = await axios.post('/api/recruitment/job-openings/', values);
        message.success('Offre d\'emploi créée et publiée avec succès!');
      }
      
      // Rediriger vers la liste des offres
      navigate('/recruitment/job-openings');
    } catch (error) {
      console.error('Erreur lors de la publication de l\'offre d\'emploi:', error);
      message.error('Erreur lors de la publication. Veuillez vérifier les données et réessayer.');
    } finally {
      setSubmitting(false);
    }
  };
  
  if (loading) {
    return (
      <div style={{ textAlign: 'center', margin: '50px 0' }}>
        <Spin size="large" />
      </div>
    );
  }
  
  return (
    <div className="job-opening-form">
      <Title level={2}>{isEditing ? 'Modifier l\'offre d\'emploi' : 'Nouvelle offre d\'emploi'}</Title>
      
      <Card>
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          initialValues={{
            is_remote: false,
            status: 'draft',
            opening_date: moment(),
          }}
        >
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="title"
                label="Titre de l'offre"
                rules={[{ required: true, message: 'Veuillez saisir le titre de l\'offre' }]}
              >
                <Input placeholder="Ex: Développeur Full Stack" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="department"
                label="Département"
                rules={[{ required: true, message: 'Veuillez sélectionner un département' }]}
              >
                <Select
                  placeholder="Sélectionner un département"
                  onChange={handleDepartmentChange}
                >
                  {departments.map(dept => (
                    <Option key={dept.id} value={dept.id}>{dept.name}</Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>
          
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="job_title"
                label="Poste"
                rules={[{ required: true, message: 'Veuillez sélectionner un poste' }]}
              >
                <Select
                  placeholder="Sélectionner un poste"
                  disabled={!selectedDepartment}
                >
                  {filteredJobTitles.map(job => (
                    <Option key={job.id} value={job.id}>{job.name}</Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="contract_type"
                label="Type de contrat"
                rules={[{ required: true, message: 'Veuillez sélectionner un type de contrat' }]}
              >
                <Select placeholder="Sélectionner un type de contrat">
                  <Option value="CDI">CDI</Option>
                  <Option value="CDD">CDD</Option>
                  <Option value="Stage">Stage</Option>
                  <Option value="Freelance">Freelance</Option>
                  <Option value="Alternance">Alternance</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>
          
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="location"
                label="Lieu"
                rules={[{ required: true, message: 'Veuillez saisir le lieu de travail' }]}
              >
                <Input placeholder="Ex: Casablanca, Maroc" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="salary_range"
                label="Fourchette de salaire"
              >
                <Input placeholder="Ex: 20 000 - 30 000 MAD" />
              </Form.Item>
            </Col>
          </Row>
          
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="opening_date"
                label="Date d'ouverture"
                rules={[{ required: true, message: 'Veuillez sélectionner une date d\'ouverture' }]}
              >
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="closing_date"
                label="Date de clôture"
              >
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>
          
          <Form.Item
            name="is_remote"
            label="Télétravail possible"
            valuePropName="checked"
          >
            <Switch />
          </Form.Item>
          
          <Form.Item
            name="description"
            label="Description du poste"
            rules={[{ required: true, message: 'Veuillez saisir une description du poste' }]}
          >
            <TextArea rows={4} placeholder="Description détaillée du poste" />
          </Form.Item>
          
          <Form.Item
            name="requirements"
            label="Exigences / Qualifications"
            rules={[{ required: true, message: 'Veuillez saisir les exigences du poste' }]}
          >
            <TextArea rows={4} placeholder="Qualifications, expérience et compétences requises" />
          </Form.Item>
          
          <Form.Item
            name="responsibilities"
            label="Responsabilités"
            rules={[{ required: true, message: 'Veuillez saisir les responsabilités du poste' }]}
          >
            <TextArea rows={4} placeholder="Principales responsabilités et tâches" />
          </Form.Item>
          
          <Form.Item>
            <Row>
              <Col span={24} style={{ textAlign: 'right' }}>
                <Button
                  type="default"
                  icon={<RollbackOutlined />}
                  onClick={() => navigate('/recruitment/job-openings')}
                  style={{ marginRight: 8 }}
                >
                  Annuler
                </Button>
                <Button
                  type="primary"
                  icon={<SaveOutlined />}
                  htmlType="submit"
                  loading={submitting}
                  style={{ marginRight: 8 }}
                >
                  {isEditing ? 'Mettre à jour' : 'Enregistrer'}
                </Button>
                <Button
                  type="primary"
                  icon={<SendOutlined />}
                  onClick={handlePublish}
                  loading={submitting}
                  style={{ backgroundColor: '#52c41a', borderColor: '#52c41a' }}
                >
                  {isEditing ? 'Mettre à jour et publier' : 'Créer et publier'}
                </Button>
              </Col>
            </Row>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
};

export default JobOpeningForm;
