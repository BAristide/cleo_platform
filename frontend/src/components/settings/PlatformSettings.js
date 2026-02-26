// src/components/settings/PlatformSettings.js
import React, { useState, useEffect, useCallback } from 'react';
import {
  Tabs, Form, Input, InputNumber, Select, Switch, Button, Card,
  Typography, Spin, message, Tag, Row, Col, Divider, Descriptions,
  Space, Upload, Alert, Statistic, Progress, Tooltip,
} from 'antd';
import {
  BankOutlined, SettingOutlined, MailOutlined, InfoCircleOutlined,
  SaveOutlined, SendOutlined, UploadOutlined, LockOutlined,
  CloudServerOutlined, DatabaseOutlined, TeamOutlined,
  CheckCircleOutlined, CloseCircleOutlined, GlobalOutlined,
  SafetyCertificateOutlined, HomeOutlined,
} from '@ant-design/icons';
import { Link } from 'react-router-dom';
import { Breadcrumb, Layout } from 'antd';
import UserMenu from '../common/UserMenu';
import axios from '../../utils/axiosConfig';

const { Title, Text } = Typography;
const { TabPane } = Tabs;
const { Content, Header } = Layout;

// ════════════════════════════════════════════════════════════════
// Onglet 1 — Entreprise
// ════════════════════════════════════════════════════════════════

const CompanyTab = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [companyData, setCompanyData] = useState(null);

  const fetchData = useCallback(async () => {
    try {
      const res = await axios.get('/api/core/company/');
      setCompanyData(res.data);
      form.setFieldsValue(res.data);
    } catch (err) {
      message.error('Impossible de charger les informations entreprise');
    } finally {
      setLoading(false);
    }
  }, [form]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      setSaving(true);
      await axios.put('/api/core/company/', values);
      message.success('Informations entreprise mises à jour');
      fetchData();
    } catch (err) {
      if (err.response) {
        message.error(err.response.data?.error || 'Erreur lors de la sauvegarde');
      }
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Spin tip="Chargement..." style={{ display: 'block', margin: '60px auto' }} />;

  const legalIds = companyData?.legal_ids || [];

  return (
    <Form form={form} layout="vertical" style={{ maxWidth: 900 }}>
      {/* Pack & verrouillage */}
      <Card size="small" style={{ marginBottom: 24, background: '#fafafa' }}>
        <Row gutter={24} align="middle">
          <Col>
            <Text type="secondary">Pack de localisation</Text>
            <div>
              <Tag color="blue" style={{ fontSize: 14, padding: '4px 12px', marginTop: 4 }}>
                <GlobalOutlined /> {companyData?.locale_pack || '—'}
              </Tag>
            </div>
          </Col>
          <Col>
            <Text type="secondary">Devise par défaut</Text>
            <div>
              <Tag color="green" style={{ fontSize: 14, padding: '4px 12px', marginTop: 4 }}>
                {companyData?.currency_code || '—'} ({companyData?.currency_symbol || ''})
              </Tag>
            </div>
          </Col>
          <Col>
            <Text type="secondary">Verrouillage</Text>
            <div style={{ marginTop: 4 }}>
              {companyData?.is_locked ? (
                <Tag icon={<LockOutlined />} color="orange">Verrouillé (écriture comptable existante)</Tag>
              ) : (
                <Tag icon={<CheckCircleOutlined />} color="green">Non verrouillé</Tag>
              )}
            </div>
          </Col>
        </Row>
      </Card>

      {/* Identité */}
      <Title level={5}>Identité</Title>
      <Row gutter={16}>
        <Col span={12}>
          <Form.Item name="company_name" label="Raison sociale" rules={[{ required: true, message: 'Champ obligatoire' }]}>
            <Input />
          </Form.Item>
        </Col>
      </Row>

      {/* Adresse */}
      <Title level={5} style={{ marginTop: 16 }}>Adresse</Title>
      <Row gutter={16}>
        <Col span={12}>
          <Form.Item name="address_line1" label="Adresse ligne 1"><Input /></Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item name="address_line2" label="Adresse ligne 2"><Input /></Form.Item>
        </Col>
        <Col span={8}>
          <Form.Item name="city" label="Ville"><Input /></Form.Item>
        </Col>
        <Col span={8}>
          <Form.Item name="postal_code" label="Code postal"><Input /></Form.Item>
        </Col>
        <Col span={8}>
          <Form.Item name="country" label="Pays"><Input /></Form.Item>
        </Col>
      </Row>

      {/* Contact */}
      <Title level={5} style={{ marginTop: 16 }}>Contact</Title>
      <Row gutter={16}>
        <Col span={8}>
          <Form.Item name="phone" label="Téléphone"><Input /></Form.Item>
        </Col>
        <Col span={8}>
          <Form.Item name="email" label="Email"><Input type="email" /></Form.Item>
        </Col>
        <Col span={8}>
          <Form.Item name="website" label="Site web"><Input /></Form.Item>
        </Col>
      </Row>

      {/* Identifiants légaux */}
      {legalIds.length > 0 && (
        <>
          <Title level={5} style={{ marginTop: 16 }}>Identifiants légaux</Title>
          <Row gutter={16}>
            {[1, 2, 3, 4].map(i => {
              const label = companyData?.[`legal_id_${i}_label`];
              if (!label) return null;
              return (
                <Col span={6} key={i}>
                  <Form.Item name={`legal_id_${i}_value`} label={label}><Input /></Form.Item>
                </Col>
              );
            })}
          </Row>
        </>
      )}

      {/* Coordonnées bancaires */}
      <Title level={5} style={{ marginTop: 16 }}>Coordonnées bancaires</Title>
      <Row gutter={16}>
        <Col span={8}>
          <Form.Item name="bank_name" label="Banque"><Input /></Form.Item>
        </Col>
        <Col span={8}>
          <Form.Item name="bank_account" label="IBAN / RIB"><Input /></Form.Item>
        </Col>
        <Col span={8}>
          <Form.Item name="bank_swift" label="Code SWIFT/BIC"><Input /></Form.Item>
        </Col>
      </Row>

      <Divider />
      <Button type="primary" icon={<SaveOutlined />} onClick={handleSave} loading={saving} size="large">
        Enregistrer les modifications
      </Button>
    </Form>
  );
};

// ════════════════════════════════════════════════════════════════
// Onglet 2 — Paramètres système
// ════════════════════════════════════════════════════════════════

const SettingsTab = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const res = await axios.get('/api/core/settings/');
      form.setFieldsValue(res.data);
    } catch (err) {
      message.error('Impossible de charger les paramètres');
    } finally {
      setLoading(false);
    }
  }, [form]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      setSaving(true);
      await axios.put('/api/core/settings/', values);
      message.success('Paramètres système mis à jour');
    } catch (err) {
      if (err.response) {
        message.error(err.response.data?.error || 'Erreur lors de la sauvegarde');
      }
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Spin tip="Chargement..." style={{ display: 'block', margin: '60px auto' }} />;

  return (
    <Form form={form} layout="vertical" style={{ maxWidth: 900 }}>
      {/* Préfixes documents */}
      <Title level={5}>Préfixes des documents</Title>
      <Row gutter={16}>
        <Col span={8}>
          <Form.Item name="invoice_prefix" label="Préfixe factures">
            <Input placeholder="FACT-" />
          </Form.Item>
        </Col>
        <Col span={8}>
          <Form.Item name="quote_prefix" label="Préfixe devis">
            <Input placeholder="DEV-" />
          </Form.Item>
        </Col>
        <Col span={8}>
          <Form.Item name="order_prefix" label="Préfixe commandes">
            <Input placeholder="CMD-" />
          </Form.Item>
        </Col>
      </Row>

      {/* Délais et formats */}
      <Title level={5} style={{ marginTop: 16 }}>Délais et formats</Title>
      <Row gutter={16}>
        <Col span={8}>
          <Form.Item name="default_payment_term" label="Délai de paiement (jours)">
            <InputNumber min={0} max={365} style={{ width: '100%' }} />
          </Form.Item>
        </Col>
        <Col span={8}>
          <Form.Item name="decimal_precision" label="Précision décimale">
            <InputNumber min={0} max={6} style={{ width: '100%' }} />
          </Form.Item>
        </Col>
        <Col span={8}>
          <Form.Item name="date_format" label="Format de date">
            <Select options={[
              { value: 'd/m/Y', label: 'dd/mm/aaaa' },
              { value: 'Y-m-d', label: 'aaaa-mm-dd' },
              { value: 'm/d/Y', label: 'mm/dd/aaaa' },
            ]} />
          </Form.Item>
        </Col>
      </Row>

      <Row gutter={16}>
        <Col span={8}>
          <Form.Item name="language" label="Langue">
            <Select options={[
              { value: 'fr', label: 'Français' },
              { value: 'en', label: 'Anglais' },
            ]} />
          </Form.Item>
        </Col>
        <Col span={8}>
          <Form.Item name="timezone" label="Fuseau horaire">
            <Select showSearch options={[
              { value: 'Africa/Casablanca', label: 'Africa/Casablanca (GMT+1)' },
              { value: 'Africa/Abidjan', label: 'Africa/Abidjan (GMT)' },
              { value: 'Africa/Dakar', label: 'Africa/Dakar (GMT)' },
              { value: 'Africa/Douala', label: 'Africa/Douala (GMT+1)' },
              { value: 'Europe/Paris', label: 'Europe/Paris (GMT+1)' },
              { value: 'UTC', label: 'UTC' },
            ]} />
          </Form.Item>
        </Col>
        <Col span={8}>
          <Form.Item name="time_format" label="Format d'heure">
            <Select options={[
              { value: 'H:i', label: '24h (14:30)' },
              { value: 'h:i A', label: '12h (02:30 PM)' },
            ]} />
          </Form.Item>
        </Col>
      </Row>

      {/* Archivage */}
      <Title level={5} style={{ marginTop: 16 }}>Archivage des documents</Title>
      <Row gutter={16} align="middle">
        <Col span={8}>
          <Form.Item name="auto_archive_documents" label="Archivage automatique" valuePropName="checked">
            <Switch checkedChildren="Activé" unCheckedChildren="Désactivé" />
          </Form.Item>
        </Col>
        <Col span={8}>
          <Form.Item name="archive_after_days" label="Archiver après (jours)">
            <InputNumber min={30} max={3650} style={{ width: '100%' }} />
          </Form.Item>
        </Col>
      </Row>

      <Divider />
      <Button type="primary" icon={<SaveOutlined />} onClick={handleSave} loading={saving} size="large">
        Enregistrer les paramètres
      </Button>
    </Form>
  );
};

// ════════════════════════════════════════════════════════════════
// Onglet 3 — Email
// ════════════════════════════════════════════════════════════════

const EmailTab = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [passwordIsSet, setPasswordIsSet] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const res = await axios.get('/api/core/settings/email/');
      setPasswordIsSet(res.data.password_is_set);
      form.setFieldsValue({
        ...res.data,
        email_host_password: '', // jamais prérempli
      });
    } catch (err) {
      message.error('Impossible de charger la configuration email');
    } finally {
      setLoading(false);
    }
  }, [form]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      setSaving(true);
      // Si le mot de passe est vide, ne pas l'envoyer (conserve l'existant)
      const payload = { ...values };
      if (!payload.email_host_password) {
        delete payload.email_host_password;
      }
      await axios.put('/api/core/settings/email/', payload);
      message.success('Configuration email mise à jour');
      fetchData();
    } catch (err) {
      if (err.response) {
        message.error(err.response.data?.error || 'Erreur lors de la sauvegarde');
      }
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    try {
      setTesting(true);
      const res = await axios.post('/api/core/settings/email/test/');
      message.success(res.data.message || 'Email de test envoyé');
    } catch (err) {
      message.error(err.response?.data?.error || "Échec de l'envoi du test");
    } finally {
      setTesting(false);
    }
  };

  if (loading) return <Spin tip="Chargement..." style={{ display: 'block', margin: '60px auto' }} />;

  return (
    <Form form={form} layout="vertical" style={{ maxWidth: 900 }}>
      {/* Serveur SMTP */}
      <Title level={5}>Serveur SMTP</Title>
      <Row gutter={16}>
        <Col span={12}>
          <Form.Item name="email_host" label="Serveur SMTP" rules={[{ required: true, message: 'Serveur requis' }]}>
            <Input placeholder="smtp.example.com" />
          </Form.Item>
        </Col>
        <Col span={6}>
          <Form.Item name="email_port" label="Port">
            <InputNumber min={1} max={65535} style={{ width: '100%' }} />
          </Form.Item>
        </Col>
        <Col span={6}>
          <Form.Item name="email_use_tls" label="TLS" valuePropName="checked">
            <Switch checkedChildren="Oui" unCheckedChildren="Non" />
          </Form.Item>
        </Col>
      </Row>

      {/* Authentification */}
      <Title level={5} style={{ marginTop: 16 }}>Authentification</Title>
      <Row gutter={16}>
        <Col span={12}>
          <Form.Item name="email_host_user" label="Utilisateur SMTP">
            <Input placeholder="user@example.com" />
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item
            name="email_host_password"
            label={
              <span>
                Mot de passe SMTP{' '}
                {passwordIsSet && (
                  <Tooltip title="Un mot de passe est déjà configuré. Laissez vide pour le conserver.">
                    <Tag color="green" style={{ marginLeft: 8 }}>Configuré</Tag>
                  </Tooltip>
                )}
              </span>
            }
          >
            <Input.Password placeholder={passwordIsSet ? '••••••••  (laisser vide pour conserver)' : 'Mot de passe'} />
          </Form.Item>
        </Col>
      </Row>

      {/* Expéditeur */}
      <Title level={5} style={{ marginTop: 16 }}>Expéditeur</Title>
      <Row gutter={16}>
        <Col span={12}>
          <Form.Item name="default_from_email" label="Adresse expéditeur par défaut">
            <Input placeholder="noreply@example.com" />
          </Form.Item>
        </Col>
      </Row>

      <Divider />
      <Space size="middle">
        <Button type="primary" icon={<SaveOutlined />} onClick={handleSave} loading={saving} size="large">
          Enregistrer
        </Button>
        <Button icon={<SendOutlined />} onClick={handleTest} loading={testing} size="large">
          Envoyer un email de test
        </Button>
      </Space>
    </Form>
  );
};

// ════════════════════════════════════════════════════════════════
// Onglet 4 — Informations système
// ════════════════════════════════════════════════════════════════

const SystemTab = () => {
  const [loading, setLoading] = useState(true);
  const [info, setInfo] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await axios.get('/api/core/system-info/');
        setInfo(res.data);
      } catch (err) {
        message.error('Impossible de charger les informations système');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) return <Spin tip="Chargement..." style={{ display: 'block', margin: '60px auto' }} />;
  if (!info) return <Alert type="error" message="Données indisponibles" />;

  const disk = info.disk_info;

  return (
    <div style={{ maxWidth: 900 }}>
      {/* Plateforme */}
      <Title level={5}><CloudServerOutlined /> Plateforme</Title>
      <Descriptions bordered size="small" column={2} style={{ marginBottom: 24 }}>
        <Descriptions.Item label="Version Cleo ERP">
          <Tag color="blue" style={{ fontSize: 14 }}>v{info.version}</Tag>
        </Descriptions.Item>
        <Descriptions.Item label="Pack de localisation">
          <Tag color="green">{info.locale_pack || '—'}</Tag>
        </Descriptions.Item>
        <Descriptions.Item label="Entreprise">{info.company_name || '—'}</Descriptions.Item>
        <Descriptions.Item label="Verrouillage">
          {info.is_locked ? (
            <Tag icon={<LockOutlined />} color="orange">Verrouillé</Tag>
          ) : (
            <Tag icon={<CheckCircleOutlined />} color="green">Non verrouillé</Tag>
          )}
        </Descriptions.Item>
        <Descriptions.Item label="Date de configuration">
          {info.setup_date ? new Date(info.setup_date).toLocaleDateString('fr-FR', {
            day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
          }) : '—'}
        </Descriptions.Item>
        <Descriptions.Item label="Mode debug">
          {info.debug_mode ? (
            <Tag icon={<CloseCircleOutlined />} color="red">Activé</Tag>
          ) : (
            <Tag icon={<SafetyCertificateOutlined />} color="green">Désactivé</Tag>
          )}
        </Descriptions.Item>
      </Descriptions>

      {/* Statistiques */}
      <Title level={5}><DatabaseOutlined /> Données</Title>
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={6}>
          <Card size="small">
            <Statistic title="Comptes comptables" value={info.accounts_count} prefix={<BankOutlined />} />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small">
            <Statistic title="Journaux" value={info.journals_count} prefix={<DatabaseOutlined />} />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small">
            <Statistic title="Utilisateurs" value={info.users_count} prefix={<TeamOutlined />} />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small">
            <Statistic title="Devises" value={info.currencies_count} prefix={<GlobalOutlined />} />
          </Card>
        </Col>
      </Row>

      {/* Espace disque */}
      {disk && (
        <>
          <Title level={5}><CloudServerOutlined /> Espace disque</Title>
          <Card size="small" style={{ marginBottom: 24 }}>
            <Row gutter={24} align="middle">
              <Col span={6}>
                <Progress
                  type="dashboard"
                  percent={disk.usage_percent}
                  size={100}
                  strokeColor={disk.usage_percent > 85 ? '#ff4d4f' : disk.usage_percent > 70 ? '#faad14' : '#52c41a'}
                />
              </Col>
              <Col span={18}>
                <Descriptions size="small" column={3}>
                  <Descriptions.Item label="Total">{disk.total_gb} Go</Descriptions.Item>
                  <Descriptions.Item label="Utilisé">{disk.used_gb} Go</Descriptions.Item>
                  <Descriptions.Item label="Libre">{disk.free_gb} Go</Descriptions.Item>
                  <Descriptions.Item label="Médias">{info.media_size_mb} Mo</Descriptions.Item>
                </Descriptions>
              </Col>
            </Row>
          </Card>
        </>
      )}

      {/* Technique */}
      <Title level={5}><InfoCircleOutlined /> Technique</Title>
      <Descriptions bordered size="small" column={2}>
        <Descriptions.Item label="Python">{info.python_version}</Descriptions.Item>
        <Descriptions.Item label="Django">{info.django_version}</Descriptions.Item>
      </Descriptions>
    </div>
  );
};

// ════════════════════════════════════════════════════════════════
// Page principale — PlatformSettings
// ════════════════════════════════════════════════════════════════

const PlatformSettings = () => {
  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header style={{
        background: '#fff',
        padding: '0 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        boxShadow: '0 1px 4px rgba(0, 21, 41, 0.08)',
        zIndex: 1,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <Link to="/" style={{ textDecoration: 'none' }}>
            <Title level={4} style={{ margin: 0, color: '#001529' }}>Cleo ERP</Title>
          </Link>
          <Divider type="vertical" style={{ height: 24 }} />
          <Title level={4} style={{ margin: 0 }}>
            <SettingOutlined /> Configuration
          </Title>
        </div>
        <UserMenu />
      </Header>

      <Content style={{ margin: 16 }}>
        <Breadcrumb style={{ marginBottom: 16 }}>
          <Breadcrumb.Item>
            <Link to="/"><HomeOutlined /> Home</Link>
          </Breadcrumb.Item>
          <Breadcrumb.Item>Configuration</Breadcrumb.Item>
        </Breadcrumb>

        <Card>
          <Tabs
            defaultActiveKey="company"
            size="large"
            items={[
              {
                key: 'company',
                label: <span><BankOutlined /> Entreprise</span>,
                children: <CompanyTab />,
              },
              {
                key: 'settings',
                label: <span><SettingOutlined /> Paramètres</span>,
                children: <SettingsTab />,
              },
              {
                key: 'email',
                label: <span><MailOutlined /> Email</span>,
                children: <EmailTab />,
              },
              {
                key: 'system',
                label: <span><InfoCircleOutlined /> Système</span>,
                children: <SystemTab />,
              },
            ]}
          />
        </Card>
      </Content>
    </Layout>
  );
};

export default PlatformSettings;
