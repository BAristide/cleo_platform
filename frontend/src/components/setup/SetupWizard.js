import React, { useState, useEffect } from 'react';
import { Steps, Button, Card, Radio, Input, Form, Space, Typography, Alert, Spin, Result, Divider, Tag, Row, Col, message } from 'antd';
import { GlobalOutlined, BankOutlined, CheckCircleOutlined, ArrowRightOutlined, ArrowLeftOutlined, SettingOutlined, LockOutlined } from '@ant-design/icons';
import axios from '../../utils/axiosConfig';

const { Title, Text, Paragraph } = Typography;
const { Step } = Steps;

/* Couleurs par pack comptable — appliquées à tous les pays du même pack */
const ACCOUNTING_PACK_COLORS = {
  OHADA: '#00804a',
  MA: '#c1272d',
  FR: '#003399',
};

const SetupWizard = () => {
  const [current, setCurrent] = useState(0);
  const [countries, setCountries] = useState([]);
  const [selectedCountry, setSelectedCountry] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [setupDone, setSetupDone] = useState(false);
  const [setupResult, setSetupResult] = useState(null);
  const [installDemo, setInstallDemo] = useState(false);
  const [form] = Form.useForm();

  /* ── Phase 4 SaaS : données pré-remplies ────────────────────
     Si le tenant est provisionné via le portail SaaS, l'entrypoint
     passe COMPANY_NAME, DEFAULT_COUNTRY et ADMIN_EMAIL.
     L'endpoint /api/core/setup/status/ les expose au frontend.
     Rétrocompatible : si aucune donnée prefill, wizard normal. */
  const [prefill, setPrefill] = useState(null);
  const [countryLocked, setCountryLocked] = useState(false);

  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        // 1. Charger les pays disponibles
        const packsRes = await axios.get('/api/core/setup/packs/');
        setCountries(packsRes.data);

        // 2. Tenter de récupérer les données pré-remplies (SaaS)
        try {
          const statusRes = await axios.get('/api/core/setup/status/');
          const data = statusRes.data;

          // Extraire les données prefill si disponibles
          const prefillData = data.prefill || data;
          const prefillCountry = prefillData.country_code || prefillData.default_country || null;
          const prefillCompany = prefillData.company_name || null;
          const prefillEmail = prefillData.admin_email || null;

          if (prefillCountry || prefillCompany) {
            setPrefill({ country_code: prefillCountry, company_name: prefillCompany, email: prefillEmail });

            // Pré-sélectionner le pays
            if (prefillCountry) {
              const validCountry = packsRes.data.find(c => c.code === prefillCountry);
              if (validCountry) {
                setSelectedCountry(prefillCountry);
                setCountryLocked(true);
              }
            }

            // Pré-remplir le formulaire entreprise
            const formValues = {};
            if (prefillCompany) formValues.company_name = prefillCompany;
            if (prefillEmail) formValues.email = prefillEmail;
            if (Object.keys(formValues).length > 0) {
              form.setFieldsValue(formValues);
            }
          }
        } catch (statusErr) {
          // Endpoint non disponible ou pas de données prefill — mode self-hosted normal
        }
      } catch (err) {
        message.error('Impossible de charger la liste des pays');
      } finally {
        setLoading(false);
      }
    };
    fetchInitialData();
  }, [form]);

  useEffect(() => {
    if (selectedCountry) {
      const country = countries.find(c => c.code === selectedCountry);
      if (country) {
        const labels = {};
        country.legal_id_labels.forEach((label, i) => {
          labels[`legal_id_${i + 1}_label`] = label;
        });
        labels.country = country.country_name || country.name || '';
        form.setFieldsValue(labels);
      }
    }
  }, [selectedCountry, countries, form]);

  const handleSubmit = async () => {
    try {
      const values = form.getFieldsValue(true);
      setSubmitting(true);

      let website = (values.website || '').trim();
      if (website && !/^https?:\/\//i.test(website)) {
        website = 'https://' + website;
      }

      const payload = {
        country_code: selectedCountry,
        company_name: values.company_name,
        address_line1: values.address_line1 || '',
        address_line2: values.address_line2 || '',
        city: values.city || '',
        postal_code: values.postal_code || '',
        country: values.country || '',
        phone: values.phone || '',
        email: values.email || '',
        website: website,
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
      const data = err.response?.data;
      if (err.response?.status === 400 && data && typeof data === 'object') {
        const fieldErrors = [];
        const fieldLabels = {
          email: 'Email', website: 'Site web', company_name: 'Raison sociale',
          phone: 'Téléphone', city: 'Ville', postal_code: 'Code postal',
        };
        Object.entries(data).forEach(([field, errors]) => {
          if (field === 'error' || field === 'detail') return;
          const msgs = Array.isArray(errors) ? errors : [errors];
          fieldErrors.push({
            name: field,
            errors: msgs.map(m => fieldLabels[field] ? fieldLabels[field] + ' : ' + m : m),
          });
        });
        if (fieldErrors.length > 0) {
          form.setFields(fieldErrors);
          setCurrent(1);
          message.error('Veuillez corriger les erreurs dans le formulaire');
          setSubmitting(false);
          return;
        }
      }
      const errMsg = data?.error || data?.detail || 'Erreur lors de la configuration';
      message.error(errMsg);
    } finally {
      setSubmitting(false);
    }
  };

  const next = () => {
    if (current === 0 && !selectedCountry) {
      message.warning('Veuillez sélectionner un pays');
      return;
    }
    if (current === 1) {
      form.validateFields(['company_name', 'email', 'website']).then(() => {
        setCurrent(current + 1);
      }).catch(() => {});
      return;
    }
    setCurrent(current + 1);
  };

  const prev = () => setCurrent(current - 1);

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

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f5f6f8' }}>
        <Spin size="large" />
      </div>
    );
  }

  const countryInfo = countries.find(c => c.code === selectedCountry);
  const packColor = countryInfo ? (ACCOUNTING_PACK_COLORS[countryInfo.accounting_pack] || '#1890ff') : '#1890ff';

  const steps = [
    {
      title: 'Pays',
      icon: <GlobalOutlined />,
      content: (
        <div>
          <Title level={4} style={{ marginBottom: 8 }}>Pays de localisation</Title>
          <Paragraph type="secondary" style={{ marginBottom: 24 }}>
            Détermine le plan comptable, les taxes, la paie, la devise et les identifiants légaux applicables.
          </Paragraph>

          {/* Phase 4 SaaS : indicateur pays verrouillé */}
          {countryLocked && (
            <Alert
              type="info"
              showIcon
              icon={<LockOutlined />}
              message="Pays pré-configuré par votre abonnement SaaS"
              description={`Le pays ${countryInfo?.name || selectedCountry} a été sélectionné lors de votre inscription. Ce choix n'est pas modifiable.`}
              style={{ marginBottom: 16 }}
            />
          )}

          <Radio.Group
            value={selectedCountry}
            onChange={e => { if (!countryLocked) setSelectedCountry(e.target.value); }}
            style={{ width: '100%' }}
            disabled={countryLocked}
          >
            <Space direction="vertical" style={{ width: '100%' }} size={12}>
              {countries.map(country => {
                const color = ACCOUNTING_PACK_COLORS[country.accounting_pack] || '#1890ff';
                const isSelected = selectedCountry === country.code;
                return (
                  <Radio.Button
                    key={country.code}
                    value={country.code}
                    disabled={countryLocked && country.code !== selectedCountry}
                    style={{
                      width: '100%',
                      height: 'auto',
                      padding: '14px 20px',
                      borderRadius: 6,
                      borderColor: isSelected ? color : '#e0e0e0',
                      borderWidth: isSelected ? 2 : 1,
                      background: isSelected ? `${color}06` : '#fff',
                      opacity: countryLocked && !isSelected ? 0.4 : 1,
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 15, color: isSelected ? color : '#262626' }}>{country.name}</div>
                        <div style={{ color: '#8c8c8c', fontSize: 13, marginTop: 2 }}>
                          {country.chart_of_accounts} — {country.default_currency}
                        </div>
                        <div style={{ color: '#bfbfbf', fontSize: 12, marginTop: 2 }}>
                          {country.taxes_summary}
                        </div>
                      </div>
                      <Tag color={isSelected ? color : 'default'} style={{ fontWeight: 600, fontSize: 13, margin: 0 }}>
                        {country.code}
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

          {/* Phase 4 SaaS : indicateur données pré-remplies */}
          {prefill && (
            <Alert
              type="success"
              showIcon
              message="Certains champs ont été pré-remplis depuis votre inscription"
              style={{ marginBottom: 16 }}
            />
          )}

          <Form form={form} layout="vertical" requiredMark="optional" preserve={true}>
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
                  <Input disabled style={{ color: '#262626', fontWeight: 500 }} />
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
                <Form.Item name="email" label="Email" rules={[{ type: 'email', message: 'Adresse email invalide' }]}>
                  <Input placeholder="contact@exemple.com" />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item name="website" label="Site web" rules={[{ pattern: /^(https?:\/\/)?[\w.-]+\.[a-z]{2,}(\/.*)?$/i, message: 'Format invalide (ex: www.exemple.com)' }]}>
                  <Input placeholder="www.exemple.com" />
                </Form.Item>
              </Col>
            </Row>

            <Divider orientation="left" plain style={{ fontSize: 13 }}>Identifiants légaux — {countryInfo?.name || ''}</Divider>

            {(countryInfo?.legal_id_labels || []).map((label, i) => (
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
                <Text type="secondary" style={{ fontSize: 12 }}>Pays</Text>
                <div style={{ fontSize: 15, fontWeight: 600 }}>{countryInfo?.name}</div>
              </Col>
              <Col span={12}>
                <Text type="secondary" style={{ fontSize: 12 }}>Devise par défaut</Text>
                <div style={{ fontSize: 15, fontWeight: 600 }}>{countryInfo?.default_currency}</div>
              </Col>
            </Row>
            <Row gutter={16} style={{ marginTop: 12 }}>
              <Col span={12}>
                <Text type="secondary" style={{ fontSize: 12 }}>Plan comptable</Text>
                <div style={{ fontSize: 13 }}>{countryInfo?.chart_of_accounts}</div>
              </Col>
              <Col span={12}>
                <Text type="secondary" style={{ fontSize: 12 }}>Taxes</Text>
                <div style={{ fontSize: 13 }}>{countryInfo?.taxes_summary}</div>
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
            message="Le pays de localisation ne pourra plus être modifié après la première écriture comptable."
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
