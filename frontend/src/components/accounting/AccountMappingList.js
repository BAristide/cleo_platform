import React, { useEffect, useState } from 'react';
import { Table, Tag, Alert, Button, Typography, Space, Tooltip } from 'antd';
import { CheckCircleOutlined, WarningOutlined, ReloadOutlined } from '@ant-design/icons';
import axios from '../../utils/axiosConfig';

const { Title, Text } = Typography;

const ROLE_GROUPS = {
  'Ventes': ['client_receivable', 'sales_revenue', 'vat_collected'],
  'Achats': ['supplier_payable', 'purchase_expense', 'vat_deductible'],
  'Trésorerie': ['bank', 'cash'],
  'Paie': ['salary_expense', 'social_charges_expense', 'salary_payable', 'social_charges_payable'],
  'Stocks': ['inventory_asset', 'inventory_variation', 'goods_received_not_invoiced'],
  'Immobilisations': ['fixed_asset', 'depreciation_expense', 'accumulated_depreciation'],
};

const AccountMappingList = () => {
  const [mappings, setMappings] = useState([]);
  const [validation, setValidation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [mappingsRes, validationRes] = await Promise.all([
        axios.get('/api/accounting/mappings/'),
        axios.get('/api/accounting/mappings/validate/'),
      ]);
      setMappings(mappingsRes.data.results || []);
      setValidation(validationRes.data);
    } catch (err) {
      setError('Impossible de charger les mappings de comptes.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const getGroup = (role) => {
    for (const [group, roles] of Object.entries(ROLE_GROUPS)) {
      if (roles.includes(role)) return group;
    }
    return 'Autre';
  };

  const columns = [
    {
      title: 'Groupe',
      key: 'group',
      width: 130,
      render: (_, record) => {
        const group = getGroup(record.role);
        const colors = {
          'Ventes': 'blue', 'Achats': 'orange', 'Trésorerie': 'cyan',
          'Paie': 'purple', 'Stocks': 'green', 'Immobilisations': 'gold',
        };
        return <Tag color={colors[group] || 'default'}>{group}</Tag>;
      },
      filters: Object.keys(ROLE_GROUPS).map(g => ({ text: g, value: g })),
      onFilter: (value, record) => getGroup(record.role) === value,
    },
    {
      title: 'Rôle fonctionnel',
      dataIndex: 'role_label',
      key: 'role_label',
      sorter: (a, b) => a.role_label.localeCompare(b.role_label),
    },
    {
      title: 'Identifiant rôle',
      dataIndex: 'role',
      key: 'role',
      render: (val) => <Text code style={{ fontSize: 12 }}>{val}</Text>,
    },
    {
      title: 'Compte',
      key: 'account',
      render: (_, record) => (
        <Space>
          <Tag color="geekblue">{record.account_code}</Tag>
          <Text>{record.account_name}</Text>
        </Space>
      ),
    },
    {
      title: 'Description',
      dataIndex: 'description',
      key: 'description',
      render: (val) => <Text type="secondary">{val}</Text>,
    },
  ];

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Title level={4} style={{ margin: 0 }}>Mappings de comptes</Title>
        <Tooltip title="Rafraîchir">
          <Button icon={<ReloadOutlined />} onClick={fetchData} loading={loading} />
        </Tooltip>
      </div>

      {validation && (
        <Alert
          style={{ marginBottom: 16 }}
          type={validation.valid ? 'success' : 'warning'}
          icon={validation.valid ? <CheckCircleOutlined /> : <WarningOutlined />}
          showIcon
          message={
            validation.valid
              ? `${validation.total_configured} rôles configurés — tous les rôles critiques sont présents`
              : `${validation.missing?.length} rôle(s) manquant(s) : ${validation.missing?.join(', ')}`
          }
        />
      )}

      {error && (
        <Alert type="error" message={error} showIcon style={{ marginBottom: 16 }} />
      )}

      <Table
        dataSource={mappings}
        columns={columns}
        rowKey="role"
        loading={loading}
        size="small"
        pagination={false}
        bordered
      />
    </div>
  );
};

export default AccountMappingList;
