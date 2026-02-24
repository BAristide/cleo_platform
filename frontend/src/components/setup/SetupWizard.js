import React, { useState, useEffect } from 'react';
import { Steps, Button, Card, Radio, Input, Form, Space, Typography, Alert, Spin, Result, Divider, Tag, Row, Col, message } from 'antd';
import { GlobalOutlined, BankOutlined, CheckCircleOutlined, ArrowRightOutlined, ArrowLeftOutlined, SettingOutlined } from '@ant-design/icons';
import axios from '../../utils/axiosConfig';

const { Title, Text, Paragraph } = Typography;
const { Step } = Steps;

const PACK_COLORS = {
  MA: '#c1272d',
  OHADA: '#00804a',
  FR: '#003399',
};

const SetupWizard = () => {
  const [current, setCurrent] = useState(0);
  const [packs, setPacks] = useState([]);
  const [selectedPack, setSelectedPack] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [setupDone, setSetupDone] = useState(false);
  const [setupResult, setSetupResult] = useState(null);
  const [installDemo, setInstallDemo] = useState(false);
  const [form] = Form.useForm();

  useEffect(() => {
    const fetchPacks = async () => {
      try {
        const res = await axios.get('/api/core/setup/packs/');
        setPacks(res.data);
      } catch (err) {
        message.error('Impossible de charger les packs de localisation');
      } finally {
        setLoading(false);
      }
    };
    fetchPacks();
  }, []);

  useEffect(() => {
    if (selectedPack) {
      const pack = packs.find(p => p.code === selectedPack);
      if (pack) {
        const labels = {};
        pack.legal_id_labels.forEach((label, i) => {
          labels[`legal_id_${i + 1}_label`] = label;
        });
        form.setFieldsValue(labels);
      }
    }
  }, [selectedPack, packs, form]);

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setSubmitting(true);

      const payload = {
        locale_pack: selectedPack,
        company_name: values.company_name,
        country_code: values.country_code || selectedPack,
        address_line1: values.address_line1 || '',
        address_line2: values.address_line2 || '',
        city: values.city || '',
        postal_code: values.postal_code || '',
        country: values.country || '',
        phone: values.phone || '',
        email: values.email || '',
        website: values.website || '',
        legal_id_1_label: values.legal_id_1_label || '',
        legal_id_1_value: values.legal_id_1_value || '',
        legal_id_2_label: values.legal_id_2_label || '',
        legal_id_2_value: values.legal_id_2_value || '',
        legal_id_3_label: values.legal_id_3_label || '',
        legal_id_3_value: values.legal_id_3_value || '',
        legal_id_4_label: values.legal_id_4_label || '',
        legal_id_4_value: values.legal_id_4_value || '',
        bank_name: values.bank_name || '',
        bank_account: values.bank_account || '',
        bank_swift: values.bank_swift || '',
        install_demo: installDemo,
      };

      const res = await axios.post('/api/core/setup/', payload);
      setSetupResult(res.data);
      setSetupDone(true);
    } catch (err) {
      const errMsg = err.response?.data?.error || err.response?.data?.detail || 'Erreur lors de la configuration';
      message.error(errMsg);
    } finally {
      setSubmitting(false);
    }
  };

  const next = () => {
    if (current === 0 && !selectedPack) {
      message.warning('Veuillez sélectionner un pack de localisation');
      return;
    }
    if (current === 1) {
      form.validateFields(['company_name']).then(() => {
        setCurrent(current + 1);
      }).catch(() => {});
      return;
    }
    setCurrent(current + 1);
  };

  const prev = () => setCurrent(current - 1);

  // ── Écran de succès ───────────────────────────────────────────────

  if (setupDone) {
    const details = setupResult?.details || {};
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f5f6f8' }}>
        <Card style={{ maxWidth: 560, width: '100%', borderRadius: 8 }}>
          <Result
            status="success"
            title="Configuration terminée"
            subTitle={setupResult?.message}
            extra={[
              <Button type="primary" size="large" key="start" onClick={() => window.location.href = '/'}>
                Accéder au tableau de bord
              </Button>
            ]}
          />
          <Divider />
          <Row gutter={16} justify="center">
            <Col><Tag color="blue">{details.accounts_created || 0} comptes</Tag></Col>
            <Col><Tag color="green">{details.taxes_created || 0} taxes</Tag></Col>
            <Col><Tag color="orange">{details.journals_created || 0} journaux</Tag></Col>
            <Col><Tag color="purple">{details.currencies_created || 0} devises</Tag></Col>
          </Row>
        </Card>
      </div>
    );
  }

  // ── Loading ───────────────────────────────────────────────────────

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f5f6f8' }}>
        <Spin size="large" />
      </div>
    );
  }

  // ── Wizard ────────────────────────────────────────────────────────

  const packInfo = packs.find(p => p.code === selectedPack);
  const packColor = PACK_COLORS[selectedPack] || '#1890ff';

  const steps = [
    {
      title: 'Localisation',
      icon: <GlobalOutlined />,
      content: (
        <div>
          <Title level={4} style={{ marginBottom: 8 }}>Pack de localisation</Title>
          <Paragraph type="secondary" style={{ marginBottom: 24 }}>
            Détermine le plan comptable, les taxes, la devise par défaut et les identifiants légaux applicables.
          </Paragraph>
          <Radio.Group
            value={selectedPack}
            onChange={e => setSelectedPack(e.target.value)}
            style={{ width: '100%' }}
          >
            <Space direction="vertical" style={{ width: '100%' }} size={12}>
              {packs.map(pack => {
                const color = PACK_COLORS[pack.code] || '#1890ff';
                const isSelected = selectedPack === pack.code;
                return (
                  <Radio.Button
                    key={pack.code}
                    value={pack.code}
                    style={{
                      width: '100%',
                      height: 'auto',
                      padding: '14px 20px',
                      borderRadius: 6,
                      borderColor: isSelected ? color : '#e0e0e0',
                      borderWidth: isSelected ? 2 : 1,
                      background: isSelected ? `${color}06` : '#fff',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 15, color: isSelected ? color : '#262626' }}>{pack.name}</div>
                        <div style={{ color: '#8c8c8c', fontSize: 13, marginTop: 2 }}>
                          {pack.chart_of_accounts} — {pack.default_currency}
                        </div>
                        <div style={{ color: '#bfbfbf', fontSize: 12, marginTop: 2 }}>
                          {pack.taxes_summary}
                        </div>
                      </div>
                      <Tag color={isSelected ? color : 'default'} style={{ fontWeight: 600, fontSize: 13, margin: 0 }}>
                        {pack.code}
                      </Tag>
                    </div>
                  </Radio.Button>
                );
              })}
            </Space>
          </Radio.Group>
        </div>
      ),
    },
    {
      title: 'Entreprise',
      icon: <BankOutlined />,
      content: (
        <div>
          <Title level={4} style={{ marginBottom: 8 }}>Informations de l'entreprise</Title>
          <Paragraph type="secondary" style={{ marginBottom: 24 }}>
            Ces informations apparaîtront sur vos documents commerciaux (devis, factures, bulletins de paie).
          </Paragraph>
          <Form form={form} layout="vertical" requiredMark="optional">
            <Form.Item
              name="company_name"
              label="Raison sociale"
              rules={[{ required: true, message: 'La raison sociale est requise' }]}
            >
              <Input size="large" placeholder="Ex : Ma Société SARL" />
            </Form.Item>

            <Row gutter={16}>
              <Col span={12}>
                <Form.Item name="address_line1" label="Adresse">
                  <Input placeholder="Rue, numéro" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="address_line2" label="Complément">
                  <Input placeholder="Bâtiment, étage" />
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={16}>
              <Col span={8}>
                <Form.Item name="city" label="Ville">
                  <Input />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item name="postal_code" label="Code postal">
                  <Input />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item name="country" label="Pays">
                  <Input />
                </Form.Item>
              </Col>
            </Row>

            <Divider orientation="left" plain style={{ fontSize: 13 }}>Contact</Divider>

            <Row gutter={16}>
              <Col span={8}>
                <Form.Item name="phone" label="Téléphone">
                  <Input />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item name="email" label="Email">
                  <Input />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item name="website" label="Site web">
                  <Input />
                </Form.Item>
              </Col>
            </Row>

            <Divider orientation="left" plain style={{ fontSize: 13 }}>Identifiants légaux — {packInfo?.name || ''}</Divider>

            {(packInfo?.legal_id_labels || []).map((label, i) => (
              <Row gutter={16} key={i}>
                <Col span={8}>
                  <Form.Item name={`legal_id_${i + 1}_label`} label={i === 0 ? 'Type' : ''}>
                    <Input disabled style={{ color: '#262626', fontWeight: 500 }} />
                  </Form.Item>
                </Col>
                <Col span={16}>
                  <Form.Item name={`legal_id_${i + 1}_value`} label={i === 0 ? 'Numéro' : ''}>
                    <Input placeholder={`Votre ${label}`} />
                  </Form.Item>
                </Col>
              </Row>
            ))}

            <Divider orientation="left" plain style={{ fontSize: 13 }}>Coordonnées bancaires</Divider>

            <Row gutter={16}>
              <Col span={8}>
                <Form.Item name="bank_name" label="Banque">
                  <Input />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item name="bank_account" label="IBAN / RIB">
                  <Input />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item name="bank_swift" label="SWIFT / BIC">
                  <Input />
                </Form.Item>
              </Col>
            </Row>
          </Form>
        </div>
      ),
    },
    {
      title: 'Confirmation',
      icon: <CheckCircleOutlined />,
      content: (
        <div>
          <Title level={4} style={{ marginBottom: 8 }}>Résumé de la configuration</Title>
          <Paragraph type="secondary" style={{ marginBottom: 24 }}>
            Vérifiez les informations avant de lancer l'initialisation.
          </Paragraph>

          <Card size="small" style={{ marginBottom: 16, borderLeft: `3px solid ${packColor}` }}>
            <Row gutter={16}>
              <Col span={12}>
                <Text type="secondary" style={{ fontSize: 12 }}>Pack de localisation</Text>
                <div style={{ fontSize: 15, fontWeight: 600 }}>{packInfo?.name}</div>
              </Col>
              <Col span={12}>
                <Text type="secondary" style={{ fontSize: 12 }}>Devise par défaut</Text>
                <div style={{ fontSize: 15, fontWeight: 600 }}>{packInfo?.default_currency}</div>
              </Col>
            </Row>
            <Row gutter={16} style={{ marginTop: 12 }}>
              <Col span={12}>
                <Text type="secondary" style={{ fontSize: 12 }}>Plan comptable</Text>
                <div style={{ fontSize: 13 }}>{packInfo?.chart_of_accounts}</div>
              </Col>
              <Col span={12}>
                <Text type="secondary" style={{ fontSize: 12 }}>Taxes</Text>
                <div style={{ fontSize: 13 }}>{packInfo?.taxes_summary}</div>
              </Col>
            </Row>
          </Card>

          <Card size="small" style={{ marginBottom: 16 }}>
            <Text type="secondary" style={{ fontSize: 12 }}>Entreprise</Text>
            <div style={{ fontSize: 15, fontWeight: 600 }}>
              {form.getFieldValue('company_name') || '—'}
            </div>
            <div style={{ color: '#8c8c8c', marginTop: 4, fontSize: 13 }}>
              {[form.getFieldValue('address_line1'), form.getFieldValue('city'), form.getFieldValue('country')]
                .filter(Boolean).join(', ') || 'Adresse non renseignée'}
            </div>
          </Card>

          <Card size="small" style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <Text style={{ fontWeight: 500 }}>Données de démonstration</Text>
                <div style={{ fontSize: 12, color: '#8c8c8c' }}>
                  Clients, produits, factures et écritures comptables de test
                </div>
              </div>
              <Radio.Group value={installDemo} onChange={e => setInstallDemo(e.target.value)} size="small">
                <Radio.Button value={false}>Non</Radio.Button>
                <Radio.Button value={true}>Oui</Radio.Button>
              </Radio.Group>
            </div>
          </Card>

          <Alert
            type="info"
            showIcon
            message="Le pack de localisation ne pourra plus être modifié après la première écriture comptable."
            style={{ marginTop: 16 }}
          />
        </div>
      ),
    },
  ];

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f5f6f8', padding: 24 }}>
      <Card style={{ maxWidth: 780, width: '100%', borderRadius: 8 }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <SettingOutlined style={{ fontSize: 28, color: '#1890ff', marginBottom: 8 }} />
          <Title level={3} style={{ margin: 0 }}>Configuration initiale</Title>
          <Text type="secondary">Cleo ERP — Assistant de première installation</Text>
        </div>

        <Steps current={current} style={{ marginBottom: 32 }}>
          {steps.map(s => (
            <Step key={s.title} title={s.title} icon={s.icon} />
          ))}
        </Steps>

        <div style={{ minHeight: 300 }}>
          {steps[current].content}
        </div>

        <Divider />

        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          {current > 0 ? (
            <Button size="large" onClick={prev} icon={<ArrowLeftOutlined />}>Précédent</Button>
          ) : <div />}

          {current < steps.length - 1 ? (
            <Button type="primary" size="large" onClick={next}>
              Suivant <ArrowRightOutlined />
            </Button>
          ) : (
            <Button
              type="primary"
              size="large"
              loading={submitting}
              onClick={handleSubmit}
            >
              Lancer la configuration
            </Button>
          )}
        </div>
      </Card>
    </div>
  );
};

export default SetupWizard;
