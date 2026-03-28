import React, { useState, useEffect } from 'react';
import { Layout, Card, Switch, Typography, Spin, message, Button, Descriptions } from 'antd';
import { HomeOutlined, ArrowLeftOutlined, SettingOutlined } from '@ant-design/icons';
import { Link, useNavigate } from 'react-router-dom';
import axios from '../../utils/axiosConfig';
import UserMenu from '../common/UserMenu';
import GlobalSearch from '../common/GlobalSearch';

const { Header, Content } = Layout;
const { Title } = Typography;

const PREFS_CONFIG = [
  { key: 'in_app_enabled', label: 'Notifications in-app', description: 'Recevoir les notifications dans l\'application' },
  { key: 'email_overdue_invoices', label: 'Email : factures échues', description: 'Alerte par email quand une facture client dépasse la date d\'échéance' },
  { key: 'email_stock_alerts', label: 'Email : alertes stock', description: 'Alerte par email quand un produit passe sous le seuil de stock' },
  { key: 'email_overdue_purchases', label: 'Email : achats en retard', description: 'Alerte par email quand une facture fournisseur ou un BC est en retard' },
];

const NotificationPreferences = () => {
  const [prefs, setPrefs] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchPrefs = async () => {
      try {
        const res = await axios.get('/api/notifications/notification-preferences/');
        setPrefs(res.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchPrefs();
  }, []);

  const handleToggle = async (key, checked) => {
    setSaving(true);
    try {
      const res = await axios.patch('/api/notifications/notification-preferences/', { [key]: checked });
      setPrefs(res.data);
      message.success('Préférence mise à jour');
    } catch (err) {
      message.error('Erreur lors de la mise a jour');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Layout style={{ minHeight: '100vh', background: '#F8FAFC' }}>
      <Header style={{
          background: '#FFFFFF', padding: '0 24px', display: 'flex',
          justifyContent: 'space-between', alignItems: 'center',
          borderBottom: '1px solid #E5E7EB', boxShadow: '0 1px 3px rgba(15,23,42,0.06)', height: 64,
        }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <Link to="/" style={{ color: '#64748B', fontSize: 14 }}><HomeOutlined /> Accueil</Link>
          <span style={{ color: '#E5E7EB' }}>|</span>
          <Title level={4} style={{ margin: 0, color: '#0F172A' }}>
            <SettingOutlined style={{ marginRight: 8, color: '#10B981' }} />
            Préférences de Notification
          </Title>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <GlobalSearch />
          <UserMenu />
        </div>
      </Header>
      <Content style={{ padding: 24 }}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/notifications')} style={{ marginBottom: 16 }}>
          Retour aux notifications
        </Button>
        <Card title="Canaux de notification" style={{ maxWidth: 700 }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: 40 }}><Spin /></div>
          ) : (
            <Descriptions column={1} bordered>
              {PREFS_CONFIG.map((item) => (
                <Descriptions.Item
                  key={item.key}
                  label={
                    <div>
                      <div style={{ fontWeight: 500 }}>{item.label}</div>
                      <div style={{ fontSize: 12, color: '#888' }}>{item.description}</div>
                    </div>
                  }
                >
                  <Switch
                    checked={prefs?.[item.key]}
                    onChange={(checked) => handleToggle(item.key, checked)}
                    loading={saving}
                  />
                </Descriptions.Item>
              ))}
            </Descriptions>
          )}
        </Card>
      </Content>
    </Layout>
  );
};

export default NotificationPreferences;
