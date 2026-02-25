import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Badge, Dropdown, List, Typography, Button, Tag, Empty, Spin } from 'antd';
import { BellOutlined, CheckOutlined, EyeOutlined } from '@ant-design/icons';
import axios from '../../utils/axiosConfig';

const { Text } = Typography;

const LEVEL_COLORS = {
  info: 'blue',
  warning: 'orange',
  critical: 'red',
  success: 'green',
};

const MODULE_LABELS = {
  sales: 'Ventes',
  purchasing: 'Achats',
  inventory: 'Stocks',
  hr: 'RH',
  payroll: 'Paie',
  accounting: 'Compta',
  crm: 'CRM',
  recruitment: 'Recrutement',
  system: 'Système',
};

const NotificationBell = () => {
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  const fetchUnreadCount = useCallback(async () => {
    try {
      const res = await axios.get('/api/notifications/notifications/unread_count/');
      setUnreadCount(res.data.unread_count);
    } catch (err) {
      console.error('Erreur unread_count:', err);
    }
  }, []);

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get('/api/notifications/notifications/', {
        params: { page_size: 10 },
      });
      setNotifications(res.data.results || res.data);
    } catch (err) {
      console.error('Erreur notifications:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 60000);
    return () => clearInterval(interval);
  }, [fetchUnreadCount]);

  useEffect(() => {
    if (open) fetchNotifications();
  }, [open, fetchNotifications]);

  const handleMarkRead = async (id, e) => {
    e.stopPropagation();
    try {
      await axios.post(`/api/notifications/notifications/${id}/mark_read/`);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (err) {
      console.error('Erreur mark_read:', err);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await axios.post('/api/notifications/notifications/mark_all_read/');
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error('Erreur mark_all_read:', err);
    }
  };

  const handleClick = (notif) => {
    if (notif.link) {
      navigate(notif.link);
      setOpen(false);
    }
  };

  const timeAgo = (dateStr) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "A l'instant";
    if (mins < 60) return `Il y a ${mins}min`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `Il y a ${hours}h`;
    const days = Math.floor(hours / 24);
    return `Il y a ${days}j`;
  };

  const dropdownContent = (
    <div
      style={{
        width: 380,
        maxHeight: 480,
        background: '#fff',
        borderRadius: 8,
        boxShadow: '0 6px 16px rgba(0,0,0,0.12)',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          padding: '12px 16px',
          borderBottom: '1px solid #f0f0f0',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <Text strong style={{ fontSize: 15 }}>
          Notifications {unreadCount > 0 && `(${unreadCount})`}
        </Text>
        <div style={{ display: 'flex', gap: 8 }}>
          {unreadCount > 0 && (
            <Button type="link" size="small" icon={<CheckOutlined />} onClick={handleMarkAllRead}>
              Tout lire
            </Button>
          )}
          <Button type="link" size="small" icon={<EyeOutlined />} onClick={() => { navigate('/notifications'); setOpen(false); }}>
            Voir tout
          </Button>
        </div>
      </div>

      <div style={{ maxHeight: 400, overflowY: 'auto' }}>
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center' }}><Spin /></div>
        ) : notifications.length === 0 ? (
          <Empty description="Aucune notification" style={{ padding: 40 }} image={Empty.PRESENTED_IMAGE_SIMPLE} />
        ) : (
          <List
            dataSource={notifications}
            renderItem={(notif) => (
              <List.Item
                key={notif.id}
                style={{
                  padding: '10px 16px',
                  cursor: notif.link ? 'pointer' : 'default',
                  background: notif.is_read ? '#fff' : '#f6ffed',
                  borderBottom: '1px solid #f5f5f5',
                }}
                onClick={() => handleClick(notif)}
              >
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                      <Tag color={LEVEL_COLORS[notif.level]} style={{ margin: 0, fontSize: 11 }}>
                        {notif.level === 'critical' ? 'Critique' : notif.level === 'warning' ? 'Attention' : notif.level === 'success' ? 'Succès' : 'Info'}
                      </Tag>
                      <Tag style={{ margin: 0, fontSize: 11 }}>{MODULE_LABELS[notif.module] || notif.module}</Tag>
                    </div>
                    {!notif.is_read && (
                      <Button type="text" size="small" onClick={(e) => handleMarkRead(notif.id, e)} title="Marquer comme lu">
                        <CheckOutlined style={{ fontSize: 12, color: '#52c41a' }} />
                      </Button>
                    )}
                  </div>
                  <Text strong style={{ fontSize: 13 }}>{notif.title}</Text>
                  <br />
                  <Text type="secondary" style={{ fontSize: 12 }}>{notif.message.length > 100 ? notif.message.substring(0, 100) + '...' : notif.message}</Text>
                  <br />
                  <Text type="secondary" style={{ fontSize: 11 }}>{timeAgo(notif.created_at)}</Text>
                </div>
              </List.Item>
            )}
          />
        )}
      </div>
    </div>
  );

  return (
    <Dropdown
      dropdownRender={() => dropdownContent}
      trigger={['click']}
      open={open}
      onOpenChange={setOpen}
      placement="bottomRight"
    >
      <div style={{ cursor: 'pointer', padding: '0 8px', display: 'flex', alignItems: 'center' }}>
        <Badge count={unreadCount} overflowCount={99} size="small">
          <BellOutlined style={{ fontSize: 20, color: '#595959' }} />
        </Badge>
      </div>
    </Dropdown>
  );
};

export default NotificationBell;
