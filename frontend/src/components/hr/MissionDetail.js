// src/components/hr/MissionDetail.js
import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  Card,
  Button,
  Space,
  Steps,
  Typography,
  Descriptions,
  Tag,
  Spin,
  message,
  Modal,
  Form,
  Input,
  Divider,
  Timeline,
  Row,
  Col,
  Popconfirm,
  Alert
} from 'antd';
import {
  EditOutlined,
  DeleteOutlined,
  DownloadOutlined,
  FileOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  UserOutlined,
  TeamOutlined,
  BankOutlined,
  FileTextOutlined,
  ArrowLeftOutlined
} from '@ant-design/icons';
import axios from '../../utils/axiosConfig';
import moment from 'moment';

const { Title, Text, Paragraph } = Typography;
const { Step } = Steps;
const { TextArea } = Input;

const MissionDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [mission, setMission] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  
  // États pour les modales
  const [approveModalVisible, setApproveModalVisible] = useState(false);
  const [rejectModalVisible, setRejectModalVisible] = useState(false);
  const [reportModalVisible, setReportModalVisible] = useState(false);
  const [approveType, setApproveType] = useState('');
  const [form] = Form.useForm();
  const [reportForm] = Form.useForm();

  useEffect(() => {
    fetchMissionData();
  }, [id]);

  const fetchMissionData = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`/api/hr/missions/${id}/`);
      setMission(response.data);
      setLoading(false);
    } catch (error) {
      console.error("Erreur lors de la récupération des données:", error);
      message.error("Impossible de charger les détails de la mission");
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    try {
      await axios.delete(`/api/hr/missions/${id}/`);
      message.success("Mission supprimée avec succès");
      navigate('/hr/missions');
    } catch (error) {
      console.error("Erreur lors de la suppression:", error);
      message.error("Impossible de supprimer la mission");
    }
  };

  const handleGeneratePDF = async () => {
    setSubmitting(true);
    try {
      await axios.post(`/api/hr/missions/${id}/generate_order_pdf/`);
      message.success("Ordre de mission généré avec succès");
      fetchMissionData();
    } catch (error) {
      console.error("Erreur lors de la génération du PDF:", error);
      message.error("Impossible de générer l'ordre de mission");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDownloadPDF = async () => {
    try {
      window.open(`/api/hr/missions/${id}/download_order_pdf/`, '_blank');
    } catch (error) {
      console.error("Erreur lors du téléchargement du PDF:", error);
      message.error("Impossible de télécharger l'ordre de mission");
    }
  };

  const handleSubmitMission = async () => {
    setSubmitting(true);
    try {
      await axios.post(`/api/hr/missions/${id}/submit/`);
      message.success("Mission soumise avec succès");
      fetchMissionData();
    } catch (error) {
      console.error("Erreur lors de la soumission:", error);
      message.error("Impossible de soumettre la mission");
    } finally {
      setSubmitting(false);
    }
  };

  const showApproveModal = (type) => {
    setApproveType(type);
    setApproveModalVisible(true);
    form.resetFields();
  };

  const handleApprove = async () => {
    try {
      const values = await form.validateFields();
      setSubmitting(true);

      let response;
      if (approveType === 'manager') {
        response = await axios.post(`/api/hr/missions/${id}/approve_manager/`, {
          notes: values.notes
        });
      } else if (approveType === 'hr') {
        response = await axios.post(`/api/hr/missions/${id}/approve_hr/`, {
          notes: values.notes
        });
      } else if (approveType === 'finance') {
        response = await axios.post(`/api/hr/missions/${id}/approve_finance/`, {
          notes: values.notes
        });
      }

      message.success("Mission approuvée avec succès");
      setApproveModalVisible(false);
      fetchMissionData();
    } catch (error) {
      console.error("Erreur lors de l'approbation:", error);
      message.error("Impossible d'approuver la mission");
    } finally {
      setSubmitting(false);
    }
  };

  const handleReject = async () => {
    try {
      const values = await form.validateFields();
      setSubmitting(true);

      await axios.post(`/api/hr/missions/${id}/reject/`, {
        notes: values.notes,
        rejected_by: approveType
      });

      message.success("Mission rejetée");
      setRejectModalVisible(false);
      fetchMissionData();
    } catch (error) {
      console.error("Erreur lors du rejet:", error);
      message.error("Impossible de rejeter la mission");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitReport = async () => {
    try {
      const values = await reportForm.validateFields();
      setSubmitting(true);

      await axios.post(`/api/hr/missions/${id}/submit_report/`, {
        report: values.report
      });

      message.success("Rapport soumis avec succès");
      setReportModalVisible(false);
      fetchMissionData();
    } catch (error) {
      console.error("Erreur lors de la soumission du rapport:", error);
      message.error("Impossible de soumettre le rapport");
    } finally {
      setSubmitting(false);
    }
  };

  // Détermine l'étape actuelle pour le composant Steps
  const getCurrentStep = () => {
    if (!mission) return 0;
    
    switch (mission.status) {
      case 'draft': return 0;
      case 'submitted': return 1;
      case 'approved_manager': return 2;
      case 'approved_hr': return 3;
      case 'approved_finance': return 4;
      case 'completed': return 5;
      case 'rejected': return -1;
      case 'cancelled': return -1;
      default: return 0;
    }
  };

  // Détermine le statut de chaque étape
  const getStepStatus = (stepIndex) => {
    const currentStep = getCurrentStep();
    
    if (mission.status === 'rejected' || mission.status === 'cancelled') {
      if (stepIndex <= currentStep) return 'finish';
      return 'error';
    }
    
    if (stepIndex < currentStep) return 'finish';
    if (stepIndex === currentStep) return 'process';
    return 'wait';
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '300px' }}>
        <Spin size="large" />
      </div>
    );
  }

  if (!mission) {
    return <div>Mission non trouvée</div>;
  }

  return (
    <div className="mission-detail">
      <Space style={{ marginBottom: 16 }}>
        <Button icon={<ArrowLeftOutlined />}>
          <Link to="/hr/missions">Retour à la liste</Link>
        </Button>
        {mission.status === 'draft' && (
          <>
            <Button type="primary" icon={<EditOutlined />}>
              <Link to={`/hr/missions/${id}/edit`}>Modifier</Link>
            </Button>
            <Popconfirm
              title="Êtes-vous sûr de vouloir supprimer cette mission ?"
              onConfirm={handleDelete}
              okText="Oui"
              cancelText="Non"
            >
              <Button danger icon={<DeleteOutlined />}>
                Supprimer
              </Button>
            </Popconfirm>
          </>
        )}
      </Space>

      <Card>
        <Title level={3}>{mission.title}</Title>
        <Tag 
          color={
            mission.status === 'completed' ? 'success' :
            mission.status === 'rejected' ? 'error' :
            mission.status === 'cancelled' ? 'default' :
            mission.status === 'approved_finance' ? 'success' :
            'processing'
          }
          style={{ marginBottom: 16 }}
        >
          {mission.status_display}
        </Tag>

        {/* Workflow Steps */}
        <Steps current={getCurrentStep()} style={{ marginBottom: 24 }}>
          <Step
            title="Brouillon"
            status={getStepStatus(0)}
            icon={<FileTextOutlined />}
          />
          <Step
            title="Soumise"
            status={getStepStatus(1)}
            icon={<UserOutlined />}
          />
          <Step
            title="Manager"
            description="Approbation N+1"
            status={getStepStatus(2)}
            icon={<UserOutlined />}
          />
          <Step
            title="RH"
            description="Approbation RH"
            status={getStepStatus(3)}
            icon={<TeamOutlined />}
          />
          <Step
            title="Finance"
            description="Approbation Finance"
            status={getStepStatus(4)}
            icon={<BankOutlined />}
          />
          <Step
            title="Terminée"
            status={getStepStatus(5)}
            icon={<CheckCircleOutlined />}
          />
        </Steps>

        {/* Informations générales */}
        <Row gutter={16}>
          <Col xs={24} md={16}>
            <Descriptions bordered column={2} style={{ marginBottom: 24 }}>
              <Descriptions.Item label="Employé" span={2}>
                <Link to={`/hr/employees/${mission.employee && mission.employee.id}`}>
                  {mission.employee_name}
                </Link>
              </Descriptions.Item>
              <Descriptions.Item label="Lieu">
                {mission.location}
              </Descriptions.Item>
              <Descriptions.Item label="Dates">
                Du {mission.start_date} au {mission.end_date}
              </Descriptions.Item>
              <Descriptions.Item label="Demandé par" span={2}>
                {mission.requested_by_name || "Non spécifié"}
              </Descriptions.Item>
              <Descriptions.Item label="Description" span={2}>
                {mission.description || "Aucune description"}
              </Descriptions.Item>
            </Descriptions>
          </Col>

          <Col xs={24} md={8}>
            <Card title="Statut des approbations" style={{ marginBottom: 24 }}>
              <p>
                <Tag color={mission.approved_by_manager ? "success" : "default"}>
                  Manager: {mission.approved_by_manager ? "Approuvé" : "En attente"}
                </Tag>
                {mission.manager_notes && (
                  <div>
                    <Text type="secondary">Notes: {mission.manager_notes}</Text>
                  </div>
                )}
              </p>
              <p>
                <Tag color={mission.approved_by_hr ? "success" : "default"}>
                  RH: {mission.approved_by_hr ? "Approuvé" : "En attente"}
                </Tag>
                {mission.hr_notes && (
                  <div>
                    <Text type="secondary">Notes: {mission.hr_notes}</Text>
                  </div>
                )}
              </p>
              <p>
                <Tag color={mission.approved_by_finance ? "success" : "default"}>
                  Finance: {mission.approved_by_finance ? "Approuvé" : "En attente"}
                </Tag>
                {mission.finance_notes && (
                  <div>
                    <Text type="secondary">Notes: {mission.finance_notes}</Text>
                  </div>
                )}
              </p>
            </Card>

            {/* Actions selon le statut */}
            <Card title="Actions">
              <Space direction="vertical" style={{ width: '100%' }}>
                {mission.status === 'draft' && (
                  <Button 
                    type="primary" 
                    icon={<CheckCircleOutlined />} 
                    onClick={handleSubmitMission}
                    block
                  >
                    Soumettre pour approbation
                  </Button>
                )}

                {mission.status === 'submitted' && (
                  <>
                    <Button 
                      type="primary" 
                      icon={<CheckCircleOutlined />} 
                      onClick={() => showApproveModal('manager')}
                      block
                    >
                      Approuver (Manager)
                    </Button>
                    <Button 
                      danger 
                      icon={<CloseCircleOutlined />} 
                      onClick={() => {
                        setApproveType('manager');
                        setRejectModalVisible(true);
                      }}
                      block
                    >
                      Rejeter
                    </Button>
                  </>
                )}

                {mission.status === 'approved_manager' && (
                  <>
                    <Button 
                      type="primary" 
                      icon={<CheckCircleOutlined />} 
                      onClick={() => showApproveModal('hr')}
                      block
                    >
                      Approuver (RH)
                    </Button>
                    <Button 
                      danger 
                      icon={<CloseCircleOutlined />} 
                      onClick={() => {
                        setApproveType('hr');
                        setRejectModalVisible(true);
                      }}
                      block
                    >
                      Rejeter
                    </Button>
                  </>
                )}

                {mission.status === 'approved_hr' && (
                  <>
                    <Button 
                      type="primary" 
                      icon={<CheckCircleOutlined />} 
                      onClick={() => showApproveModal('finance')}
                      block
                    >
                      Approuver (Finance)
                    </Button>
                    <Button 
                      danger 
                      icon={<CloseCircleOutlined />} 
                      onClick={() => {
                        setApproveType('finance');
                        setRejectModalVisible(true);
                      }}
                      block
                    >
                      Rejeter
                    </Button>
                  </>
                )}

                {mission.status === 'approved_finance' && (
                  <>
                    {!mission.order_pdf && (
                      <Button 
                        type="primary" 
                        icon={<FileOutlined />} 
                        onClick={handleGeneratePDF}
                        loading={submitting}
                        block
                      >
                        Générer l'ordre de mission
                      </Button>
                    )}
                    
                    {mission.order_pdf && (
                      <Button 
                        type="primary" 
                        icon={<DownloadOutlined />} 
                        onClick={handleDownloadPDF}
                        block
                      >
                        Télécharger l'ordre de mission
                      </Button>
                    )}

                    {!mission.report_submitted && (
                      <Button 
                        icon={<FileTextOutlined />} 
                        onClick={() => setReportModalVisible(true)}
                        style={{ marginTop: 8 }}
                        block
                      >
                        Soumettre un rapport
                      </Button>
                    )}
                  </>
                )}

                {mission.status === 'completed' && mission.report_submitted && (
                  <>
                    {mission.order_pdf && (
                      <Button 
                        type="primary" 
                        icon={<DownloadOutlined />} 
                        onClick={handleDownloadPDF}
                        block
                      >
                        Télécharger l'ordre de mission
                      </Button>
                    )}
                  </>
                )}
              </Space>
            </Card>
          </Col>
        </Row>

        {/* Rapport de mission */}
        {mission.report_submitted && (
          <>
            <Divider />
            <Card title="Rapport de mission" style={{ marginTop: 24 }}>
              <p>Soumis le: {mission.report_date}</p>
              <Paragraph>{mission.report}</Paragraph>
            </Card>
          </>
        )}
      </Card>

      {/* Modal pour approuver la mission */}
      <Modal
        title={`Approuver la mission (${
          approveType === 'manager' ? 'Manager' :
          approveType === 'hr' ? 'RH' :
          'Finance'
        })`}
        visible={approveModalVisible}
        onCancel={() => setApproveModalVisible(false)}
        footer={[
          <Button key="back" onClick={() => setApproveModalVisible(false)}>
            Annuler
          </Button>,
          <Button 
            key="submit" 
            type="primary" 
            loading={submitting} 
            onClick={handleApprove}
          >
            Approuver
          </Button>,
        ]}
      >
        <Form
          form={form}
          layout="vertical"
        >
          <Form.Item
            name="notes"
            label="Notes (optionnel)"
          >
            <TextArea rows={4} />
          </Form.Item>
        </Form>
      </Modal>

      {/* Modal pour rejeter la mission */}
      <Modal
        title={`Rejeter la mission (${
          approveType === 'manager' ? 'Manager' :
          approveType === 'hr' ? 'RH' :
          'Finance'
        })`}
        visible={rejectModalVisible}
        onCancel={() => setRejectModalVisible(false)}
        footer={[
          <Button key="back" onClick={() => setRejectModalVisible(false)}>
            Annuler
          </Button>,
          <Button 
            key="submit" 
            type="primary" 
            danger
            loading={submitting} 
            onClick={handleReject}
          >
            Rejeter
          </Button>,
        ]}
      >
        <Form
          form={form}
          layout="vertical"
        >
          <Form.Item
            name="notes"
            label="Motif du rejet"
            rules={[{ required: true, message: 'Veuillez indiquer le motif du rejet' }]}
          >
            <TextArea rows={4} />
          </Form.Item>
        </Form>
      </Modal>

      {/* Modal pour soumettre un rapport de mission */}
      <Modal
        title="Soumettre un rapport de mission"
        visible={reportModalVisible}
        onCancel={() => setReportModalVisible(false)}
        footer={[
          <Button key="back" onClick={() => setReportModalVisible(false)}>
            Annuler
          </Button>,
          <Button 
            key="submit" 
            type="primary" 
            loading={submitting} 
            onClick={handleSubmitReport}
          >
            Soumettre
          </Button>,
        ]}
        width={700}
      >
        <Form
          form={reportForm}
          layout="vertical"
        >
          <Form.Item
            name="report"
            label="Rapport de mission"
            rules={[{ required: true, message: 'Veuillez rédiger un rapport' }]}
          >
            <TextArea rows={10} placeholder="Décrivez les activités réalisées, les résultats obtenus, les difficultés rencontrées, etc." />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default MissionDetail;
