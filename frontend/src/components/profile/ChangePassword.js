// src/components/profile/ChangePassword.js
import React, { useState } from 'react';
import { Layout, Card, Form, Input, Button, Typography, message, Result } from 'antd';
import { LockOutlined, ArrowLeftOutlined, CheckCircleOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import axios from '../../utils/axiosConfig';
import UserMenu from '../common/UserMenu';

const { Header, Content } = Layout;
const { Title } = Typography;

const ChangePassword = () => {
  const [form] = Form.useForm();
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();

  const onFinish = async (values) => {
    setSaving(true);
    try {
      await axios.post('/api/users/users/change-password/', {
        old_password: values.old_password,
        new_password: values.new_password,
        confirm_password: values.confirm_password,
      });
      setSuccess(true);
    } catch (error) {
      if (error.response?.data) {
        const errors = error.response.data;
        if (errors.old_password) {
          form.setFields([{ name: 'old_password', errors: Array.isArray(errors.old_password) ? errors.old_password : [errors.old_password] }]);
        }
        if (errors.confirm_password) {
          form.setFields([{ name: 'confirm_password', errors: Array.isArray(errors.confirm_password) ? errors.confirm_password : [errors.confirm_password] }]);
        }
        if (errors.new_password) {
          form.setFields([{ name: 'new_password', errors: Array.isArray(errors.new_password) ? errors.new_password : [errors.new_password] }]);
        }
        if (errors.non_field_errors) {
          message.error(errors.non_field_errors[0]);
        }
      } else {
        message.error('Erreur lors du changement de mot de passe.');
      }
    } finally {
      setSaving(false);
    }
  };

  if (success) {
    return (
      <Layout style={{ minHeight: '100vh' }}>
        <Header style={{ background: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 24px' }}>
          <Title level={3} style={{ margin: 0 }}>Changer mon mot de passe</Title>
          <UserMenu />
        </Header>
        <Content style={{ padding: '24px', maxWidth: 600, margin: '0 auto', width: '100%' }}>
          <Result
            icon={<CheckCircleOutlined style={{ color: '#52c41a' }} />}
            title="Mot de passe modifié avec succès"
            subTitle="Votre session reste active. Vous pouvez continuer à utiliser l'application."
            extra={[
              <Button type="primary" key="profile" onClick={() => navigate('/profile')}>
                Retour au profil
              </Button>,
              <Button key="dashboard" onClick={() => navigate('/')}>
                Tableau de bord
              </Button>,
            ]}
          />
        </Content>
      </Layout>
    );
  }

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header style={{ background: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/profile')}>Retour au profil</Button>
          <Title level={3} style={{ margin: 0 }}>Changer mon mot de passe</Title>
        </div>
        <UserMenu />
      </Header>
      <Content style={{ padding: '24px', maxWidth: 500, margin: '0 auto', width: '100%' }}>
        <Card>
          <Form form={form} layout="vertical" onFinish={onFinish}>
            <Form.Item
              name="old_password"
              label="Mot de passe actuel"
              rules={[{ required: true, message: 'Le mot de passe actuel est requis' }]}
            >
              <Input.Password prefix={<LockOutlined />} placeholder="Votre mot de passe actuel" />
            </Form.Item>
            <Form.Item
              name="new_password"
              label="Nouveau mot de passe"
              rules={[
                { required: true, message: 'Le nouveau mot de passe est requis' },
                { min: 8, message: 'Le mot de passe doit contenir au moins 8 caractères' },
              ]}
            >
              <Input.Password prefix={<LockOutlined />} placeholder="Nouveau mot de passe (min. 8 caractères)" />
            </Form.Item>
            <Form.Item
              name="confirm_password"
              label="Confirmer le nouveau mot de passe"
              dependencies={['new_password']}
              rules={[
                { required: true, message: 'Veuillez confirmer le nouveau mot de passe' },
                ({ getFieldValue }) => ({
                  validator(_, value) {
                    if (!value || getFieldValue('new_password') === value) {
                      return Promise.resolve();
                    }
                    return Promise.reject(new Error('Les mots de passe ne correspondent pas'));
                  },
                }),
              ]}
            >
              <Input.Password prefix={<LockOutlined />} placeholder="Confirmez le nouveau mot de passe" />
            </Form.Item>
            <Form.Item>
              <Button type="primary" htmlType="submit" loading={saving} block>
                Changer le mot de passe
              </Button>
            </Form.Item>
          </Form>
        </Card>
      </Content>
    </Layout>
  );
};

export default ChangePassword;
