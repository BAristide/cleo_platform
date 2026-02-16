// src/components/hr/JobTitleDetail.js
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
  ToolOutlined,
  PlusOutlined
} from '@ant-design/icons';
import axios from '../../utils/axiosConfig';
import { extractResultsFromResponse } from '../../utils/apiUtils';

const { Title, Text } = Typography;
const { Option } = Select;
const { TextArea } = Input;

const JobTitleDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [jobTitle, setJobTitle] = useState(null);
  const [department, setDepartment] = useState(null);
  const [employees, setEmployees] = useState([]);
  const [skillRequirements, setSkillRequirements] = useState([]);
  const [skills, setSkills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [skillModalVisible, setSkillModalVisible] = useState(false);
  const [editingSkill, setEditingSkill] = useState(null);
  const [form] = Form.useForm();
  const [skillForm] = Form.useForm();

  useEffect(() => {
    fetchJobTitleData();
    fetchSkills();
  }, [id]);

  const fetchJobTitleData = async () => {
    setLoading(true);
    try {
      // Récupérer les détails du poste
      const jobTitleResponse = await axios.get(`/api/hr/job-titles/${id}/`);
      setJobTitle(jobTitleResponse.data);
      
      // Initialiser le formulaire avec les données du poste
      form.setFieldsValue({
        name: jobTitleResponse.data.name,
        department: jobTitleResponse.data.department?.id,
        description: jobTitleResponse.data.description,
        is_management: jobTitleResponse.data.is_management
      });

      // Récupérer les détails du département
      if (jobTitleResponse.data.department?.id) {
        const departmentResponse = await axios.get(`/api/hr/departments/${jobTitleResponse.data.department.id}/`);
        setDepartment(departmentResponse.data);
      }

      // Récupérer les employés qui ont ce poste
      const employeesResponse = await axios.get(`/api/hr/job-titles/${id}/employees/`);
      setEmployees(extractResultsFromResponse(employeesResponse));

      // Récupérer les compétences requises pour ce poste
      const skillsRequiredResponse = await axios.get(`/api/hr/job-titles/${id}/skills_required/`);
      setSkillRequirements(extractResultsFromResponse(skillsRequiredResponse));

      setLoading(false);
    } catch (error) {
      console.error("Erreur lors de la récupération des données:", error);
      message.error("Impossible de charger les détails du poste");
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
      await axios.delete(`/api/hr/job-titles/${id}/`);
      message.success("Poste supprimé avec succès");
      navigate('/hr/job-titles');
    } catch (error) {
      console.error("Erreur lors de la suppression:", error);
      message.error("Impossible de supprimer le poste. Il est peut-être utilisé par des employés.");
    }
  };

  const handleEditSave = async () => {
    try {
      const values = await form.validateFields();
      await axios.put(`/api/hr/job-titles/${id}/`, values);
      message.success("Poste mis à jour avec succès");
      setEditing(false);
      fetchJobTitleData();
    } catch (error) {
      console.error("Erreur lors de la mise à jour:", error);
      message.error("Impossible de mettre à jour le poste");
    }
  };

  const showSkillModal = (skill = null) => {
    setEditingSkill(skill);
    skillForm.resetFields();
    if (skill) {
      skillForm.setFieldsValue({
        skill: skill.skill.id,
        required_level: skill.required_level,
        importance: skill.importance,
        notes: skill.notes
      });
    }
    setSkillModalVisible(true);
  };

  const handleSkillSave = async () => {
    try {
      const values = await skillForm.validateFields();
      
      const formData = {
        job_title: id,
        ...values
      };

      if (editingSkill) {
        // Mode édition
        await axios.put(`/api/hr/job-skill-requirements/${editingSkill.id}/`, formData);
        message.success("Exigence de compétence mise à jour avec succès");
      } else {
        // Mode création
        await axios.post('/api/hr/job-skill-requirements/', formData);
        message.success("Exigence de compétence ajoutée avec succès");
      }
      
      setSkillModalVisible(false);
      fetchJobTitleData();
    } catch (error) {
      console.error("Erreur lors de l'enregistrement:", error);
      message.error("Impossible d'enregistrer l'exigence de compétence");
    }
  };

  const handleDeleteSkill = async (skillId) => {
    try {
      await axios.delete(`/api/hr/job-skill-requirements/${skillId}/`);
      message.success("Exigence de compétence supprimée avec succès");
      fetchJobTitleData();
    } catch (error) {
      console.error("Erreur lors de la suppression:", error);
      message.error("Impossible de supprimer l'exigence de compétence");
    }
  };

  const getLevelColor = (level) => {
    switch (level) {
      case 1: return '#ffc107'; // Notions - jaune
      case 2: return '#2196f3'; // Intermédiaire - bleu
      case 3: return '#4caf50'; // Avancé - vert
      case 4: return '#9c27b0'; // Expert - violet
      case 5: return '#f44336'; // Maître - rouge
      default: return '#cccccc';
    }
  };

  const getImportanceColor = (importance) => {
    switch (importance) {
      case 'optional': return 'default';
      case 'preferred': return 'blue';
      case 'required': return 'green';
      case 'critical': return 'red';
      default: return 'default';
    }
  };

  const getImportanceDisplay = (importance) => {
    switch (importance) {
      case 'optional': return 'Optionnelle';
      case 'preferred': return 'Préférée';
      case 'required': return 'Requise';
      case 'critical': return 'Critique';
      default: return importance;
    }
  };

  const employeesColumns = [
    {
      title: 'Nom',
      key: 'name',
      render: (_, record) => (
        <Link to={`/hr/employees/${record.id}`}>
          {record.first_name} {record.last_name}
        </Link>
      ),
      sorter: (a, b) => `${a.last_name} ${a.first_name}`.localeCompare(`${b.last_name} ${b.first_name}`)
    },
    {
      title: 'Email',
      dataIndex: 'email',
      key: 'email',
    },
    {
      title: 'Statut',
      dataIndex: 'is_active',
      key: 'is_active',
      render: (is_active) => (
        <Tag color={is_active ? 'green' : 'red'}>
          {is_active ? 'Actif' : 'Inactif'}
        </Tag>
      ),
    },
    {
      title: 'Manager',
      dataIndex: 'manager_name',
      key: 'manager_name',
      render: (text) => text || "—",
    }
  ];

  const skillRequirementsColumns = [
    {
      title: 'Compétence',
      key: 'skill',
      render: (_, record) => record.skill_data.name,
      sorter: (a, b) => a.skill_data.name.localeCompare(b.skill_data.name)
    },
    {
      title: 'Catégorie',
      key: 'category',
      render: (_, record) => record.skill_data.category_display,
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
      render: (_, record) => (
        <Tag color={getImportanceColor(record.importance)}>
          {record.importance_display}
        </Tag>
      ),
      sorter: (a, b) => a.importance.localeCompare(b.importance)
    },
    {
      title: 'Notes',
      dataIndex: 'notes',
      key: 'notes',
      ellipsis: true,
      render: (text) => text || "—",
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
            title="Êtes-vous sûr de vouloir supprimer cette exigence ?"
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

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '300px' }}>
        <Spin size="large" />
      </div>
    );
  }

  if (!jobTitle) {
    return <div>Poste non trouvé</div>;
  }

  return (
    <div className="job-title-detail">
      <Space style={{ marginBottom: 16 }}>
        <Button icon={<ArrowLeftOutlined />}>
          <Link to="/hr/job-titles">Retour à la liste</Link>
        </Button>
        {!editing && (
          <>
            <Button type="primary" icon={<EditOutlined />} onClick={() => setEditing(true)}>
              Modifier
            </Button>
            <Popconfirm
              title="Êtes-vous sûr de vouloir supprimer ce poste ?"
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
            <Title level={3}>Modifier le poste</Title>
            <Form
              form={form}
              layout="vertical"
              onFinish={handleEditSave}
            >
              <Form.Item
                name="name"
                label="Nom"
                rules={[{ required: true, message: 'Veuillez saisir le nom du poste' }]}
              >
                <Input />
              </Form.Item>

              <Form.Item
                name="department"
                label="Département"
                rules={[{ required: true, message: 'Veuillez sélectionner un département' }]}
              >
                <Select>
                  {department && <Option value={department.id}>{department.name}</Option>}
                </Select>
              </Form.Item>

              <Form.Item
                name="description"
                label="Description"
              >
                <TextArea rows={4} />
              </Form.Item>

              <Form.Item
                name="is_management"
                label="Poste de management"
              >
                <Select>
                  <Option value={true}>Oui</Option>
                  <Option value={false}>Non</Option>
                </Select>
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
            <Title level={3}>{jobTitle.name}</Title>
            <Tag color={jobTitle.is_management ? 'purple' : 'default'} style={{ marginBottom: 16 }}>
              {jobTitle.is_management ? 'Management' : 'Standard'}
            </Tag>

            <Descriptions bordered column={{ xxl: 2, xl: 2, lg: 2, md: 1, sm: 1, xs: 1 }}>
              <Descriptions.Item label="Département">
                {department ? (
                  <Link to={`/hr/departments/${department.id}`}>
                    {department.name}
                  </Link>
                ) : (
                  "Non spécifié"
                )}
              </Descriptions.Item>
              <Descriptions.Item label="Nombre d'employés">
                <Tag color="blue">{employees.length}</Tag>
              </Descriptions.Item>
              {jobTitle.description && (
                <Descriptions.Item label="Description" span={2}>
                  {jobTitle.description}
                </Descriptions.Item>
              )}
            </Descriptions>

            <Divider />

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <Title level={4}><ToolOutlined /> Compétences requises</Title>
              <Button type="primary" icon={<PlusOutlined />} onClick={() => showSkillModal()}>
                Ajouter une compétence
              </Button>
            </div>

            <Table
              columns={skillRequirementsColumns}
              dataSource={skillRequirements}
              rowKey="id"
              pagination={false}
            />

            <Divider />

            <Title level={4}><TeamOutlined /> Employés</Title>
            <Table
              columns={employeesColumns}
              dataSource={employees}
              rowKey="id"
              pagination={{ pageSize: 10 }}
            />
          </>
        )}
      </Card>

      {/* Modal pour ajouter/modifier une exigence de compétence */}
      <Modal
        title={editingSkill ? "Modifier l'exigence de compétence" : "Ajouter une exigence de compétence"}
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
            name="required_level"
            label="Niveau requis"
            rules={[{ required: true, message: 'Veuillez sélectionner un niveau' }]}
          >
            <Select placeholder="Sélectionner un niveau">
              <Option value={1}>Notions</Option>
              <Option value={2}>Intermédiaire</Option>
              <Option value={3}>Avancé</Option>
              <Option value={4}>Expert</Option>
              <Option value={5}>Maître</Option>
            </Select>
          </Form.Item>
          <Form.Item
            name="importance"
            label="Importance"
            rules={[{ required: true, message: 'Veuillez sélectionner une importance' }]}
            initialValue="required"
          >
            <Select placeholder="Sélectionner une importance">
              <Option value="optional">Optionnelle</Option>
              <Option value="preferred">Préférée</Option>
              <Option value="required">Requise</Option>
              <Option value="critical">Critique</Option>
            </Select>
          </Form.Item>
          <Form.Item
            name="notes"
            label="Notes"
          >
            <TextArea rows={4} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default JobTitleDetail;
