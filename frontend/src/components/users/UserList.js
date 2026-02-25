// src/components/users/UserList.js
import React, { useState, useEffect } from 'react';
import { Layout, Table, Card, Button, Input, Tag, Avatar, Space, Typography, message, Modal, Form, Popconfirm } from 'antd';
import {
  PlusOutlined,
  SearchOutlined,
  EditOutlined,
  LockOutlined,
  SafetyCertificateOutlined,
  StopOutlined,
  CheckCircleOutlined,
  ArrowLeftOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import axios from '../../utils/axiosConfig';
import UserMenu from '../common/UserMenu';
import UserForm from './UserForm';

const { Header, Content } = Layout;
const { Title, Text } = Typography;

const stringToColor = (str) => {
  let hash = 0;
  for (let i = 0; i < (str || '').length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const colors = ['#1890ff', '#52c41a', '#faad14', '#f5222d', '#722ed1', '#13c2c2', '#eb2f96', '#fa8c16', '#a0d911', '#2f54eb'];
  return colors[Math.abs(hash) % colors.length];
};

const getInitials = (user) => {
  const name = [user.first_name, user.last_name].filter(Boolean).join(' ');
  if (name.trim()) {
    const parts = name.split(/\s+/);
    return parts.length >= 2
      ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
      : name.substring(0, 2).toUpperCase();
  }
  return (user.email || '?').substring(0, 2).toUpperCase();
};

const UserList = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState('');
  const [formVisible, setFormVisible] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [resetPasswordModal, setResetPasswordModal] = useState({ visible: false, user: null });
  const [resetForm] = Form.useForm();
  const navigate = useNavigate();

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async (search = '') => {
    setLoading(true);
    try {
      const params = search ? { search } : {};
      const res = await axios.get('/api/users/users/', { params });
      setUsers(res.data.results || res.data || []);
    } catch (error) {
      message.error('Impossible de charger la liste des utilisateurs.');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (value) => {
    setSearchText(value);
    fetchUsers(value);
  };

  const handleToggleActive = async (user) => {
    try {
      await axios.patch(`/api/users/users/${user.id}/`, { is_active: !user.is_active });
      message.success(`Utilisateur ${!user.is_active ? 'activé' : 'désactivé'} avec succès.`);
      fetchUsers(searchText);
    } catch (error) {
      message.error("Erreur lors de la modification du statut.");
    }
  };

  const handleResetPassword = async () => {
    try {
      const values = await resetForm.validateFields();
      await axios.post(`/api/users/users/${resetPasswordModal.user.id}/set_password/`, {
        password: values.password,
      });
      message.success('Mot de passe réinitialisé avec succès.');
      setResetPasswordModal({ visible: false, user: null });
      resetForm.resetFields();
    } catch (error) {
      if (error.response?.data) {
        message.error('Erreur lors de la réinitialisation du mot de passe.');
      }
    }
  };

  const handleFormSuccess = () => {
    setFormVisible(false);
    setEditingUser(null);
    fetchUsers(searchText);
  };

  const columns = [
    {
      title: 'Utilisateur',
      key: 'user',
      render: (_, record) => {
        const displayName = [record.first_name, record.last_name].filter(Boolean).join(' ') || record.email;
        return (
          <Space>
            <Avatar style={{ backgroundColor: stringToColor(record.email) }}>
              {getInitials(record)}
            </Avatar>
            <div>
              <Text strong>{displayName}</Text>
              <br />
              <Text type="secondary" style={{ fontSize: 12 }}>{record.email}</Text>
            </div>
          </Space>
        );
      },
    },
    {
      title: 'Rôles',
      dataIndex: 'groups',
      key: 'groups',
      render: (groups) =>
        groups && groups.length > 0
          ? groups.map((g) => <Tag color="purple" key={g}>{g}</Tag>)
          : <Text type="secondary">—</Text>,
    },
    {
      title: 'Statut',
      dataIndex: 'is_active',
      key: 'is_active',
      width: 100,
      render: (active) =>
        active ? <Tag color="green">Actif</Tag> : <Tag color="red">Inactif</Tag>,
    },
    {
      title: 'Employé lié',
      key: 'employee',
      render: (_, record) =>
        record.employee_detail ? (
          <Text>{record.employee_detail.full_name}</Text>
        ) : (
          <Text type="secondary">—</Text>
        ),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 280,
      render: (_, record) => (
        <Space>
          <Button
            size="small"
            icon={<EditOutlined />}
            onClick={() => {
              setEditingUser(record);
              setFormVisible(true);
            }}
          >
            Modifier
          </Button>
          <Button
            size="small"
            icon={<LockOutlined />}
            onClick={() => {
              setResetPasswordModal({ visible: true, user: record });
            }}
          >
            Reset mdp
          </Button>
          <Popconfirm
            title={`${record.is_active ? 'Désactiver' : 'Activer'} cet utilisateur ?`}
            onConfirm={() => handleToggleActive(record)}
            okText="Oui"
            cancelText="Non"
          >
            <Button
              size="small"
              danger={record.is_active}
              icon={record.is_active ? <StopOutlined /> : <CheckCircleOutlined />}
            >
              {record.is_active ? 'Désactiver' : 'Activer'}
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header style={{ background: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/')}>Retour</Button>
          <Title level={3} style={{ margin: 0 }}>Gestion des utilisateurs</Title>
        </div>
        <UserMenu />
      </Header>
      <Content style={{ padding: '24px' }}>
        <Card>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
            <Input.Search
              placeholder="Rechercher par nom, email..."
              allowClear
              onSearch={handleSearch}
              style={{ width: 350 }}
              prefix={<SearchOutlined />}
            />
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => {
                setEditingUser(null);
                setFormVisible(true);
              }}
            >
            <Button
              icon={<SafetyCertificateOutlined />}
              onClick={() => navigate("/users/roles")}
            >
              Matrice des rôles
            </Button>
              Nouvel utilisateur
            </Button>
          </div>
          <Table
            columns={columns}
            dataSource={users}
            rowKey="id"
            loading={loading}
            pagination={{ pageSize: 20 }}
          />
        </Card>

        {/* Modal création/édition */}
        <UserForm
          visible={formVisible}
          user={editingUser}
          onCancel={() => {
            setFormVisible(false);
            setEditingUser(null);
          }}
          onSuccess={handleFormSuccess}
        />

        {/* Modal reset mot de passe */}
        <Modal
          title={`Réinitialiser le mot de passe — ${resetPasswordModal.user?.email || ''}`}
          open={resetPasswordModal.visible}
          onOk={handleResetPassword}
          onCancel={() => {
            setResetPasswordModal({ visible: false, user: null });
            resetForm.resetFields();
          }}
          okText="Réinitialiser"
          cancelText="Annuler"
        >
          <Form form={resetForm} layout="vertical">
            <Form.Item
              name="password"
              label="Nouveau mot de passe"
              rules={[
                { required: true, message: 'Le mot de passe est requis' },
                { min: 8, message: 'Minimum 8 caractères' },
              ]}
            >
              <Input.Password placeholder="Nouveau mot de passe (min. 8 caractères)" />
            </Form.Item>
          </Form>
        </Modal>
      </Content>
    </Layout>
  );
};

export default UserList;
