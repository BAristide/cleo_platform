// src/components/hr/DepartmentDetail.js
import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  Card,
  Button,
  Space,
  Typography,
  Descriptions,
  Tabs,
  Table,
  Tag,
  Spin,
  message,
  Divider,
  Form,
  Input,
  Select,
  Popconfirm,
  Tree
} from 'antd';
import {
  EditOutlined,
  DeleteOutlined,
  ArrowLeftOutlined,
  TeamOutlined,
  UserOutlined,
  BranchesOutlined
} from '@ant-design/icons';
import axios from '../../utils/axiosConfig';
import { extractResultsFromResponse } from '../../utils/apiUtils';

const { Title, Text } = Typography;
const { TabPane } = Tabs;
const { TextArea } = Input;
const { Option } = Select;

const DepartmentDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [department, setDepartment] = useState(null);
  const [employees, setEmployees] = useState([]);
  const [jobTitles, setJobTitles] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [form] = Form.useForm();

  useEffect(() => {
    fetchDepartmentData();
    fetchAllDepartments();
  }, [id]);

  const fetchDepartmentData = async () => {
    setLoading(true);
    try {
      // Récupérer les détails du département
      const departmentResponse = await axios.get(`/api/hr/departments/${id}/`);
      setDepartment(departmentResponse.data);
      
      // Initialiser le formulaire avec les données du département
      form.setFieldsValue({
        name: departmentResponse.data.name,
        code: departmentResponse.data.code,
        parent: departmentResponse.data.parent ? departmentResponse.data.parent.id : null,
        description: departmentResponse.data.description
      });

      // Récupérer les employés du département
      const employeesResponse = await axios.get(`/api/hr/departments/${id}/employees/`);
      setEmployees(extractResultsFromResponse(employeesResponse));

      // Récupérer les postes du département
      const jobTitlesResponse = await axios.get(`/api/hr/departments/${id}/job_titles/`);
      setJobTitles(extractResultsFromResponse(jobTitlesResponse));

      setLoading(false);
    } catch (error) {
      console.error("Erreur lors de la récupération des données:", error);
      message.error("Impossible de charger les détails du département");
      setLoading(false);
    }
  };

  const fetchAllDepartments = async () => {
    try {
      const response = await axios.get('/api/hr/departments/');
      setDepartments(extractResultsFromResponse(response));
    } catch (error) {
      console.error("Erreur lors du chargement des départements:", error);
    }
  };

  const handleDelete = async () => {
    try {
      await axios.delete(`/api/hr/departments/${id}/`);
      message.success("Département supprimé avec succès");
      navigate('/hr/departments');
    } catch (error) {
      console.error("Erreur lors de la suppression:", error);
      message.error("Impossible de supprimer le département. Vérifiez qu'il n'a pas d'employés ou de sous-départements.");
    }
  };

  const handleEditSave = async () => {
    try {
      const values = await form.validateFields();
      await axios.put(`/api/hr/departments/${id}/`, values);
      message.success("Département mis à jour avec succès");
      setEditing(false);
      fetchDepartmentData();
    } catch (error) {
      console.error("Erreur lors de la mise à jour:", error);
      message.error("Impossible de mettre à jour le département");
    }
  };

  // Construire l'arbre des départements enfants
  const buildChildDepartmentTree = () => {
    if (!departments || !department) return [];

    // Trouver les départements enfants directs
    const childDepts = departments.filter(dept => dept.parent && dept.parent.id === parseInt(id));

    // Fonction récursive pour créer l'arbre
    const buildTree = (depts) => {
      return depts.map(dept => {
        const children = departments.filter(d => d.parent && d.parent.id === dept.id);
        return {
          key: dept.id,
          title: (
            <Space>
              {dept.name}
              <Tag color="blue">{dept.employee_count} employés</Tag>
            </Space>
          ),
          children: children.length > 0 ? buildTree(children) : []
        };
      });
    };

    return buildTree(childDepts);
  };

  const childDepartmentsTree = buildChildDepartmentTree();

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
      title: 'Poste',
      dataIndex: 'job_title_name',
      key: 'job_title_name',
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

  const jobTitlesColumns = [
    {
      title: 'Nom',
      dataIndex: 'name',
      key: 'name',
      render: (text, record) => (
        <Link to={`/hr/job-titles/${record.id}`}>{text}</Link>
      ),
    },
    {
      title: 'Description',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
    },
    {
      title: 'Poste de management',
      dataIndex: 'is_management',
      key: 'is_management',
      render: (is_management) => (
        <Tag color={is_management ? 'purple' : 'default'}>
          {is_management ? 'Oui' : 'Non'}
        </Tag>
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

  if (!department) {
    return <div>Département non trouvé</div>;
  }

  return (
    <div className="department-detail">
      <Space style={{ marginBottom: 16 }}>
        <Button icon={<ArrowLeftOutlined />}>
          <Link to="/hr/departments">Retour à la liste</Link>
        </Button>
        {!editing && (
          <>
            <Button type="primary" icon={<EditOutlined />} onClick={() => setEditing(true)}>
              Modifier
            </Button>
            <Popconfirm
              title="Êtes-vous sûr de vouloir supprimer ce département ?"
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
            <Title level={3}>Modifier le département</Title>
            <Form
              form={form}
              layout="vertical"
              onFinish={handleEditSave}
            >
              <Form.Item
                name="name"
                label="Nom"
                rules={[{ required: true, message: 'Veuillez saisir le nom du département' }]}
              >
                <Input />
              </Form.Item>

              <Form.Item
                name="code"
                label="Code"
              >
                <Input />
              </Form.Item>

              <Form.Item
                name="parent"
                label="Département parent"
              >
                <Select allowClear>
                  {departments
                    .filter(dept => dept.id !== parseInt(id)) // Exclure le département actuel
                    .map(dept => (
                      <Option key={dept.id} value={dept.id}>{dept.name}</Option>
                    ))
                  }
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
            <Title level={3}>{department.name}</Title>
            {department.code && <Tag color="blue" style={{ marginBottom: 16 }}>{department.code}</Tag>}

            <Descriptions bordered column={{ xxl: 3, xl: 3, lg: 3, md: 2, sm: 1, xs: 1 }}>
              {department.parent_name && (
                <Descriptions.Item label="Département parent">
                  {department.parent_name}
                </Descriptions.Item>
              )}
              <Descriptions.Item label="Nombre d'employés">
                <Tag color="blue">{department.employee_count}</Tag>
              </Descriptions.Item>
              {department.description && (
                <Descriptions.Item label="Description" span={3}>
                  {department.description}
                </Descriptions.Item>
              )}
            </Descriptions>

            <Divider />

            <Tabs defaultActiveKey="employees">
              <TabPane tab={<span><TeamOutlined /> Employés</span>} key="employees">
                <Table
                  columns={employeesColumns}
                  dataSource={employees}
                  rowKey="id"
                  pagination={{ pageSize: 10 }}
                />
                <div style={{ marginTop: 16, textAlign: 'right' }}>
                  <Button type="primary">
                    <Link to={`/hr/employees/new?department=${id}`}>Nouvel employé</Link>
                  </Button>
                </div>
              </TabPane>

              <TabPane tab={<span><UserOutlined /> Postes</span>} key="job-titles">
                <Table
                  columns={jobTitlesColumns}
                  dataSource={jobTitles}
                  rowKey="id"
                  pagination={{ pageSize: 10 }}
                />
                <div style={{ marginTop: 16, textAlign: 'right' }}>
                  <Button type="primary">
                    <Link to={`/hr/job-titles/new?department=${id}`}>Nouveau poste</Link>
                  </Button>
                </div>
              </TabPane>

              {childDepartmentsTree.length > 0 && (
                <TabPane tab={<span><BranchesOutlined /> Sous-départements</span>} key="sub-departments">
                  <Tree
                    showLine
                    defaultExpandAll
                    treeData={childDepartmentsTree}
                  />
                  <div style={{ marginTop: 16, textAlign: 'right' }}>
                    <Button type="primary">
                      <Link to={`/hr/departments/new?parent=${id}`}>Nouveau sous-département</Link>
                    </Button>
                  </div>
                </TabPane>
              )}
            </Tabs>
          </>
        )}
      </Card>
    </div>
  );
};

export default DepartmentDetail
