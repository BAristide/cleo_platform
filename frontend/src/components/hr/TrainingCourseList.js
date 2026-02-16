// src/components/hr/TrainingCourseList.js
import React, { useState, useEffect } from 'react';
import { Table, Card, Button, Space, Input, Select, Typography, Tag, Spin, message, Popconfirm, Modal, Form, InputNumber } from 'antd';
import {
  SearchOutlined,
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  BookOutlined,
  ToolOutlined
} from '@ant-design/icons';
import { Link } from 'react-router-dom';
import axios from '../../utils/axiosConfig';
import { extractResultsFromResponse } from '../../utils/apiUtils';

const { Title, Text } = Typography;
const { Option } = Select;
const { TextArea } = Input;

const TrainingCourseList = () => {
  const [loading, setLoading] = useState(true);
  const [trainingCourses, setTrainingCourses] = useState([]);
  const [skills, setSkills] = useState([]);
  const [searchText, setSearchText] = useState('');
  const [categoryFilter, setCategoryFilter] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [skillModalVisible, setSkillModalVisible] = useState(false);
  const [editingCourse, setEditingCourse] = useState(null);
  const [editingCourseSkill, setEditingCourseSkill] = useState(null);
  const [selectedCourseId, setSelectedCourseId] = useState(null);
  const [form] = Form.useForm();
  const [skillForm] = Form.useForm();

  useEffect(() => {
    fetchTrainingCourses();
    fetchSkills();
  }, []);

  const fetchTrainingCourses = async () => {
    setLoading(true);
    try {
      const response = await axios.get('/api/hr/training-courses/');
      const data = extractResultsFromResponse(response);
      setTrainingCourses(data);
      setLoading(false);
    } catch (error) {
      console.error("Erreur lors du chargement des formations:", error);
      message.error("Impossible de charger les formations");
      setLoading(false);
    }
  };

  const fetchSkills = async () => {
    try {
      const response = await axios.get('/api/hr/skills/');
      const data = extractResultsFromResponse(response);
      setSkills(data);
    } catch (error) {
      console.error("Erreur lors du chargement des compétences:", error);
    }
  };

  const handleDelete = async (id) => {
    try {
      await axios.delete(`/api/hr/training-courses/${id}/`);
      message.success("Formation supprimée avec succès");
      fetchTrainingCourses();
    } catch (error) {
      console.error("Erreur lors de la suppression:", error);
      message.error("Impossible de supprimer la formation. Elle est peut-être utilisée dans des plans de formation.");
    }
  };

  const showModal = (course = null) => {
    setEditingCourse(course);
    form.resetFields();
    if (course) {
      form.setFieldsValue({
        title: course.title,
        category: course.category,
        description: course.description,
        duration_hours: course.duration_hours,
        provider: course.provider,
        location: course.location,
        is_internal: course.is_internal,
        is_online: course.is_online,
        cost: course.cost
      });
    }
    setModalVisible(true);
  };

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      
      if (editingCourse) {
        // Mode édition
        await axios.put(`/api/hr/training-courses/${editingCourse.id}/`, values);
        message.success("Formation mise à jour avec succès");
      } else {
        // Mode création
        await axios.post('/api/hr/training-courses/', values);
        message.success("Formation créée avec succès");
      }
      
      setModalVisible(false);
      fetchTrainingCourses();
    } catch (error) {
      console.error("Erreur lors de l'enregistrement:", error);
      message.error("Impossible d'enregistrer la formation");
    }
  };

  const showSkillModal = (courseId, courseSkill = null) => {
    setSelectedCourseId(courseId);
    setEditingCourseSkill(courseSkill);
    skillForm.resetFields();
    if (courseSkill) {
      skillForm.setFieldsValue({
        skill: courseSkill.skill.id,
        level_provided: courseSkill.level_provided
      });
    }
    setSkillModalVisible(true);
  };

  const handleSkillSave = async () => {
    try {
      const values = await skillForm.validateFields();
      
      const formData = {
        training_course: selectedCourseId,
        ...values
      };

      if (editingCourseSkill) {
        // Mode édition
        await axios.put(`/api/hr/training-skills/${editingCourseSkill.id}/`, formData);
        message.success("Compétence mise à jour avec succès");
      } else {
        // Mode création
        await axios.post('/api/hr/training-skills/', formData);
        message.success("Compétence ajoutée avec succès");
      }
      
      setSkillModalVisible(false);
      fetchTrainingCourses();
    } catch (error) {
      console.error("Erreur lors de l'enregistrement:", error);
      message.error("Impossible d'enregistrer la compétence");
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

  const handleSearch = (e) => {
    setSearchText(e.target.value);
  };

  const filteredTrainingCourses = trainingCourses.filter(course => 
    (searchText === '' || 
     course.title.toLowerCase().includes(searchText.toLowerCase()) ||
     (course.description && course.description.toLowerCase().includes(searchText.toLowerCase())) ||
     (course.provider && course.provider.toLowerCase().includes(searchText.toLowerCase()))) &&
    (categoryFilter === null || course.category === categoryFilter)
  );

  const columns = [
    {
      title: 'Titre',
      dataIndex: 'title',
      key: 'title',
      render: (text, record) => (
        <Link to={`/hr/training-courses/${record.id}`}>{text}</Link>
      ),
      sorter: (a, b) => a.title.localeCompare(b.title)
    },
    {
      title: 'Catégorie',
      dataIndex: 'category',
      key: 'category',
      render: (category) => (
        <Tag color={getCategoryColor(category)}>
          {getCategoryDisplay(category)}
        </Tag>
      ),
      sorter: (a, b) => a.category.localeCompare(b.category)
    },
    {
      title: 'Durée (heures)',
      dataIndex: 'duration_hours',
      key: 'duration_hours',
      sorter: (a, b) => a.duration_hours - b.duration_hours
    },
    {
      title: 'Prestataire',
      dataIndex: 'provider',
      key: 'provider',
      render: (text) => text || '—',
    },
    {
      title: 'Type',
      key: 'type',
      render: (_, record) => (
        <Space>
          {record.is_internal && <Tag color="blue">Interne</Tag>}
          {record.is_online && <Tag color="green">En ligne</Tag>}
          {!record.is_internal && !record.is_online && <Tag color="default">Externe</Tag>}
        </Space>
      ),
    },
    {
      title: 'Coût',
      dataIndex: 'cost',
      key: 'cost',
      render: (cost) => cost ? `${cost} MAD` : '—',
      sorter: (a, b) => (a.cost || 0) - (b.cost || 0)
    },
    {
      title: 'Compétences',
      key: 'skills',
      render: (_, record) => (
        <Space wrap>
          {record.skills_provided && record.skills_provided.map(skill => (
            <Tag key={skill.id} color="blue">
              {skill.skill_data.name}
            </Tag>
          ))}
          <Button 
            size="small" 
            icon={<PlusOutlined />} 
            onClick={() => showSkillModal(record.id)}
          >
            Ajouter
          </Button>
        </Space>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Space size="small">
          <Button size="small" type="primary" icon={<EditOutlined />} onClick={() => showModal(record)}>
            Modifier
          </Button>
          <Popconfirm
            title="Êtes-vous sûr de vouloir supprimer cette formation ?"
            onConfirm={() => handleDelete(record.id)}
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

  return (
    <div className="training-course-list">
      <Card>
        <Title level={2}>Formations</Title>

        <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
          <Space>
            <Input
              placeholder="Rechercher une formation..."
              value={searchText}
              onChange={handleSearch}
              prefix={<SearchOutlined />}
              style={{ width: 250 }}
            />
            <Select
              placeholder="Filtrer par catégorie"
              style={{ width: 200 }}
              value={categoryFilter}
              onChange={setCategoryFilter}
              allowClear
            >
              <Option value="technical">Technique</Option>
              <Option value="soft_skills">Compétences douces</Option>
              <Option value="language">Langue</Option>
              <Option value="certification">Certification</Option>
              <Option value="other">Autre</Option>
            </Select>
          </Space>

          <Button type="primary" icon={<PlusOutlined />} onClick={() => showModal()}>
            Nouvelle formation
          </Button>
        </div>

        <Table
          columns={columns}
          dataSource={filteredTrainingCourses}
          rowKey="id"
          loading={loading}
          pagination={{ pageSize: 10 }}
        />
      </Card>

      {/* Modal pour créer/modifier une formation */}
      <Modal
        title={editingCourse ? "Modifier la formation" : "Nouvelle formation"}
        visible={modalVisible}
        onCancel={() => setModalVisible(false)}
        footer={[
          <Button key="back" onClick={() => setModalVisible(false)}>
            Annuler
          </Button>,
          <Button key="submit" type="primary" onClick={handleSave}>
            {editingCourse ? "Mettre à jour" : "Créer"}
          </Button>,
        ]}
        width={700}
      >
        <Form form={form} layout="vertical">
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
        </Form>
      </Modal>

      {/* Modal pour ajouter/modifier une compétence à une formation */}
      <Modal
        title="Ajouter une compétence développée"
        visible={skillModalVisible}
        onCancel={() => setSkillModalVisible(false)}
        footer={[
          <Button key="back" onClick={() => setSkillModalVisible(false)}>
            Annuler
          </Button>,
          <Button key="submit" type="primary" onClick={handleSkillSave}>
            {editingCourseSkill ? "Mettre à jour" : "Ajouter"}
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

export default TrainingCourseList;
