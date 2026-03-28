// src/components/users/RolePermissionMatrix.js
import React, { useState, useEffect, useCallback } from 'react';
import {
  Table, Tag, Card, Spin, Button, Typography, Tooltip, Space,
  Select, message, Modal, Form, Input
} from 'antd';
import {
  ArrowLeftOutlined, LockOutlined, InfoCircleOutlined,
  PlusOutlined, DeleteOutlined, EditOutlined
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import axios from '../../utils/axiosConfig';
import { handleApiError } from '../../utils/apiUtils';

const { Title, Text } = Typography;
const { TextArea } = Input;

// Niveaux d'accès ordonnés
const ACCESS_LEVELS = {
  no_access: { label: 'Aucun', color: '#d9d9d9', textColor: '#8c8c8c', score: 0 },
  read:      { label: 'Lecture', color: '#e6f7ff', textColor: '#1890ff', score: 1 },
  create:    { label: 'Création', color: '#f6ffed', textColor: '#52c41a', score: 2 },
  update:    { label: 'Modification', color: '#fff7e6', textColor: '#fa8c16', score: 3 },
  delete:    { label: 'Suppression', color: '#fff1f0', textColor: '#f5222d', score: 4 },
  admin:     { label: 'Admin', color: '#f9f0ff', textColor: '#722ed1', score: 5 },
};

// Modules avec labels lisibles
const MODULE_LABELS = {
  core: 'Core',
  crm: 'CRM',
  sales: 'Ventes',
  hr: 'Ressources Humaines',
  employee: 'Espace Employé',
  payroll: 'Paie',
  accounting: 'Comptabilité',
  inventory: 'Stocks',
  purchasing: 'Achats',
  recruitment: 'Recrutement',
  dashboard: 'Tableau de bord',
  notifications: 'Notifications',
};

// Ordre d'affichage des modules
const MODULE_ORDER = [
  'core', 'dashboard', 'crm', 'sales', 'accounting',
  'hr', 'employee', 'payroll', 'recruitment', 'inventory',
  'purchasing', 'notifications',
];

// Noms des 7 rôles par défaut (non modifiables, non supprimables)
const DEFAULT_ROLE_NAMES = [
  'Administrateur', 'Directeur', 'Employé',
  'Finance', 'Logistique', 'Ressources Humaines', 'Ventes',
];

const isDefaultRole = (role) => DEFAULT_ROLE_NAMES.includes(role.name);

const RolePermissionMatrix = () => {
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [roleToDelete, setRoleToDelete] = useState(null);
  const [deleteUserCount, setDeleteUserCount] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [createForm] = Form.useForm();
  const navigate = useNavigate();

  const fetchRoles = useCallback(async () => {
    try {
      const res = await axios.get('/api/users/roles/?page_size=50');
      const data = res.data.results || res.data || [];
      setRoles(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Erreur chargement rôles:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRoles();
  }, [fetchRoles]);

  // Construire la map permission pour un rôle : { module: access_level }
  const getPermMap = (role) => {
    const map = {};
    (role.module_permissions || []).forEach((p) => {
      map[p.module] = p.access_level;
    });
    return map;
  };

  // ── Modification des permissions (rôles personnalisés) ──────────

  const handlePermissionChange = async (roleId, module, newLevel) => {
    try {
      const role = roles.find(r => r.id === roleId);
      if (!role) return;
      const permMap = getPermMap(role);
      permMap[module] = newLevel;

      const permissions = MODULE_ORDER.map(mod => ({
        module: mod,
        access_level: permMap[mod] || 'no_access',
      }));

      await axios.post(`/api/users/roles/${roleId}/set_module_permissions/`, {
        permissions,
      });
      message.success('Permissions mises à jour');
      fetchRoles();
    } catch (error) {
      handleApiError(error, null, 'Erreur lors de la mise à jour des permissions');
    }
  };

  // ── Création de rôle ──────────────────────────────────────────

  const handleCreateRole = async () => {
    try {
      const values = await createForm.validateFields();
      setSubmitting(true);
      await axios.post('/api/users/roles/', {
        name: values.name.trim(),
        description: values.description || '',
      });
      message.success(`Rôle « ${values.name} » créé. Configurez ses permissions dans la matrice.`);
      setCreateModalOpen(false);
      createForm.resetFields();
      fetchRoles();
    } catch (error) {
      handleApiError(error, createForm, 'Erreur lors de la création du rôle');
    } finally {
      setSubmitting(false);
    }
  };

  // ── Suppression de rôle ───────────────────────────────────────

  const openDeleteModal = async (role) => {
    setRoleToDelete(role);
    try {
      const res = await axios.get(`/api/users/roles/${role.id}/users/`);
      const users = res.data.results || res.data || [];
      setDeleteUserCount(Array.isArray(users) ? users.length : 0);
    } catch {
      setDeleteUserCount(0);
    }
    setDeleteModalOpen(true);
  };

  const handleDeleteRole = async () => {
    if (!roleToDelete) return;
    setSubmitting(true);
    try {
      await axios.delete(`/api/users/roles/${roleToDelete.id}/`);
      message.success(`Rôle « ${roleToDelete.name} » supprimé`);
      setDeleteModalOpen(false);
      setRoleToDelete(null);
      fetchRoles();
    } catch (error) {
      handleApiError(error, null, 'Erreur lors de la suppression');
    } finally {
      setSubmitting(false);
    }
  };

  // ── Rendu des cellules ────────────────────────────────────────

  const renderPermTag = (level) => {
    const info = ACCESS_LEVELS[level] || ACCESS_LEVELS.no_access;
    return (
      <Tag
        style={{
          backgroundColor: info.color,
          color: info.textColor,
          border: `1px solid ${info.textColor}33`,
          fontWeight: 500,
          fontSize: 12,
          minWidth: 90,
          textAlign: 'center',
        }}
      >
        {info.label}
      </Tag>
    );
  };

  const selectOptions = Object.entries(ACCESS_LEVELS).map(([key, val]) => ({
    value: key,
    label: `${val.score} — ${val.label}`,
  }));

  // Colonnes : Module + une colonne par rôle
  const columns = [
    {
      title: 'Module',
      dataIndex: 'module',
      key: 'module',
      fixed: 'left',
      width: 180,
      render: (mod) => (
        <Text strong style={{ fontSize: 13 }}>
          {MODULE_LABELS[mod] || mod}
        </Text>
      ),
    },
    ...roles.map((role) => ({
      title: (
        <Space direction="vertical" size={0} style={{ textAlign: 'center' }}>
          <Space size={4}>
            <span style={{ fontSize: 13, fontWeight: 600 }}>
              {role.name}
            </span>
            {isDefaultRole(role) ? (
              <Tooltip title="Rôle par défaut — non modifiable">
                <LockOutlined style={{ color: '#94A3B8', fontSize: 11 }} />
              </Tooltip>
            ) : (
              <Tooltip title="Supprimer ce rôle">
                <DeleteOutlined
                  style={{ color: '#EF4444', fontSize: 11, cursor: 'pointer' }}
                  onClick={(e) => {
                    e.stopPropagation();
                    openDeleteModal(role);
                  }}
                />
              </Tooltip>
            )}
          </Space>
          {!isDefaultRole(role) && (
            <Text type="secondary" style={{ fontSize: 10 }}>
              <EditOutlined style={{ marginRight: 2 }} />personnalisé
            </Text>
          )}
        </Space>
      ),
      key: `role_${role.id}`,
      align: 'center',
      width: 140,
      render: (_, record) => {
        const permMap = getPermMap(role);
        const level = permMap[record.module] || 'no_access';

        if (isDefaultRole(role)) {
          return (
            <Tooltip title="Rôle par défaut — non modifiable">
              {renderPermTag(level)}
            </Tooltip>
          );
        }

        // Rôle personnalisé — Select éditable
        return (
          <Select
            size="small"
            value={level}
            onChange={(newLevel) => handlePermissionChange(role.id, record.module, newLevel)}
            style={{ minWidth: 120 }}
            options={selectOptions}
            popupMatchSelectWidth={false}
          />
        );
      },
    })),
  ];

  // Données : une ligne par module
  const dataSource = MODULE_ORDER
    .filter((mod) => MODULE_LABELS[mod])
    .map((mod) => ({
      key: mod,
      module: mod,
    }));

  return (
    <div style={{ padding: '24px', maxWidth: 1400, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 24, gap: 16 }}>
        <Button
          icon={<ArrowLeftOutlined />}
          onClick={() => navigate('/users')}
        >
          Retour
        </Button>
        <div style={{ flex: 1 }}>
          <Title level={3} style={{ margin: 0 }}>
            <LockOutlined style={{ marginRight: 8 }} />
            Matrice des rôles et permissions
          </Title>
        </div>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => setCreateModalOpen(true)}
        >
          Nouveau rôle
        </Button>
      </div>

      {/* Légende */}
      <Card size="small" style={{ marginBottom: 16 }}>
        <Space wrap size="middle">
          <Text type="secondary">
            <InfoCircleOutlined style={{ marginRight: 4 }} />
            Niveaux d'accès :
          </Text>
          {Object.entries(ACCESS_LEVELS).map(([key, info]) => (
            <Tag
              key={key}
              style={{
                backgroundColor: info.color,
                color: info.textColor,
                border: `1px solid ${info.textColor}33`,
                fontWeight: 500,
              }}
            >
              {info.score} — {info.label}
            </Tag>
          ))}
        </Space>
        <div style={{ marginTop: 8 }}>
          <Text type="secondary" style={{ fontSize: 12 }}>
            La hiérarchie est cumulative : un niveau supérieur inclut les permissions des niveaux inférieurs.
            Par exemple, « Création » implique aussi « Lecture ».
            Les rôles par défaut (<LockOutlined style={{ fontSize: 10 }} />) ne sont pas modifiables.
            Cliquez sur les badges des rôles personnalisés pour les modifier.
          </Text>
        </div>
      </Card>

      <Card bodyStyle={{ padding: 0 }}>
        <Table
          columns={columns}
          dataSource={dataSource}
          loading={loading}
          pagination={false}
          bordered
          size="middle"
          scroll={{ x: 'max-content' }}
          rowClassName={(_, index) => (index % 2 === 0 ? '' : 'ant-table-row-light')}
        />
      </Card>

      {/* Modale création de rôle */}
      <Modal
        title="Nouveau rôle"
        open={createModalOpen}
        onCancel={() => {
          setCreateModalOpen(false);
          createForm.resetFields();
        }}
        onOk={handleCreateRole}
        confirmLoading={submitting}
        okText="Créer"
        cancelText="Annuler"
      >
        <Form form={createForm} layout="vertical">
          <Form.Item
            name="name"
            label="Nom du rôle"
            rules={[
              { required: true, message: 'Veuillez saisir le nom du rôle' },
              { max: 100, message: 'Maximum 100 caractères' },
            ]}
          >
            <Input placeholder="Ex : Comptable externe" />
          </Form.Item>
          <Form.Item
            name="description"
            label="Description"
          >
            <TextArea
              rows={3}
              placeholder="Description optionnelle du rôle et de ses responsabilités"
            />
          </Form.Item>
        </Form>
      </Modal>

      {/* Modale confirmation suppression */}
      <Modal
        title={`Supprimer le rôle « ${roleToDelete?.name || ''} » ?`}
        open={deleteModalOpen}
        onCancel={() => {
          setDeleteModalOpen(false);
          setRoleToDelete(null);
        }}
        onOk={handleDeleteRole}
        confirmLoading={submitting}
        okText="Supprimer"
        okButtonProps={{ danger: true }}
        cancelText="Annuler"
      >
        <p>Cette action est irréversible.</p>
        {deleteUserCount > 0 ? (
          <p style={{ color: '#EF4444', fontWeight: 500 }}>
            Ce rôle est attribué à {deleteUserCount} utilisateur{deleteUserCount > 1 ? 's' : ''}.
            {deleteUserCount > 1 ? ' Ils perdront' : ' Il perdra'} les permissions correspondantes.
          </p>
        ) : (
          <p>Aucun utilisateur n'est actuellement associé à ce rôle.</p>
        )}
      </Modal>
    </div>
  );
};

export default RolePermissionMatrix;
