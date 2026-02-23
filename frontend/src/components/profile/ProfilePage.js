// src/components/profile/ProfilePage.js
import React, { useState, useEffect, useContext } from 'react';
import { Layout, Card, Form, Input, Button, Typography, message, Spin, Descriptions, Divider, Row, Col, Tag } from 'antd';
import { UserOutlined, MailOutlined, PhoneOutlined, SaveOutlined, ArrowLeftOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import axios from '../../utils/axiosConfig';
import { AuthContext } from '../../context/AuthContext';
import UserMenu from '../common/UserMenu';

const { Header, Content } = Layout;
const { Title, Text } = Typography;

const ProfilePage = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [userData, setUserData] = useState(null);
  const { refreshUser } = useContext(AuthContext);
  const navigate = useNavigate();

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const res = await axios.get('/api/users/users/me/');
      setUserData(res.data);
      form.setFieldsValue({
        email: res.data.email,
        first_name: res.data.first_name,
        last_name: res.data.last_name,
        phone: res.data.profile?.phone || '',
      });
    } catch (error) {
      message.error('Impossible de charger le profil.');
    } finally {
      setLoading(false);
    }
  };

  const onFinish = async (values) => {
    setSaving(true);
    try {
      await axios.patch('/api/users/users/me/', {
        first_name: values.first_name,
        last_name: values.last_name,
        email: values.email,
        phone: values.phone,
      });
      message.success('Profil mis à jour avec succès.');
      // Rafraîchir les données dans le AuthContext (met à jour le UserMenu)
      refreshUser();
      // Recharger les données locales
      fetchProfile();
    } catch (error) {
      if (error.response?.data) {
        const errors = error.response.data;
        if (errors.email) {
          message.error(Array.isArray(errors.email) ? errors.email[0] : errors.email);
        } else {
          message.error('Erreur lors de la mise à jour du profil.');
        }
      } else {
        message.error('Erreur lors de la mise à jour du profil.');
      }
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header style={{ background: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <Button icon={<ArrowLeftOutlined />} onClick={() => navigate(-1)}>Retour</Button>
          <Title level={3} style={{ margin: 0 }}>Mon profil</Title>
        </div>
        <UserMenu />
      </Header>
      <Content style={{ padding: '24px', maxWidth: 800, margin: '0 auto', width: '100%' }}>
        <Row gutter={[24, 24]}>
          {/* Informations en lecture seule */}
          <Col span={24}>
            <Card title="Informations du compte">
              <Descriptions column={1} bordered size="small">
                <Descriptions.Item label="Identifiant">{userData?.email}</Descriptions.Item>
                <Descriptions.Item label="Statut">
                  {userData?.is_active ? <Tag color="green">Actif</Tag> : <Tag color="red">Inactif</Tag>}
                </Descriptions.Item>
                <Descriptions.Item label="Rôle">
                  {userData?.is_staff ? <Tag color="blue">Staff</Tag> : <Tag>Utilisateur</Tag>}
                  {userData?.groups?.length > 0 && userData.groups.map(g => <Tag key={g} color="purple">{g}</Tag>)}
                </Descriptions.Item>
                {userData?.employee_detail && (
                  <Descriptions.Item label="Employé lié">
                    {userData.employee_detail.full_name}
                    {userData.employee_detail.department && ` — ${userData.employee_detail.department}`}
                  </Descriptions.Item>
                )}
              </Descriptions>
            </Card>
          </Col>

          {/* Formulaire modifiable */}
          <Col span={24}>
            <Card
              title="Modifier mes informations"
              extra={
                <Button type="link" onClick={() => navigate('/profile/password')}>
                  Changer mon mot de passe
                </Button>
              }
            >
              <Form form={form} layout="vertical" onFinish={onFinish}>
                <Row gutter={16}>
                  <Col span={12}>
                    <Form.Item
                      name="first_name"
                      label="Prénom"
                      rules={[{ required: true, message: 'Le prénom est requis' }]}
                    >
                      <Input prefix={<UserOutlined />} placeholder="Votre prénom" />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item
                      name="last_name"
                      label="Nom"
                      rules={[{ required: true, message: 'Le nom est requis' }]}
                    >
                      <Input prefix={<UserOutlined />} placeholder="Votre nom" />
                    </Form.Item>
                  </Col>
                </Row>
                <Form.Item
                  name="email"
                  label="Email"
                  rules={[
                    { required: true, message: "L'email est requis" },
                    { type: 'email', message: "Format d'email invalide" },
                  ]}
                >
                  <Input prefix={<MailOutlined />} placeholder="votre@email.ma" />
                </Form.Item>
                <Form.Item name="phone" label="Téléphone">
                  <Input prefix={<PhoneOutlined />} placeholder="+212 6XX XXX XXX" />
                </Form.Item>
                <Form.Item>
                  <Button type="primary" htmlType="submit" icon={<SaveOutlined />} loading={saving}>
                    Enregistrer les modifications
                  </Button>
                </Form.Item>
              </Form>
            </Card>
          </Col>
        </Row>
      </Content>
    </Layout>
  );
};

export default ProfilePage;
