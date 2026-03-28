// src/components/notifications/NotificationCenter.js
import React, { useState, useEffect } from 'react';
import {
  Layout, Table, Tag, Button, Space, Typography, Select, Card,
  message, Badge, Empty, Row, Col, Statistic,
} from 'antd';
import {
  CheckOutlined, HomeOutlined, SettingOutlined,
  BellOutlined, EyeOutlined,
} from '@ant-design/icons';
import { Link, useNavigate } from 'react-router-dom';
import { handleApiError } from '../../utils/apiUtils';
import axios from '../../utils/axiosConfig';
import UserMenu from '../common/UserMenu';
import GlobalSearch from '../common/GlobalSearch';
import { useCompany } from '../../context/CompanyContext';

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
  const [stats, setStats] = useState({ total: 0, unread: 0 });
  const navigate = useNavigate();
  const { companyInfo } = useCompany();
  const companyName = companyInfo?.company_name || 'Cleo ERP';

  const fetchNotifications = async (page = 1) => {
    setLoading(true);
    try {
      const params = { page, page_size: pagination.pageSize, ...filters };
      Object.keys(params).forEach((k) => params[k] === undefined && delete params[k]);
      const res = await axios.get('/api/notifications/notifications/', { params });
      const results = res.data.results || res.data;
      setNotifications(results);
      const total = res.data.count || results.length;
      setPagination((prev) => ({ ...prev, current: page, total }));

      // Stats
      const unreadRes = await axios.get('/api/notifications/notifications/unread_count/');
      setStats({ total, unread: unreadRes.data.unread_count || 0 });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchNotifications(); }, [filters]);

  const markRead = async (id) => {
    try {
      await axios.post(`/api/notifications/notifications/${id}/mark_read/`);
      fetchNotifications(pagination.current);
    } catch (err) {
      handleApiError(err, null, 'Erreur lors du marquage.');
    }
  };

  const markAllRead = async () => {
    try {
      const res = await axios.post('/api/notifications/notifications/mark_all_read/');
      message.success(`${res.data.marked} notification(s) marquée(s) comme lue(s)`);
      fetchNotifications(pagination.current);
    } catch (err) {
      handleApiError(err, null, 'Erreur lors du marquage.');
    }
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
      width: 110,
      render: (m) => <Tag>{MODULE_LABELS[m] || m}</Tag>,
    },
    {
      title: 'Notification',
      dataIndex: 'title',
      render: (title, record) => (
        <div
          style={{ cursor: record.link ? 'pointer' : 'default' }}
          onClick={() => record.link && navigate(record.link)}
        >
          <span style={{ fontWeight: record.is_read ? 'normal' : 600, color: '#0F172A' }}>
            {title}
          </span>
          <br />
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            {record.message.length > 140 ? record.message.substring(0, 140) + '...' : record.message}
          </Typography.Text>
        </div>
      ),
    },
    {
      title: 'Date',
      dataIndex: 'created_at',
      width: 160,
      render: (d) => {
        const date = new Date(d);
        return (
          <span style={{ color: '#64748B', fontSize: 13 }}>
            {date.toLocaleDateString('fr-FR')}
            <br />
            <span style={{ fontSize: 11 }}>{date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</span>
          </span>
        );
      },
    },
    {
      title: 'Statut',
      dataIndex: 'is_read',
      width: 90,
      align: 'center',
      render: (read) => read
        ? <Tag style={{ borderRadius: 6 }}>Lu</Tag>
        : <Badge status="processing" text={<span style={{ fontSize: 12 }}>Nouveau</span>} />,
    },
    {
      title: 'Actions',
      width: 120,
      align: 'center',
      render: (_, record) => (
        <Space>
          {!record.is_read && (
            <Button
              type="text"
              size="small"
              icon={<CheckOutlined style={{ color: '#10B981' }} />}
              onClick={() => markRead(record.id)}
              title="Marquer comme lu"
            />
          )}
          {record.link && (
            <Button
              type="text"
              size="small"
              icon={<EyeOutlined style={{ color: '#64748B' }} />}
              onClick={() => navigate(record.link)}
              title="Voir"
            />
          )}
        </Space>
      ),
    },
  ];

  return (
    <Layout style={{ minHeight: '100vh', background: '#F8FAFC' }}>
      <Header
        style={{
          background: '#FFFFFF',
          padding: '0 24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderBottom: '1px solid #E5E7EB',
          boxShadow: '0 1px 3px rgba(15,23,42,0.06)',
          height: 64,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <Link to="/" style={{ color: '#64748B', fontSize: 14 }}>
            <HomeOutlined /> Accueil
          </Link>
          <span style={{ color: '#E5E7EB' }}>|</span>
          <Title level={4} style={{ margin: 0, color: '#0F172A' }}>
            <BellOutlined style={{ marginRight: 8, color: '#10B981' }} />
            Centre de Notifications
          </Title>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <GlobalSearch />
          <UserMenu />
        </div>
      </Header>

      <Content style={{ padding: 24 }}>
        {/* KPI */}
        <Row gutter={16} style={{ marginBottom: 24 }}>
          <Col xs={12} sm={8}>
            <Card style={{ borderRadius: 12, border: '1px solid #E5E7EB' }}>
              <Statistic
                title={<span style={{ color: '#64748B', fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.3 }}>Total</span>}
                value={stats.total}
                prefix={<BellOutlined style={{ color: '#64748B' }} />}
                valueStyle={{ color: '#0F172A' }}
              />
            </Card>
          </Col>
          <Col xs={12} sm={8}>
            <Card style={{ borderRadius: 12, border: '1px solid #E5E7EB' }}>
              <Statistic
                title={<span style={{ color: '#64748B', fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.3 }}>Non lues</span>}
                value={stats.unread}
                prefix={<Badge status="processing" />}
                valueStyle={{ color: stats.unread > 0 ? '#F97316' : '#10B981' }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={8}>
            <Card style={{ borderRadius: 12, border: '1px solid #E5E7EB' }}>
              <Statistic
                title={<span style={{ color: '#64748B', fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.3 }}>Lues</span>}
                value={stats.total - stats.unread}
                prefix={<CheckOutlined style={{ color: '#10B981' }} />}
                valueStyle={{ color: '#10B981' }}
              />
            </Card>
          </Col>
        </Row>

        {/* Filtres + Actions */}
        <Card style={{ borderRadius: 12, border: '1px solid #E5E7EB' }}>
          <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
            <Space wrap>
              <Select
                allowClear
                placeholder="Niveau"
                style={{ width: 150 }}
                value={filters.level}
                onChange={(v) => setFilters({ ...filters, level: v })}
              >
                {Object.entries(LEVEL_LABELS).map(([k, v]) => (
                  <Select.Option key={k} value={k}>{v}</Select.Option>
                ))}
              </Select>
              <Select
                allowClear
                placeholder="Module"
                style={{ width: 150 }}
                value={filters.module}
                onChange={(v) => setFilters({ ...filters, module: v })}
              >
                {Object.entries(MODULE_LABELS).map(([k, v]) => (
                  <Select.Option key={k} value={k}>{v}</Select.Option>
                ))}
              </Select>
              <Select
                allowClear
                placeholder="Statut"
                style={{ width: 150 }}
                value={filters.is_read}
                onChange={(v) => setFilters({ ...filters, is_read: v })}
              >
                <Select.Option value="false">Non lu</Select.Option>
                <Select.Option value="true">Lu</Select.Option>
              </Select>
            </Space>
            <Space>
              <Button
                icon={<SettingOutlined />}
                onClick={() => navigate('/notifications/preferences')}
              >
                Préférences
              </Button>
              {stats.unread > 0 && (
                <Button
                  type="primary"
                  icon={<CheckOutlined />}
                  onClick={markAllRead}
                >
                  Tout marquer lu ({stats.unread})
                </Button>
              )}
            </Space>
          </div>

          <Table
            columns={columns}
            dataSource={notifications}
            rowKey="id"
            loading={loading}
            size="middle"
            pagination={{
              ...pagination,
              showSizeChanger: false,
              showTotal: (total) => `${total} notification(s)`,
              onChange: (page) => fetchNotifications(page),
            }}
            locale={{
              emptyText: (
                <Empty
                  description="Aucune notification"
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                />
              ),
            }}
            rowClassName={(record) => record.is_read ? '' : 'ant-table-row-selected'}
          />
        </Card>
      </Content>
    </Layout>
  );
};

export default NotificationCenter;
