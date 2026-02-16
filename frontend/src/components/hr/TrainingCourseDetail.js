// src/components/hr/TrainingCourseDetail.js
import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  Card,
  Button,
  Space,
  Typography,
  Descriptions,
  Table,
  Tag,
  Spin,
  message,
  Form,
  Input,
  Select,
  Modal,
  Divider,
  Popconfirm,
  InputNumber
} from 'antd';
import {
  EditOutlined,
  DeleteOutlined,
  ArrowLeftOutlined,
  ToolOutlined,
  PlusOutlined
} from '@ant-design/icons';
import axios from '../../utils/axiosConfig';
import { extractResultsFromResponse } from '../../utils/apiUtils';

const { Title, Text } = Typography;
const { Option } = Select;
const { TextArea } = Input;

const TrainingCourseDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [trainingCourse, setTrainingCourse] = useState(null);
  const [skillsProvided, setSkillsProvided] = useState([]);
  const [trainingPlans, setTrainingPlans] = useState([]);
  const [skills, setSkills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [skillModalVisible, setSkillModalVisible] = useState(false);
  const [editingSkill, setEditingSkill] = useState(null);
  const [form] = Form.useForm();
  const [skillForm] = Form.useForm();

  useEffect(() => {
    fetchTrainingCourseData();
    fetchSkills();
  }, [id]);

  const fetchTrainingCourseData = async () => {
    setLoading(true);
    try {
      // Récupérer les détails de la formation
      const courseResponse = await axios.get(`/api/hr/training-courses/${id}/`);
      setTrainingCourse(courseResponse.data);
      
      // Initialiser le formulaire avec les données de la formation
      form.setFieldsValue({
        title: courseResponse.data.title,
        category: courseResponse.data.category,
        description: courseResponse.data.description,
        duration_hours: courseResponse.data.duration_hours,
        provider: courseResponse.data.provider,
        location: courseResponse.data.location,
        is_internal: courseResponse.data.is_internal,
        is_online: courseResponse.data.is_online,
        cost: courseResponse.data.cost
      });

      // Récupérer les compétences développées par cette formation
      const skillsResponse = await axios.get(`/api/hr/training-courses/${id}/skills_provided/`);
      setSkillsProvided(extractResultsFromResponse(skillsResponse));

      // Récupérer les plans de formation qui incluent cette formation
      const plansResponse = await axios.get(`/api/hr/training-courses/${id}/training_plans/`);
      setTrainingPlans(extractResultsFromResponse(plansResponse));

      setLoading(false);
    } catch (error) {
      console.error("Erreur lors de la récupération des données:", error);
      message.error("Impossible de charger les détails de la formation");
      setLoading(false);
    }
  };

  const fetchSkills = async () => {
    try {
      const response = await axios.get('/api/hr/skills/');
      setSkills(extractResultsFromResponse(response));
    } catch (error) {
      console.error("Erreur lors du chargement des compétences:", error);
    }
  };

  const handleDelete = async () => {
    try {
      await axios.delete(`/api/hr/training-courses/${id}/`);
      message.success("Formation supprimée avec succès");
      navigate('/hr/training-courses');
    } catch (error) {
      console.error("Erreur lors de la suppression:", error);
      message.error("Impossible de supprimer la formation. Elle est peut-être utilisée dans des plans de formation.");
    }
  };

  const handleEditSave = async () => {
    try {
      const values = await form.validateFields();
      await axios.put(`/api/hr/training-courses/${id}/`, values);
      message.success("Formation mise à jour avec succès");
      setEditing(false);
      fetchTrainingCourseData();
    } catch (error) {
      console.error("Erreur lors de la mise à jour:", error);
      message.error("Impossible de mettre à jour la formation");
    }
  };

  const showSkillModal = (skill = null) => {
    setEditingSkill(skill);
    skillForm.resetFields();
    if (skill) {
      skillForm.setFieldsValue({
        skill: skill.skill.id,
        level_provided: skill.level_provided
      });
    }
    setSkillModalVisible(true);
  };

  const handleSkillSave = async () => {
    try {
      const values = await skillForm.validateFields();
      
      const formData = {
        training_course: id,
        ...values
      };

      if (editingSkill) {
        // Mode édition
        await axios.put(`/api/hr/training-skills/${editingSkill.id}/`, formData);
        message.success("Compétence mise à jour avec succès");
      } else {
        // Mode création
        await axios.post('/api/hr/training-skills/', formData);
        message.success("Compétence ajoutée avec succès");
      }
      
      setSkillModalVisible(false);
      fetchTrainingCourseData();
    } catch (error) {
      console.error("Erreur lors de l'enregistrement:", error);
      message.error("Impossible d'enregistrer la compétence");
    }
  };

  const handleDeleteSkill = async (skillId) => {
    try {
      await axios.delete(`/api/hr/training-skills/${skillId}/`);
      message.success("Compétence supprimée avec succès");
      fetchTrainingCourseData();
    } catch (error) {
      console.error("Erreur lors de la suppression:", error);
      message.error("Impossible de supprimer la compétence");
    }
  };

  const getCategoryDisplay = (category) => {
    switch (category) {
      case 'technical': return 'Technique';
      case 'soft_skills': return 'Compétences douces';
      case 'language': return 'Langue';
      case 'certification': return 'Certification';
      default: return 'Autre';
    }
  };

  const getCategoryColor = (category) => {
    switch (category) {
      case 'technical': return 'blue';
      case 'soft_skills': return 'green';
      case 'language': return 'geekblue';
      case 'certification': return 'purple';
      default: return 'default';
    }
  };

  const getLevelColor = (level) => {
    switch (level) {
      case 1: return '#ffc107'; // Débutant - jaune
      case 2: return '#2196f3'; // Intermédiaire - bleu
      case 3: return '#4caf50'; // Avancé - vert
      case 4: return '#9c27b0'; // Expert - violet
      case 5: return '#f44336'; // Maître - rouge
      default: return '#cccccc';
    }
  };

  const skillsProvidedColumns = [
    {
      title: 'Compétence',
      key: 'skill',
      render: (_, record) => (
        <Link to={`/hr/skills/${record.skill.id}`}>
          {record.skill.name}
        </Link>
      ),
      sorter: (a, b) => a.skill.name.localeCompare(b.skill.name)
    },
    {
      title: 'Catégorie',
      key: 'category',
      render: (_, record) => {
        const category = record.skill.category;
        return (
          <Tag color={getCategoryColor(category)}>
            {getCategoryDisplay(category)}
          </Tag>
        );
      }
    },
    {
      title: 'Niveau fourni',
      key: 'level_provided',
      render: (_, record) => (
        <Space>
          <div 
            className="skill-level" 
            style={{ 
              display: 'inline-block',
              width: '16px',
              height: '16px',
              borderRadius: '50%',
              marginRight: '4px',
              backgroundColor: getLevelColor(record.level_provided) 
            }}
          />
          {record.level_provided_display}
        </Space>
      ),
      sorter: (a, b) => a.level_provided - b.level_provided
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Space size="small">
          <Button size="small" type="primary" icon={<EditOutlined />} onClick={() => showSkillModal(record)}>
            Modifier
          </Button>
          <Popconfirm
            title="Êtes-vous sûr de vouloir supprimer cette compétence ?"
            onConfirm={() => handleDeleteSkill(record.id)}
            okText="Oui"
            cancelText="Non"
          >
            <Button size="small" danger icon={<DeleteOutlined />}>
              Supprimer
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const trainingPlansColumns = [
    {
      title: 'Employé',
      key: 'employee',
      render: (_, record) => (
        <Link to={`/hr/employees/${record.plan.employee.id}`}>
          {record.plan.employee.first_name} {record.plan.employee.last_name}
        </Link>
      ),
    },
    {
      title: 'Année',
      key: 'year',
      render: (_, record) => record.plan.year,
    },
    {
      title: 'Trimestre prévu',
      key: 'planned_quarter',
      render: (_, record) => {
        const quarters = record.items.map(item => `Q${item.planned_quarter}`);
        return quarters.join(', ');
      },
    },
    {
      title: 'Priorité',
      key: 'priority',
      render: (_, record) => {
        const priorities = record.items.map(item => {
          let color;
          switch (item.priority) {
            case 1: color = 'default'; break;
            case 2: color = 'warning'; break;
            case 3: color = 'error'; break;
            default: color = 'default';
          }
          return <Tag color={color} key={item.id}>{item.priority_display}</Tag>;
        });
        return <Space>{priorities}</Space>;
      },
    },
    {
      title: 'Statut',
      key: 'status',
      render: (_, record) => {
        const statuses = record.items.map(item => {
          let color;
          switch (item.status) {
            case 'planned': color = 'default'; break;
            case 'scheduled': color = 'processing'; break;
            case 'in_progress': color = 'warning'; break;
            case 'completed': color = 'success'; break;
            case 'cancelled': color = 'error'; break;
            default: color = 'default';
          }
          return <Tag color={color} key={item.id}>{item.status_display}</Tag>;
        });
        return <Space>{statuses}</Space>;
      },
    },
    {
      title: 'Plan',
      key: 'plan',
      render: (_, record) => (
        <Button size="small" type="primary">
          <Link to={`/hr/training-plans/${record.plan.id}`}>Voir le plan</Link>
        </Button>
      ),
    },
  ];

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '300px' }}>
        <Spin size="large" />
      </div>
    );
  }

  if (!trainingCourse) {
    return <div>Formation non trouvée</div>;
  }

  return (
    <div className="training-course-detail">
      <Space style={{ marginBottom: 16 }}>
        <Button icon={<ArrowLeftOutlined />}>
          <Link to="/hr/training-courses">Retour à la liste</Link>
        </Button>
        {!editing && (
          <>
            <Button type="primary" icon={<EditOutlined />} onClick={() => setEditing(true)}>
              Modifier
            </Button>
            <Popconfirm
              title="Êtes-vous sûr de vouloir supprimer cette formation ?"
              onConfirm={handleDelete}
              okText="Oui"
              cancelText="Non"
            >
              <Button type="danger" icon={<DeleteOutlined />}>
                Supprimer
              </Button>
            </Popconfirm>
          </>
        )}
      </Space>

      <Card>
        {editing ? (
          <>
            <Title level={3}>Modifier la formation</Title>
            <Form
              form={form}
              layout="vertical"
              onFinish={handleEditSave}
            >
              <Form.Item
                name="title"
                label="Titre"
                rules={[{ required: true, message: 'Veuillez saisir un titre' }]}
              >
                <Input />
              </Form.Item>
              <Form.Item
                name="category"
                label="Catégorie"
                rules={[{ required: true, message: 'Veuillez sélectionner une catégorie' }]}
              >
                <Select>
                  <Option value="technical">Technique</Option>
                  <Option value="soft_skills">Compétences douces</Option>
                  <Option value="language">Langue</Option>
                  <Option value="certification">Certification</Option>
                  <Option value="other">Autre</Option>
                </Select>
              </Form.Item>
              <Form.Item
                name="description"
                label="Description"
              >
                <TextArea rows={4} />
              </Form.Item>
              <Space style={{ display: 'flex', width: '100%' }} align="start">
                <Form.Item
                  name="duration_hours"
                  label="Durée (heures)"
                  rules={[{ required: true, message: 'Veuillez saisir une durée' }]}
                  style={{ width: '33%' }}
                >
                  <InputNumber min={1} style={{ width: '100%' }} />
                </Form.Item>
                <Form.Item
                  name="cost"
                  label="Coût"
                  style={{ width: '33%' }}
                >
                  <InputNumber min={0} style={{ width: '100%' }} addonAfter="MAD" />
                </Form.Item>
              </Space>
              <Form.Item
                name="provider"
                label="Prestataire"
              >
                <Input />
              </Form.Item>
              <Form.Item
                name="location"
                label="Lieu"
              >
                <Input />
              </Form.Item>
              <Space style={{ display: 'flex', width: '100%' }} align="start">
                <Form.Item
                  name="is_internal"
                  label="Formation interne"
                  valuePropName="checked"
                  style={{ width: '50%' }}
                >
                  <Select>
                    <Option value={true}>Oui</Option>
                    <Option value={false}>Non</Option>
                  </Select>
                </Form.Item>
                <Form.Item
                  name="is_online"
                  label="Formation en ligne"
                  valuePropName="checked"
                  style={{ width: '50%' }}
                >
                  <Select>
                    <Option value={true}>Oui</Option>
                    <Option value={false}>Non</Option>
                  </Select>
                </Form.Item>
              </Space>

              <Form.Item>
                <Space>
                  <Button type="primary" htmlType="submit">
                    Enregistrer
                  </Button>
                  <Button onClick={() => setEditing(false)}>
                    Annuler
                  </Button>
                </Space>
              </Form.Item>
            </Form>
          </>
        ) : (
          <>
            <Title level={3}>{trainingCourse.title}</Title>
            <Tag color={getCategoryColor(trainingCourse.category)} style={{ marginBottom: 16 }}>
              {getCategoryDisplay(trainingCourse.category)}
            </Tag>

            <Descriptions bordered column={{ xxl: 3, xl: 3, lg: 3, md: 2, sm: 1, xs: 1 }} style={{ marginBottom: 24 }}>
              <Descriptions.Item label="Durée">{trainingCourse.duration_hours} heures</Descriptions.Item>
              <Descriptions.Item label="Coût">{trainingCourse.cost ? `${trainingCourse.cost} MAD` : "Non spécifié"}</Descriptions.Item>
              <Descriptions.Item label="Type">
                <Space>
                  {trainingCourse.is_internal && <Tag color="blue">Interne</Tag>}
                  {trainingCourse.is_online && <Tag color="green">En ligne</Tag>}
                  {!trainingCourse.is_internal && !trainingCourse.is_online && <Tag color="default">Externe</Tag>}
                </Space>
              </Descriptions.Item>
              <Descriptions.Item label="Prestataire" span={3}>{trainingCourse.provider || "Non spécifié"}</Descriptions.Item>
              <Descriptions.Item label="Lieu" span={3}>{trainingCourse.location || "Non spécifié"}</Descriptions.Item>
              {trainingCourse.description && (
                <Descriptions.Item label="Description" span={3}>
                  {trainingCourse.description}
                </Descriptions.Item>
              )}
            </Descriptions>

            <Divider />

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <Title level={4}><ToolOutlined /> Compétences développées</Title>
              <Button type="primary" icon={<PlusOutlined />} onClick={() => showSkillModal()}>
                Ajouter une compétence
              </Button>
            </div>

            <Table
              columns={skillsProvidedColumns}
              dataSource={skillsProvided}
              rowKey="id"
              pagination={false}
            />

            <Divider />

            <Title level={4}>Plans de formation utilisant cette formation</Title>
            <Table
              columns={trainingPlansColumns}
              dataSource={trainingPlans}
              rowKey={(record) => `${record.plan.id}`}
              pagination={{ pageSize: 10 }}
            />
          </>
        )}
      </Card>

      {/* Modal pour ajouter/modifier une compétence */}
      <Modal
        title={editingSkill ? "Modifier la compétence" : "Ajouter une compétence"}
        visible={skillModalVisible}
        onCancel={() => setSkillModalVisible(false)}
        footer={[
          <Button key="back" onClick={() => setSkillModalVisible(false)}>
            Annuler
          </Button>,
          <Button key="submit" type="primary" onClick={handleSkillSave}>
            {editingSkill ? "Mettre à jour" : "Ajouter"}
          </Button>,
        ]}
      >
        <Form form={skillForm} layout="vertical">
          <Form.Item
            name="skill"
            label="Compétence"
            rules={[{ required: true, message: 'Veuillez sélectionner une compétence' }]}
          >
            <Select
              placeholder="Sélectionner une compétence"
              showSearch
              optionFilterProp="children"
              filterOption={(input, option) =>
                option.children.toLowerCase().indexOf(input.toLowerCase()) >= 0
              }
            >
              {skills.map(skill => (
                <Option key={skill.id} value={skill.id}>{skill.name}</Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item
            name="level_provided"
            label="Niveau fourni"
            rules={[{ required: true, message: 'Veuillez sélectionner un niveau' }]}
          >
            <Select placeholder="Sélectionner un niveau">
              <Option value={1}>Débutant</Option>
              <Option value={2}>Intermédiaire</Option>
              <Option value={3}>Avancé</Option>
              <Option value={4}>Expert</Option>
              <Option value={5}>Maître</Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default TrainingCourseDetail;
