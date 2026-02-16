// src/components/recruitment/InterviewScheduleForm.js
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Form, Input, DatePicker, Button, Card, Typography, Spin, Alert, Select, Space } from 'antd';
import moment from 'moment';
import axios from '../../utils/axiosConfig';

const { Title, Text } = Typography;
const { TextArea } = Input;
const { Option } = Select;

const InterviewScheduleForm = () => {
  const { applicationId } = useParams();
  const navigate = useNavigate();
  const [form] = Form.useForm();
  
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [application, setApplication] = useState(null);
  const [interviewPanels, setInterviewPanels] = useState([]);
  
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // Charger les détails de la candidature
        const applicationResponse = await axios.get(`/api/recruitment/applications/${applicationId}/`);
        setApplication(applicationResponse.data);
        
        // Charger les panels d'entretien disponibles pour cette offre d'emploi
        const panelsResponse = await axios.get(`/api/recruitment/interview-panels/?job_opening=${applicationResponse.data.job_opening_id}`);
        setInterviewPanels(panelsResponse.data.results || []);
        
        // Initialiser le formulaire
        form.setFieldsValue({
          interview_date: applicationResponse.data.interview_date ? moment(applicationResponse.data.interview_date) : null,
          interview_location: applicationResponse.data.interview_location || ''
        });
        
        setLoading(false);
      } catch (error) {
        console.error('Erreur lors du chargement des données:', error);
        setError('Impossible de charger les données nécessaires. Veuillez réessayer plus tard.');
        setLoading(false);
      }
    };
    
    fetchData();
  }, [applicationId, form]);
  
  const handleSubmit = async (values) => {
    setSubmitting(true);
    
    try {
      // Formater la date pour l'API
      const formattedValues = {
        ...values,
        interview_date: values.interview_date.format('YYYY-MM-DD HH:mm:ss')
      };
      
      // Mettre à jour la candidature avec les informations d'entretien
      await axios.post(`/api/recruitment/applications/${applicationId}/schedule_interview/`, formattedValues);
      
      // Rediriger vers la page de détail de la candidature
      navigate(`/recruitment/applications/${applicationId}`);
    } catch (error) {
      console.error('Erreur lors de la planification de l\'entretien:', error);
      setError('Erreur lors de la planification de l\'entretien. Veuillez réessayer.');
    } finally {
      setSubmitting(false);
    }
  };
  
  if (loading) {
    return (
      <div style={{ textAlign: 'center', margin: '20px 0' }}>
        <Spin size="large" />
      </div>
    );
  }
  
  if (error) {
    return (
      <Alert
        message="Erreur"
        description={error}
        type="error"
        showIcon
      />
    );
  }
  
  return (
    <div className="interview-schedule-form">
      <Title level={2}>Planifier un entretien</Title>
      
      <Card style={{ marginBottom: 16 }}>
        <Text>
          Planification d'un entretien pour <strong>{application.candidate_name}</strong> 
          posant sa candidature pour le poste <strong>{application.job_opening_title}</strong>
        </Text>
      </Card>
      
      <Card>
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
        >
          <Form.Item
            name="interview_date"
            label="Date et heure de l'entretien"
            rules={[{ required: true, message: 'Veuillez sélectionner une date et une heure' }]}
          >
            <DatePicker 
              showTime 
              format="DD/MM/YYYY HH:mm" 
              style={{ width: '100%' }}
              placeholder="Sélectionner une date et une heure"
            />
          </Form.Item>
          
          <Form.Item
            name="interview_location"
            label="Lieu de l'entretien"
            rules={[{ required: true, message: 'Veuillez saisir le lieu de l\'entretien' }]}
          >
            <Input placeholder="Ex: Salle de réunion A, 3ème étage" />
          </Form.Item>
          
          {interviewPanels.length > 0 && (
            <Form.Item
              name="panel_id"
              label="Panel d'évaluateurs"
              rules={[{ required: true, message: 'Veuillez sélectionner un panel d\'évaluateurs' }]}
            >
              <Select placeholder="Sélectionner un panel d'évaluateurs">
                {interviewPanels.map(panel => (
                  <Option key={panel.id} value={panel.id}>{panel.name}</Option>
                ))}
              </Select>
            </Form.Item>
          )}
          
          <Form.Item
            name="notes"
            label="Instructions supplémentaires"
          >
            <TextArea 
              rows={4} 
              placeholder="Instructions pour le candidat ou notes internes"
            />
          </Form.Item>
          
          <Form.Item>
            <Space>
              <Button 
                type="default" 
                onClick={() => navigate(`/recruitment/applications/${applicationId}`)}
              >
                Annuler
              </Button>
              <Button 
                type="primary" 
                htmlType="submit"
                loading={submitting}
              >
                Planifier l'entretien
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
};

export default InterviewScheduleForm;
