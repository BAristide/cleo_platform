// src/components/hr/TrainingPlanDetail.js
import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  Card,
  Button,
  Space,
  Steps,
  Typography,
  Descriptions,
  Table,
  Tag,
  Spin,
  message,
  Modal,
  Form,
  Input,
  Divider,
  Popconfirm,
  Select,
  Row,
  Col,
  Progress,
  DatePicker
} from 'antd';
import {
  EditOutlined,
  DeleteOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  UserOutlined,
  TeamOutlined,
  BankOutlined,
  ArrowLeftOutlined,
  PlusOutlined,
  StarOutlined
} from '@ant-design/icons';
import axios from '../../utils/axiosConfig';
import { extractResultsFromResponse } from '../../utils/apiUtils';
import moment from 'moment';

const { Title, Text, Paragraph } = Typography;
const { Step } = Steps;
const { TextArea } = Input;
const { Option } = Select;

const TrainingPlanDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [trainingPlan, setTrainingPlan] = useState(null);
  const [trainingCourses, setTrainingCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  
  // États pour les modales
  const [approveModalVisible, setApproveModalVisible] = useState(false);
  const [rejectModalVisible, setRejectModalVisible] = useState(false);
  const [itemModalVisible, setItemModalVisible] = useState(false);
  const [scheduleModalVisible, setScheduleModalVisible] = useState(false);
  const [evaluateModalVisible, setEvaluateModalVisible] = useState(false);
  const [approveType, setApproveType] = useState('');
  const [editingItem, setEditingItem] = useState(null);
  const [form] = Form.useForm();
  const [itemForm] = Form.useForm();
  const [scheduleForm] = Form.useForm();
  const [evaluateForm] = Form.useForm();

  useEffect(() => {
    fetchTrainingPlanData();
    fetchTrainingCourses();
  }, [id]);

  const fetchTrainingPlanData = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`/api/hr/training-plans/${id}/`);
      setTrainingPlan(response.data);
      setLoading(false);
    } catch (error) {
      console.error("Erreur lors de la récupération des données:", error);
      message.error("Impossible de charger les détails du plan de formation");
      setLoading(false);
    }
  };

  const fetchTrainingCourses = async () => {
    try {
      const response = await axios.get('/api/hr/training-courses/');
      setTrainingCourses(extractResultsFromResponse(response));
    } catch (error) {
      console.error("Erreur lors du chargement des formations:", error);
    }
  };

  const handleDelete = async () => {
    try {
      await axios.delete(`/api/hr/training-plans/${id}/`);
      message.success("Plan de formation supprimé avec succès");
      navigate('/hr/training-plans');
    } catch (error) {
      console.error("Erreur lors de la suppression:", error);
      message.error("Impossible de supprimer le plan de formation");
    }
  };

  const handleSubmitPlan = async () => {
    setSubmitting(true);
    try {
      await axios.post(`/api/hr/training-plans/${id}/submit/`);
      message.success("Plan de formation soumis avec succès");
      fetchTrainingPlanData();
    } catch (error) {
      console.error("Erreur lors de la soumission:", error);
      message.error("Impossible de soumettre le plan de formation");
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
        response = await axios.post(`/api/hr/training-plans/${id}/approve_manager/`, {
          notes: values.notes
        });
      } else if (approveType === 'hr') {
        response = await axios.post(`/api/hr/training-plans/${id}/approve_hr/`, {
          notes: values.notes
        });
      } else if (approveType === 'finance') {
        response = await axios.post(`/api/hr/training-plans/${id}/approve_finance/`, {
          notes: values.notes
        });
      }

      message.success("Plan de formation approuvé avec succès");
      setApproveModalVisible(false);
      fetchTrainingPlanData();
    } catch (error) {
      console.error("Erreur lors de l'approbation:", error);
      message.error("Impossible d'approuver le plan de formation");
    } finally {
      setSubmitting(false);
    }
  };

  const handleReject = async () => {
    try {
      const values = await form.validateFields();
      setSubmitting(true);

      await axios.post(`/api/hr/training-plans/${id}/reject/`, {
        notes: values.notes,
        rejected_by: approveType
      });

      message.success("Plan de formation rejeté");
      setRejectModalVisible(false);
      fetchTrainingPlanData();
    } catch (error) {
      console.error("Erreur lors du rejet:", error);
      message.error("Impossible de rejeter le plan de formation");
    } finally {
      setSubmitting(false);
    }
  };

  const showItemModal = (item = null) => {
    setEditingItem(item);
    itemForm.resetFields();
    if (item) {
      itemForm.setFieldsValue({
        training_course: item.training_course.id,
        planned_quarter: item.planned_quarter,
        priority: item.priority
      });
    }
    setItemModalVisible(true);
  };

  const handleItemSave = async () => {
    try {
      const values = await itemForm.validateFields();
      setSubmitting(true);

      const formData = {
        training_plan: id,
        ...values
      };

      if (editingItem) {
        // Mode édition
        await axios.put(`/api/hr/training-plan-items/${editingItem.id}/`, formData);
        message.success("Formation mise à jour avec succès");
      } else {
        // Mode création
        await axios.post('/api/hr/training-plan-items/', formData);
        message.success("Formation ajoutée avec succès");
      }

      setItemModalVisible(false);
      fetchTrainingPlanData();
    } catch (error) {
      console.error("Erreur lors de l'enregistrement:", error);
      message.error("Impossible d'enregistrer la formation");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteItem = async (itemId) => {
    try {
      await axios.delete(`/api/hr/training-plan-items/${itemId}/`);
      message.success("Formation supprimée avec succès");
      fetchTrainingPlanData();
    } catch (error) {
      console.error("Erreur lors de la suppression:", error);
      message.error("Impossible de supprimer la formation");
    }
  };

  const showScheduleModal = (item) => {
    setEditingItem(item);
    scheduleForm.resetFields();
    if (item.scheduled_date) {
      scheduleForm.setFieldsValue({
        scheduled_date: moment(item.scheduled_date)
      });
    }
    setScheduleModalVisible(true);
  };

  const handleSchedule = async () => {
    try {
      const values = await scheduleForm.validateFields();
      setSubmitting(true);

      await axios.post(`/api/hr/training-plan-items/${editingItem.id}/schedule/`, {
        scheduled_date: values.scheduled_date.format('YYYY-MM-DD')
      });

      message.success("Formation programmée avec succès");
      setScheduleModalVisible(false);
      fetchTrainingPlanData();
    } catch (error) {
      console.error("Erreur lors de la programmation:", error);
      message.error("Impossible de programmer la formation");
    } finally {
      setSubmitting(false);
    }
  };

  const handleStartTraining = async (itemId) => {
    try {
      await axios.post(`/api/hr/training-plan-items/${itemId}/start/`);
      message.success("Formation marquée comme en cours");
      fetchTrainingPlanData();
    } catch (error) {
      console.error("Erreur lors du démarrage:", error);
      message.error("Impossible de démarrer la formation");
    }
  };

  const showEvaluateModal = (item) => {
    setEditingItem(item);
    evaluateForm.resetFields();
    
    // Pré-remplir avec les données existantes si disponibles
    if (item.completion_date) {
      evaluateForm.setFieldsValue({
        completion_date: moment(item.completion_date),
        employee_rating: item.employee_rating,
        employee_comments: item.employee_comments,
        manager_rating: item.manager_rating,
        manager_comments: item.manager_comments
      });
    }
    
    setEvaluateModalVisible(true);
  };

  const handleCompleteTraining = async () => {
    try {
      const values = await evaluateForm.validateFields(['completion_date', 'employee_rating', 'employee_comments']);
      setSubmitting(true);

      await axios.post(`/api/hr/training-plan-items/${editingItem.id}/complete/`, {
        completion_date: values.completion_date.format('YYYY-MM-DD'),
        employee_rating: values.employee_rating,
        employee_comments: values.employee_comments
      });

      message.success("Formation marquée comme terminée");
      setEvaluateModalVisible(false);
      fetchTrainingPlanData();
    } catch (error) {
      console.error("Erreur lors de la finalisation:", error);
      message.error("Impossible de finaliser la formation");
    } finally {
      setSubmitting(false);
    }
  };

  const handleManagerEvaluation = async () => {
    try {
      const values = await evaluateForm.validateFields(['manager_rating', 'manager_comments']);
      setSubmitting(true);

      await axios.post(`/api/hr/training-plan-items/${editingItem.id}/manager_evaluation/`, {
        manager_rating: values.manager_rating,
        manager_comments: values.manager_comments
      });

      message.success("Évaluation du manager ajoutée avec succès");
      setEvaluateModalVisible(false);
      fetchTrainingPlanData();
    } catch (error) {
      console.error("Erreur lors de l'évaluation:", error);
      message.error("Impossible d'ajouter l'évaluation du manager");
    } finally {
      setSubmitting(false);
    }
  };

  // Détermine l'étape actuelle pour le composant Steps
  const getCurrentStep = () => {
    if (!trainingPlan) return 0;
    
    switch (trainingPlan.status) {
      case 'draft': return 0;
      case 'submitted': return 1;
      case 'approved_manager': return 2;
      case 'approved_hr': return 3;
      case 'approved_finance': return 4;
      case 'completed': return 5;
      case 'rejected': return -1;
      default: return 0;
    }
  };

  // Détermine le statut de chaque étape
  const getStepStatus = (stepIndex) => {
    const currentStep = getCurrentStep();
    
    if (trainingPlan.status === 'rejected') {
      if (stepIndex <= currentStep) return 'finish';
      return 'error';
    }
    
    if (stepIndex < currentStep) return 'finish';
    if (stepIndex === currentStep) return 'process';
    return 'wait';
  };

  // Colonnes pour le tableau des formations
  const trainingItemsColumns = [
    {
      title: 'Formation',
      dataIndex: 'training_course',
      key: 'training_course',
      render: (_, record) => record.training_course_data.title
    },
    {
      title: 'Trimestre',
      dataIndex: 'planned_quarter',
      key: 'planned_quarter',
      render: (quarter) => `Q${quarter}`
    },
    {
      title: 'Priorité',
      dataIndex: 'priority_display',
      key: 'priority_display',
      render: (text, record) => {
        let color;
        switch (record.priority) {
          case 1: color = 'default'; break;
          case 2: color = 'warning'; break;
          case 3: color = 'error'; break;
          default: color = 'default';
        }
        return <Tag color={color}>{text}</Tag>;
      }
    },
    {
      title: 'Statut',
      dataIndex: 'status_display',
      key: 'status_display',
      render: (text, record) => {
        let color;
        switch (record.status) {
          case 'planned': color = 'default'; break;
          case 'scheduled': color = 'processing'; break;
          case 'in_progress': color = 'warning'; break;
          case 'completed': color = 'success'; break;
          case 'cancelled': color = 'error'; break;
          default: color = 'default';
        }
        return <Tag color={color}>{text}</Tag>;
      }
    },
    {
      title: 'Date programmée',
      dataIndex: 'scheduled_date',
      key: 'scheduled_date',
      render: (text) => text || "—"
    },
    {
      title: 'Évaluation',
      key: 'evaluation',
      render: (_, record) => {
        if (record.status !== 'completed') return "—";
        
        return (
          <Space>
            <span>Employé: {record.employee_rating ? 
              <Rate disabled value={record.employee_rating} /> : 
              "Non évalué"}</span>
            <span>Manager: {record.manager_rating ? 
              <Rate disabled value={record.manager_rating} /> : 
              "Non évalué"}</span>
          </Space>
        );
      }
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => {
        const canEdit = trainingPlan && trainingPlan.status === 'draft';
        
        return (
          <Space size="small">
            {canEdit && (
              <>
                <Button size="small" type="primary" icon={<EditOutlined />} onClick={() => showItemModal(record)}>
                  Modifier
                </Button>
                <Popconfirm
                  title="Êtes-vous sûr de vouloir supprimer cette formation ?"
                  onConfirm={() => handleDeleteItem(record.id)}
                  okText="Oui"
                  cancelText="Non"
                >
                  <Button size="small" danger icon={<DeleteOutlined />}>
                    Supprimer
                  </Button>
                </Popconfirm>
              </>
            )}
            
            {trainingPlan && trainingPlan.status === 'approved_finance' && (
              <>
                {record.status === 'planned' && (
                  <Button size="small" onClick={() => showScheduleModal(record)}>
                    Programmer
                  </Button>
                )}
                {record.status === 'scheduled' && (
                  <Button size="small" onClick={() => handleStartTraining(record.id)}>
                    Démarrer
                  </Button>
                )}
                {(record.status === 'scheduled' || record.status === 'in_progress') && (
                  <Button size="small" type="primary" onClick={() => showEvaluateModal(record)}>
                    Terminer
                  </Button>
                )}
                {record.status === 'completed' && !record.manager_rating && (
                  <Button size="small" onClick={() => showEvaluateModal(record)}>
                    Évaluer
                  </Button>
                )}
              </>
            )}
          </Space>
        );
      }
    },
  ];

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '300px' }}>
        <Spin size="large" />
      </div>
    );
  }

  if (!trainingPlan) {
    return <div>Plan de formation non trouvé</div>;
  }

  // Fonction pour rendre l'étoile pour le système de notation
  const Rate = ({ value, disabled, onChange }) => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <Button 
          key={i} 
          type={i <= value ? "primary" : "default"} 
          shape="circle" 
          icon={<StarOutlined />} 
          size="small"
          disabled={disabled}
          onClick={() => onChange && onChange(i)}
          style={{ margin: "0 2px" }}
        />
      );
    }
    return <Space>{stars}</Space>;
  };

  return (
    <div className="training-plan-detail">
      <Space style={{ marginBottom: 16 }}>
        <Button icon={<ArrowLeftOutlined />}>
          <Link to="/hr/training-plans">Retour à la liste</Link>
        </Button>
        {trainingPlan.status === 'draft' && (
          <>
            <Button type="primary" icon={<EditOutlined />}>
              <Link to={`/hr/training-plans/${id}/edit`}>Modifier</Link>
            </Button>
            <Popconfirm
              title="Êtes-vous sûr de vouloir supprimer ce plan ?"
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
        <Title level={3}>Plan de formation {trainingPlan.year} - {trainingPlan.employee_data.first_name} {trainingPlan.employee_data.last_name}</Title>
        <Tag 
          color={
            trainingPlan.status === 'completed' ? 'success' :
            trainingPlan.status === 'rejected' ? 'error' :
            trainingPlan.status === 'approved_finance' ? 'success' :
            'processing'
          }
          style={{ marginBottom: 16 }}
        >
          {trainingPlan.status_display}
        </Tag>

        {/* Workflow Steps */}
        <Steps current={getCurrentStep()} style={{ marginBottom: 24 }}>
          <Step
            title="Brouillon"
            status={getStepStatus(0)}
          />
          <Step
            title="Soumis"
            status={getStepStatus(1)}
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
        </Steps>

        {/* Informations générales */}
        <Row gutter={16}>
          <Col xs={24} md={16}>
            <Descriptions bordered column={2} style={{ marginBottom: 24 }}>
              <Descriptions.Item label="Employé" span={2}>
                <Link to={`/hr/employees/${trainingPlan.employee_data.id}`}>
                  {trainingPlan.employee_data.first_name} {trainingPlan.employee_data.last_name}
                </Link>
              </Descriptions.Item>
              <Descriptions.Item label="Année">
                {trainingPlan.year}
              </Descriptions.Item>
              <Descriptions.Item label="Coût total">
                {trainingPlan.total_cost || 0} MAD
              </Descriptions.Item>
              <Descriptions.Item label="Objectifs" span={2}>
                {trainingPlan.objectives || "Aucun objectif spécifié"}
              </Descriptions.Item>
            </Descriptions>
          </Col>

          <Col xs={24} md={8}>
            <Card title="Statut des approbations" style={{ marginBottom: 24 }}>
              <p>
                <Tag color={trainingPlan.approved_by_manager ? "success" : "default"}>
                  Manager: {trainingPlan.approved_by_manager ? "Approuvé" : "En attente"}
                </Tag>
                {trainingPlan.manager_notes && (
                  <div>
                    <Text type="secondary">Notes: {trainingPlan.manager_notes}</Text>
                  </div>
                )}
              </p>
              <p>
                <Tag color={trainingPlan.approved_by_hr ? "success" : "default"}>
                  RH: {trainingPlan.approved_by_hr ? "Approuvé" : "En attente"}
                </Tag>
                {trainingPlan.hr_notes && (
                  <div>
                    <Text type="secondary">Notes: {trainingPlan.hr_notes}</Text>
                  </div>
                )}
              </p>
              <p>
                <Tag color={trainingPlan.approved_by_finance ? "success" : "default"}>
                  Finance: {trainingPlan.approved_by_finance ? "Approuvé" : "En attente"}
                </Tag>
                {trainingPlan.finance_notes && (
                  <div>
                    <Text type="secondary">Notes: {trainingPlan.finance_notes}</Text>
                  </div>
                )}
              </p>
            </Card>

            {/* Actions selon le statut */}
            <Card title="Actions">
              <Space direction="vertical" style={{ width: '100%' }}>
                {trainingPlan.status === 'draft' && (
                  <>
                    <Button 
                      type="primary" 
                      icon={<CheckCircleOutlined />} 
                      onClick={handleSubmitPlan}
                      block
                    >
                      Soumettre pour approbation
                    </Button>
                  </>
                )}

                {trainingPlan.status === 'submitted' && (
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

                {trainingPlan.status === 'approved_manager' && (
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

                {trainingPlan.status === 'approved_hr' && (
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
              </Space>
            </Card>
          </Col>
        </Row>

        {/* Liste des formations */}
        <Divider />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <Title level={4}>Formations</Title>
          {trainingPlan.status === 'draft' && (
            <Button type="primary" icon={<PlusOutlined />} onClick={() => showItemModal()}>
              Ajouter une formation
            </Button>
          )}
        </div>

        <Table
          columns={trainingItemsColumns}
          dataSource={trainingPlan.training_items || []}
          rowKey="id"
          pagination={false}
        />
      </Card>

      {/* Modal pour approuver le plan */}
      <Modal
        title={`Approuver le plan de formation (${
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

      {/* Modal pour rejeter le plan */}
      <Modal
        title={`Rejeter le plan de formation (${
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

      {/* Modal pour ajouter/modifier une formation */}
      <Modal
        title={editingItem ? "Modifier la formation" : "Ajouter une formation"}
        visible={itemModalVisible}
        onCancel={() => setItemModalVisible(false)}
        footer={[
          <Button key="back" onClick={() => setItemModalVisible(false)}>
            Annuler
          </Button>,
          <Button 
            key="submit" 
            type="primary" 
            loading={submitting} 
            onClick={handleItemSave}
          >
            {editingItem ? "Mettre à jour" : "Ajouter"}
          </Button>,
        ]}
      >
        <Form
          form={itemForm}
          layout="vertical"
        >
          <Form.Item
            name="training_course"
            label="Formation"
            rules={[{ required: true, message: 'Veuillez sélectionner une formation' }]}
          >
            <Select
              placeholder="Sélectionner une formation"
              showSearch
              optionFilterProp="children"
              filterOption={(input, option) =>
                option.children.toLowerCase().indexOf(input.toLowerCase()) >= 0
              }
            >
              {trainingCourses.map(course => (
                <Option key={course.id} value={course.id}>{course.title}</Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item
            name="planned_quarter"
            label="Trimestre prévu"
            rules={[{ required: true, message: 'Veuillez sélectionner un trimestre' }]}
          >
            <Select placeholder="Sélectionner un trimestre">
              <Option value={1}>Q1</Option>
              <Option value={2}>Q2</Option>
              <Option value={3}>Q3</Option>
              <Option value={4}>Q4</Option>
            </Select>
          </Form.Item>
          <Form.Item
            name="priority"
            label="Priorité"
            rules={[{ required: true, message: 'Veuillez sélectionner une priorité' }]}
            initialValue={2}
          >
            <Select placeholder="Sélectionner une priorité">
              <Option value={1}>Basse</Option>
              <Option value={2}>Moyenne</Option>
              <Option value={3}>Haute</Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>

      {/* Modal pour programmer une formation */}
      <Modal
        title="Programmer la formation"
        visible={scheduleModalVisible}
        onCancel={() => setScheduleModalVisible(false)}
        footer={[
          <Button key="back" onClick={() => setScheduleModalVisible(false)}>
            Annuler
          </Button>,
          <Button 
            key="submit" 
            type="primary" 
            loading={submitting} 
            onClick={handleSchedule}
          >
            Programmer
          </Button>,
        ]}
      >
        <Form
          form={scheduleForm}
          layout="vertical"
        >
          <Form.Item
            name="scheduled_date"
            label="Date programmée"
            rules={[{ required: true, message: 'Veuillez sélectionner une date' }]}
          >
            <DatePicker 
              style={{ width: '100%' }} 
              format="DD/MM/YYYY"
            />
          </Form.Item>
        </Form>
      </Modal>

      {/* Modal pour évaluer une formation */}
      <Modal
        title="Évaluer la formation"
        visible={evaluateModalVisible}
        onCancel={() => setEvaluateModalVisible(false)}
        footer={[
          <Button key="back" onClick={() => setEvaluateModalVisible(false)}>
            Annuler
          </Button>,
          editingItem && editingItem.status !== 'completed' ? (
            <Button 
              key="submit" 
              type="primary" 
              loading={submitting} 
              onClick={handleCompleteTraining}
            >
              Terminer la formation
            </Button>
          ) : (
            <Button 
              key="submit" 
              type="primary" 
              loading={submitting} 
              onClick={handleManagerEvaluation}
            >
              Enregistrer l'évaluation
            </Button>
          ),
        ]}
        width={700}
      >
        <Form
          form={evaluateForm}
          layout="vertical"
        >
          {editingItem && editingItem.status !== 'completed' && (
            <>
              <Form.Item
                name="completion_date"
                label="Date de fin"
                rules={[{ required: true, message: 'Veuillez sélectionner une date' }]}
                initialValue={moment()}
              >
                <DatePicker 
                  style={{ width: '100%' }} 
                  format="DD/MM/YYYY"
                />
              </Form.Item>
              <Form.Item
                name="employee_rating"
                label="Évaluation par l'employé"
                rules={[{ required: true, message: 'Veuillez donner une note' }]}
              >
                <Rate 
                  value={evaluateForm.getFieldValue('employee_rating') || 0} 
                  onChange={value => evaluateForm.setFieldsValue({ employee_rating: value })} 
                />
              </Form.Item>
              <Form.Item
                name="employee_comments"
                label="Commentaires de l'employé"
              >
                <TextArea rows={4} />
              </Form.Item>
            </>
          )}

          {editingItem && editingItem.status === 'completed' && (
            <>
              <Form.Item
                label="Date de fin"
              >
                {moment(editingItem.completion_date).format('DD/MM/YYYY')}
              </Form.Item>
              <Form.Item
                label="Évaluation par l'employé"
              >
                <Rate value={editingItem.employee_rating || 0} disabled />
              </Form.Item>
              <Form.Item
                label="Commentaires de l'employé"
              >
                {editingItem.employee_comments || "Aucun commentaire"}
              </Form.Item>
              <Divider />
              <Form.Item
                name="manager_rating"
                label="Évaluation par le manager"
                rules={[{ required: true, message: 'Veuillez donner une note' }]}
              >
                <Rate 
                  value={evaluateForm.getFieldValue('manager_rating') || 0} 
                  onChange={value => evaluateForm.setFieldsValue({ manager_rating: value })} 
                />
              </Form.Item>
              <Form.Item
                name="manager_comments"
                label="Commentaires du manager"
              >
                <TextArea rows={4} />
              </Form.Item>
            </>
          )}
        </Form>
      </Modal>
    </div>
  );
};

export default TrainingPlanDetail;
