// src/components/users/RolePermissionMatrix.js
import React, { useState, useEffect } from 'react';
import { Table, Tag, Card, Spin, Button, Typography, Tooltip, Space } from 'antd';
import { ArrowLeftOutlined, LockOutlined, InfoCircleOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import axios from '../../utils/axiosConfig';

const { Title, Text } = Typography;

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
  payroll: 'Paie',
  accounting: 'Comptabilité',
  inventory: 'Stocks',
  purchasing: 'Achats',
  recruitment: 'Recrutement',
  dashboard: 'Tableau de bord',
};

// Ordre d'affichage des modules
const MODULE_ORDER = [
  'core', 'dashboard', 'crm', 'sales', 'accounting',
  'hr', 'payroll', 'recruitment', 'inventory', 'purchasing',
];

const RolePermissionMatrix = () => {
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchRoles();
  }, []);

  const fetchRoles = async () => {
    try {
      const res = await axios.get('/api/users/roles/?page_size=50');
      const data = res.data.results || res.data || [];
      setRoles(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Erreur chargement rôles:', error);
    } finally {
      setLoading(false);
    }
  };

  // Construire la map permission pour un rôle : { module: access_level }
  const getPermMap = (role) => {
    const map = {};
    (role.module_permissions || []).forEach((p) => {
      map[p.module] = p.access_level;
    });
    return map;
  };

  // Rendu d'une cellule de permission
  const renderPermCell = (level) => {
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
        <Tooltip title={role.description || role.name}>
          <span style={{ fontSize: 13, fontWeight: 600 }}>
            {role.name}
          </span>
        </Tooltip>
      ),
      key: `role_${role.id}`,
      align: 'center',
      width: 130,
      render: (_, record) => {
        const permMap = getPermMap(role);
        const level = permMap[record.module] || 'no_access';
        return renderPermCell(level);
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
    </div>
  );
};

export default RolePermissionMatrix;
