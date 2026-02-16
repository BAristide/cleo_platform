// src/components/hr/SkillDetail.js
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
  Divider,
  Modal,
  Popconfirm
} from 'antd';
import {
  EditOutlined,
  DeleteOutlined,
  ArrowLeftOutlined,
  TeamOutlined,
  BookOutlined,
  ProfileOutlined // Remplacé BriefcaseOutlined par ProfileOutlined
} from '@ant-design/icons';
import axios from '../../utils/axiosConfig';
import { extractResultsFromResponse } from '../../utils/apiUtils';

const { Title, Text } = Typography;
const { Option } = Select;
const { TextArea } = Input;

const SkillDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [skill, setSkill] = useState(null);
  const [employeeSkills, setEmployeeSkills] = useState([]);
  const [jobRequirements, setJobRequirements] = useState([]);
  const [trainingCourses, setTrainingCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [form] = Form.useForm();

  useEffect(() => {
    fetchSkillData();
  }, [id]);

  const fetchSkillData = async () => {
    setLoading(true);
    try {
      // Récupérer les détails de la compétence
      const skillResponse = await axios.get(`/api/hr/skills/${id}/`);
      setSkill(skillResponse.data);
      
      // Initialiser le formulaire avec les données de la compétence
      form.setFieldsValue({
        name: skillResponse.data.name,
        category: skillResponse.data.category,
        description: skillResponse.data.description
      });

      // Récupérer les employés qui ont cette compétence
      const employeesResponse = await axios.get(`/api/hr/skills/${id}/employees/`);
      setEmployeeSkills(extractResultsFromResponse(employeesResponse));

      // Récupérer les postes qui exigent cette compétence
      const jobsResponse = await axios.get(`/api/hr/skills/${id}/job_requirements/`);
      setJobRequirements(extractResultsFromResponse(jobsResponse));

      // Récupérer les formations qui développent cette compétence
      const trainingResponse = await axios.get(`/api/hr/skills/${id}/training_courses/`);
      setTrainingCourses(extractResultsFromResponse(trainingResponse));

      setLoading(false);
    } catch (error) {
      console.error("Erreur lors de la récupération des données:", error);
      message.error("Impossible de charger les détails de la compétence");
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    try {
      await axios.delete(`/api/hr/skills/${id}/`);
      message.success("Compétence supprimée avec succès");
      navigate('/hr/skills');
    } catch (error) {
      console.error("Erreur lors de la suppression:", error);
      message.error("Impossible de supprimer la compétence. Elle est peut-être utilisée par des employés ou des postes.");
    }
  };

  const handleEditSave = async () => {
    try {
      const values = await form.validateFields();
      await axios.put(`/api/hr/skills/${id}/`, values);
      message.success("Compétence mise à jour avec succès");
      setEditing(false);
      fetchSkillData();
    } catch (error) {
      console.error("Erreur lors de la mise à jour:", error);
      message.error("Impossible de mettre à jour la compétence");
    }
  };

  const getCategoryColor = (category) => {
    switch (category) {
      case 'technical': return 'blue';
      case 'soft': return 'green';
      case 'language': return 'geekblue';
      case 'certification': return 'purple';
      default: return 'default';
    }
  };

  const getCategoryDisplay = (category) => {
    switch (category) {
      case 'technical': return 'Technique';
      case 'soft': return 'Compétences douces';
      case 'language': return 'Langue';
      case 'certification': return 'Certification';
      default: return 'Autre';
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

  const employeeSkillsColumns = [
    {
      title: 'Employé',
      key: 'employee',
      render: (_, record) => (
        <Link to={`/hr/employees/${record.employee?.id}`}>
          {record.employee ? 
           `${record.employee.first_name} ${record.employee.last_name}` : 
           "Employé inconnu"}
        </Link>
      ),
      sorter: true
    },
    {
      title: 'Niveau',
      key: 'level',
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
              backgroundColor: getLevelColor(record.level) 
            }}
          />
          {record.level_display}
        </Space>
      ),
      sorter: (a, b) => a.level - b.level
    },
    {
      title: 'Certification',
      key: 'certification',
      render: (_, record) => record.certification ? (
        <>
          {record.certification}
          {record.certification_date && ` (${record.certification_date})`}
        </>
      ) : "Aucune",
    },
    {
      title: 'Notes',
      dataIndex: 'notes',
      key: 'notes',
      ellipsis: true,
      render: (text) => text || "—",
    }
  ];

  const jobRequirementsColumns = [
    {
      title: 'Poste',
      key: 'job_title',
      render: (_, record) => (
        <Link to={`/hr/job-titles/${record.job_title?.id}`}>
          {record.job_title ? record.job_title.name : "Poste inconnu"}
        </Link>
      ),
      sorter: (a, b) => 
        (a.job_title?.name || '').localeCompare(b.job_title?.name || '')
    },
    {
      title: 'Département',
      key: 'department',
      render: (_, record) => record.job_title?.department?.name || "—",
    },
    {
      title: 'Niveau requis',
      key: 'required_level',
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
              backgroundColor: getLevelColor(record.required_level) 
            }}
          />
          {record.required_level_display}
        </Space>
      ),
      sorter: (a, b) => a.required_level - b.required_level
    },
    {
      title: 'Importance',
      key: 'importance',
      render: (_, record) => {
        let color;
        switch (record.importance) {
          case 'optional': color = 'default'; break;
          case 'preferred': color = 'blue'; break;
          case 'required': color = 'green'; break;
          case 'critical': color = 'red'; break;
          default: color = 'default';
        }
        return <Tag color={color}>{record.importance_display}</Tag>;
      },
    }
  ];

  const trainingCoursesColumns = [
    {
      title: 'Formation',
      key: 'training_course',
      render: (_, record) => record.training_course ? (
        <Link to={`/hr/training-courses/${record.training_course.id}`}>
          {record.training_course.title}
        </Link>
      ) : "Formation inconnue",
      sorter: (a, b) => 
        (a.training_course?.title || '').localeCompare(b.training_course?.title || '')
    },
    {
      title: 'Catégorie',
      key: 'category',
      render: (_, record) => record.training_course?.category_display || "—",
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
      title: 'Durée',
      key: 'duration',
      render: (_, record) => record.training_course ? 
        `${record.training_course.duration_hours} heures` : "—",
    },
    {
      title: 'Coût',
      key: 'cost',
      render: (_, record) => record.training_course?.cost ? 
        `${record.training_course.cost} MAD` : "—",
    }
  ];

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '300px' }}>
        <Spin size="large" />
      </div>
    );
  }

  if (!skill) {
    return <div>Compétence non trouvée</div>;
  }

  return (
    <div className="skill-detail">
      <Space style={{ marginBottom: 16 }}>
        <Button icon={<ArrowLeftOutlined />}>
          <Link to="/hr/skills">Retour à la liste</Link>
        </Button>
        {!editing && (
          <>
            <Button type="primary" icon={<EditOutlined />} onClick={() => setEditing(true)}>
              Modifier
            </Button>
            <Popconfirm
              title="Êtes-vous sûr de vouloir supprimer cette compétence ?"
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
            <Title level={3}>Modifier la compétence</Title>
            <Form
              form={form}
              layout="vertical"
              onFinish={handleEditSave}
            >
              <Form.Item
                name="name"
                label="Nom"
                rules={[{ required: true, message: 'Veuillez saisir le nom de la compétence' }]}
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
                  <Option value="soft">Compétences douces</Option>
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
            <Title level={3}>{skill.name}</Title>
            <Tag color={getCategoryColor(skill.category)} style={{ marginBottom: 16 }}>
              {getCategoryDisplay(skill.category)}
            </Tag>

            <Descriptions bordered column={{ xxl: 1, xl: 1, lg: 1, md: 1, sm: 1, xs: 1 }}>
              {skill.description && (
                <Descriptions.Item label="Description">
                  {skill.description}
                </Descriptions.Item>
              )}
            </Descriptions>

            <Divider />

            <Title level={4}><TeamOutlined /> Employés ({employeeSkills.length})</Title>
            <Table
              columns={employeeSkillsColumns}
              dataSource={employeeSkills}
              rowKey="id"
              pagination={{ pageSize: 10 }}
            />

            <Divider />

            <Title level={4}><ProfileOutlined /> Postes exigeant cette compétence ({jobRequirements.length})</Title>
            <Table
              columns={jobRequirementsColumns}
              dataSource={jobRequirements}
              rowKey="id"
              pagination={{ pageSize: 10 }}
            />

            <Divider />

            <Title level={4}><BookOutlined /> Formations développant cette compétence ({trainingCourses.length})</Title>
            <Table
              columns={trainingCoursesColumns}
              dataSource={trainingCourses}
              rowKey="id"
              pagination={{ pageSize: 10 }}
            />
          </>
        )}
      </Card>
    </div>
  );
};

export default SkillDetail;
