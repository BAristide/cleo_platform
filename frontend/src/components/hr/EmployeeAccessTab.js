// src/components/hr/EmployeeAccessTab.js
import React, { useState, useEffect, useMemo } from 'react';
import {
  Select, Table, Tag, Spin, Button, Typography, Space,
  message, Alert
} from 'antd';
import { InfoCircleOutlined, SaveOutlined } from '@ant-design/icons';
import { Link } from 'react-router-dom';
import axios from '../../utils/axiosConfig';

const { Title, Text } = Typography;

// Niveaux d'accès — réplique de RolePermissionMatrix.js
const ACCESS_LEVELS = {
  no_access: { label: 'Aucun', color: '#d9d9d9', textColor: '#8c8c8c', score: 0 },
  read:      { label: 'Lecture', color: '#e6f7ff', textColor: '#1890ff', score: 1 },
  create:    { label: 'Création', color: '#f6ffed', textColor: '#52c41a', score: 2 },
  update:    { label: 'Modification', color: '#fff7e6', textColor: '#fa8c16', score: 3 },
  delete:    { label: 'Suppression', color: '#fff1f0', textColor: '#f5222d', score: 4 },
  admin:     { label: 'Admin', color: '#f9f0ff', textColor: '#722ed1', score: 5 },
};

// Labels modules — réplique de RolePermissionMatrix.js
const MODULE_LABELS = {
  core: 'Core',
  dashboard: 'Tableau de bord',
  crm: 'CRM',
  sales: 'Ventes',
  accounting: 'Comptabilité',
  hr: 'Ressources Humaines',
  employee: 'Espace Employé',
  payroll: 'Paie',
  recruitment: 'Recrutement',
  inventory: 'Stocks',
  purchasing: 'Achats',
  notifications: 'Notifications',
};

const MODULE_ORDER = [
  'core', 'dashboard', 'crm', 'sales', 'accounting',
  'hr', 'employee', 'payroll', 'recruitment', 'inventory',
  'purchasing', 'notifications',
];

const EmployeeAccessTab = ({ employeeId, userId }) => {
  const [userData, setUserData] = useState(null);
  const [allRoles, setAllRoles] = useState([]);
  const [selectedGroups, setSelectedGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }
    const fetchData = async () => {
      setLoading(true);
      try {
        const [userRes, rolesRes] = await Promise.all([
          axios.get(`/api/users/users/${userId}/`),
          axios.get('/api/users/roles/?page_size=50'),
        ]);
        setUserData(userRes.data);
        setSelectedGroups(userRes.data.groups || []);

        const rolesData = rolesRes.data.results || rolesRes.data || [];
        setAllRoles(Array.isArray(rolesData) ? rolesData : []);
      } catch (error) {
        console.error('Erreur chargement accès:', error);
        message.error("Impossible de charger les accès de l'employé");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [userId]);

  // Calculer les permissions effectives à partir des rôles sélectionnés
  const effectivePermissions = useMemo(() => {
    const permMap = {};
    MODULE_ORDER.forEach(mod => { permMap[mod] = 'no_access'; });

    selectedGroups.forEach(groupName => {
      const role = allRoles.find(r => r.name === groupName);
      if (!role) return;
      (role.module_permissions || []).forEach(p => {
        const currentScore = ACCESS_LEVELS[permMap[p.module]]?.score || 0;
        const newScore = ACCESS_LEVELS[p.access_level]?.score || 0;
        if (newScore > currentScore) {
          permMap[p.module] = p.access_level;
        }
      });
    });

    return MODULE_ORDER
      .filter(mod => MODULE_LABELS[mod])
      .map(mod => ({
        key: mod,
        module: mod,
        moduleLabel: MODULE_LABELS[mod],
        accessLevel: permMap[mod] || 'no_access',
      }))
      .filter(row => row.accessLevel !== 'no_access');
  }, [selectedGroups, allRoles]);

  const handleGroupsChange = (value) => {
    setSelectedGroups(value);
    setDirty(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await axios.patch(`/api/users/users/${userId}/`, {
        groups: selectedGroups,
      });
      message.success('Accès modules mis à jour avec succès');
      setDirty(false);
    } catch (error) {
      console.error('Erreur sauvegarde accès:', error);
      message.error('Impossible de mettre à jour les accès');
    } finally {
      setSaving(false);
    }
  };

  if (!userId) {
    return (
      <Alert
        type="warning"
        showIcon
        message="Aucun compte utilisateur lié"
        description={
          "Cet employé n'est pas encore lié à un compte utilisateur. " +
          "Les accès modules sont gérés via le compte utilisateur. " +
          "Créez d'abord un utilisateur depuis la page Gestion des utilisateurs."
        }
      />
    );
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}>
        <Spin size="large" />
      </div>
    );
  }

  const columns = [
    {
      title: 'Module',
      dataIndex: 'moduleLabel',
      key: 'moduleLabel',
      render: (text) => <Text strong>{text}</Text>,
    },
    {
      title: "Niveau d'accès",
      dataIndex: 'accessLevel',
      key: 'accessLevel',
      render: (level) => {
        const info = ACCESS_LEVELS[level] || ACCESS_LEVELS.no_access;
        return (
          <Tag style={{
            backgroundColor: info.color,
            color: info.textColor,
            border: `1px solid ${info.textColor}33`,
            fontWeight: 500,
          }}>
            {info.label}
          </Tag>
        );
      },
    },
  ];

  const availableRoles = allRoles.map(r => r.name);

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <Text type="secondary">Compte utilisateur : </Text>
        <Text strong>{userData?.email}</Text>
      </div>

      <div style={{ marginBottom: 24 }}>
        <Text strong style={{ display: 'block', marginBottom: 8 }}>
          Rôles assignés
        </Text>
        <Space direction="vertical" style={{ width: '100%', maxWidth: 500 }}>
          <Select
            mode="multiple"
            style={{ width: '100%' }}
            placeholder="Sélectionnez les rôles"
            value={selectedGroups}
            onChange={handleGroupsChange}
            options={availableRoles.map(name => ({ label: name, value: name }))}
          />
          {dirty && (
            <Button
              type="primary"
              icon={<SaveOutlined />}
              loading={saving}
              onClick={handleSave}
            >
              Enregistrer les modifications
            </Button>
          )}
        </Space>
      </div>

      <div style={{ marginBottom: 16 }}>
        <Title level={5} style={{ marginBottom: 12 }}>Modules accessibles</Title>
        {effectivePermissions.length > 0 ? (
          <Table
            dataSource={effectivePermissions}
            columns={columns}
            pagination={false}
            size="small"
            bordered
          />
        ) : (
          <Text type="secondary">
            Aucun module accessible avec les rôles sélectionnés.
          </Text>
        )}
      </div>

      <Alert
        type="info"
        showIcon
        icon={<InfoCircleOutlined />}
        message="Les accès sont déterminés par les rôles assignés."
        description={
          <span>
            Consultez la matrice complète des permissions :{' '}
            <Link to="/users/roles">Matrice des rôles →</Link>
          </span>
        }
        style={{ marginTop: 16 }}
      />
    </div>
  );
};

export default EmployeeAccessTab;
