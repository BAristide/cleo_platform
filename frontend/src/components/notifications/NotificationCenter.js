import React, { useState, useEffect } from 'react';
import { Layout, Table, Tag, Button, Space, Typography, Select, Card, message } from 'antd';
import { CheckOutlined, DeleteOutlined, HomeOutlined, BellOutlined, SettingOutlined } from '@ant-design/icons';
import { Link, useNavigate } from 'react-router-dom';
import axios from '../../utils/axiosConfig';
import UserMenu from '../common/UserMenu';
import NotificationBell from './NotificationBell';

const { Header, Content } = Layout;
const { Title } = Typography;

const LEVEL_COLORS = { info: 'blue', warning: 'orange', critical: 'red', success: 'green' };
const LEVEL_LABELS = { info: 'Info', warning: 'Attention', critical: 'Critique', success: 'Succès' };
const MODULE_LABELS = {
  sales: 'Ventes', purchasing: 'Achats', inventory: 'Stocks', hr: 'RH',
  payroll: 'Paie', accounting: 'Compta', crm: 'CRM', recruitment: 'Recrutement', system: 'Système',
};

const NotificationCenter = () => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({ current: 1, pageSize: 20, total: 0 });
  const [filters, setFilters] = useState({ level: undefined, module: undefined, is_read: undefined });
  const navigate = useNavigate();

  const fetchNotifications = async (page = 1) => {
    setLoading(true);
    try {
      const params = { page, page_size: pagination.pageSize, ...filters };
      Object.keys(params).forEach((k) => params[k] === undefined && delete params[k]);
      const res = await axios.get('/api/notifications/notifications/', { params });
      setNotifications(res.data.results || res.data);
      setPagination((prev) => ({ ...prev, current: page, total: res.data.count || 0 }));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchNotifications(); }, [filters]);

  const markRead = async (id) => {
    await axios.post(`/api/notifications/notifications/${id}/mark_read/`);
    fetchNotifications(pagination.current);
  };

  const markAllRead = async () => {
    const res = await axios.post('/api/notifications/notifications/mark_all_read/');
    message.success(`${res.data.marked} notification(s) marquée(s) comme lue(s)`);
    fetchNotifications(pagination.current);
  };

  const columns = [
    {
      title: 'Niveau',
      dataIndex: 'level',
      width: 100,
      render: (level) => <Tag color={LEVEL_COLORS[level]}>{LEVEL_LABELS[level]}</Tag>,
    },
    {
      title: 'Module',
      dataIndex: 'module',
      width: 100,
      render: (m) => <Tag>{MODULE_LABELS[m] || m}</Tag>,
    },
    {
      title: 'Titre',
      dataIndex: 'title',
      render: (title, record) => (
        <div>
          <span style={{ fontWeight: record.is_read ? 'normal' : 'bold' }}>{title}</span>
          <br />
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            {record.message.length > 120 ? record.message.substring(0, 120) + '...' : record.message}
          </Typography.Text>
        </div>
      ),
    },
    {
      title: 'Date',
      dataIndex: 'created_at',
      width: 160,
      render: (d) => new Date(d).toLocaleString('fr-FR'),
    },
    {
      title: 'Statut',
      dataIndex: 'is_read',
      width: 80,
      render: (read) => read ? <Tag>Lu</Tag> : <Tag color="green">Nouveau</Tag>,
    },
    {
      title: 'Actions',
      width: 100,
      render: (_, record) => (
        <Space>
          {!record.is_read && (
            <Button type="text" size="small" icon={<CheckOutlined />} onClick={() => markRead(record.id)} title="Marquer lu" />
          )}
          {record.link && (
            <Button type="text" size="small" onClick={() => navigate(record.link)} title="Voir">
              <Link to={record.link}>Voir</Link>
            </Button>
          )}
        </Space>
      ),
    },
  ];

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header style={{ background: '#fff', padding: '0 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f0f0f0' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <Link to="/" style={{ color: '#1890ff' }}><HomeOutlined /> Accueil</Link>
          <Title level={4} style={{ margin: 0 }}>Centre de Notifications</Title>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <NotificationBell />
          <UserMenu />
        </div>
      </Header>
      <Content style={{ padding: 24 }}>
        <Card>
          <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
            <Space wrap>
              <Select allowClear placeholder="Niveau" style={{ width: 140 }} value={filters.level} onChange={(v) => setFilters({ ...filters, level: v })}>
                {Object.entries(LEVEL_LABELS).map(([k, v]) => <Select.Option key={k} value={k}>{v}</Select.Option>)}
              </Select>
              <Select allowClear placeholder="Module" style={{ width: 140 }} value={filters.module} onChange={(v) => setFilters({ ...filters, module: v })}>
                {Object.entries(MODULE_LABELS).map(([k, v]) => <Select.Option key={k} value={k}>{v}</Select.Option>)}
              </Select>
              <Select allowClear placeholder="Statut" style={{ width: 140 }} value={filters.is_read} onChange={(v) => setFilters({ ...filters, is_read: v })}>
                <Select.Option value="false">Non lu</Select.Option>
                <Select.Option value="true">Lu</Select.Option>
              </Select>
            </Space>
            <Space>
              <Button icon={<SettingOutlined />} onClick={() => navigate('/notifications/preferences')}>Preferences</Button>
              <Button icon={<CheckOutlined />} onClick={markAllRead}>Tout marquer lu</Button>
            </Space>
          </div>
          <Table
            columns={columns}
            dataSource={notifications}
            rowKey="id"
            loading={loading}
            pagination={{
              ...pagination,
              showSizeChanger: false,
              showTotal: (total) => `${total} notification(s)`,
              onChange: (page) => fetchNotifications(page),
            }}
            rowClassName={(record) => record.is_read ? '' : 'ant-table-row-selected'}
          />
        </Card>
      </Content>
    </Layout>
  );
};

export default NotificationCenter;
