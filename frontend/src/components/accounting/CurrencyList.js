import React, { useState, useEffect, useCallback } from 'react';
import {
  Table, Button, Modal, Form, Input, InputNumber,
  Switch, Space, Card, message, Popconfirm, Tag, Select,
  Alert, Tooltip, Typography
} from 'antd';
import {
  PlusOutlined, EditOutlined, DeleteOutlined,
  DollarOutlined, CheckCircleOutlined, LockOutlined,
  InfoCircleOutlined
} from '@ant-design/icons';
import axiosInstance from '../../utils/axiosConfig';
import { useCurrency } from '../../context/CurrencyContext';

const { Text } = Typography;

const CurrencyList = () => {
  const [currencies, setCurrencies] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingCurrency, setEditingCurrency] = useState(null);
  const [form] = Form.useForm();
  const { defaultCurrency, isLocked, refreshCurrency } = useCurrency();

  const fetchCurrencies = useCallback(async () => {
    setLoading(true);
    try {
      const response = await axiosInstance.get('/api/core/currencies/');
      const data = response.data;
      setCurrencies(Array.isArray(data) ? data : data.results || []);
    } catch (error) {
      message.error('Erreur lors du chargement des devises');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCurrencies();
  }, [fetchCurrencies]);

  const handleAdd = () => {
    setEditingCurrency(null);
    form.resetFields();
    form.setFieldsValue({
      decimal_places: 2,
      decimal_separator: '.',
      thousand_separator: ',',
      symbol_position: 'after',
      exchange_rate: 1.0,
      is_default: false,
    });
    setModalVisible(true);
  };

  const handleEdit = (record) => {
    setEditingCurrency(record);
    form.setFieldsValue(record);
    setModalVisible(true);
  };

  const handleDelete = async (id) => {
    try {
      await axiosInstance.delete(`/api/core/currencies/${id}/`);
      message.success('Devise supprimée');
      fetchCurrencies();
    } catch (error) {
      const detail = error.response?.data?.detail || error.response?.data;
      if (typeof detail === 'string' && detail.includes('protect')) {
        message.error('Impossible de supprimer : cette devise est utilisée par des documents');
      } else {
        message.error('Erreur lors de la suppression');
      }
    }
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();

      // Si on active is_default sur une devise qui ne l'est pas, demander confirmation
      if (values.is_default && editingCurrency && !editingCurrency.is_default) {
        Modal.confirm({
          title: 'Changer la devise par défaut ?',
          content: (
            <div>
              <p>Vous êtes sur le point de définir <strong>{editingCurrency.code}</strong> comme devise par défaut.</p>
              <p>Ce choix affecte :</p>
              <ul>
                <li>Les taux de change (la devise par défaut a un taux de 1.0)</li>
                <li>L'exonération TVA automatique sur les devises étrangères</li>
                <li>L'affichage des montants dans toutes les interfaces</li>
              </ul>
              <p><strong>Cette action sera irréversible une fois des documents commerciaux créés.</strong></p>
            </div>
          ),
          okText: 'Confirmer le changement',
          cancelText: 'Annuler',
          onOk: () => submitForm(values),
        });
        return;
      }

      await submitForm(values);
    } catch (error) {
      if (!error.errorFields) {
        message.error('Erreur de validation');
      }
    }
  };

  const submitForm = async (values) => {
    try {
      if (editingCurrency) {
        await axiosInstance.put(`/api/core/currencies/${editingCurrency.id}/`, values);
        message.success('Devise mise à jour');
      } else {
        await axiosInstance.post('/api/core/currencies/', values);
        message.success('Devise créée');
      }
      setModalVisible(false);
      fetchCurrencies();
      refreshCurrency();
    } catch (error) {
      if (error.response?.data) {
        const errors = error.response.data;
        if (errors.error) {
          message.error(errors.error);
        } else {
          const msgs = Object.entries(errors)
            .map(([field, errs]) => `${field}: ${Array.isArray(errs) ? errs.join(', ') : errs}`)
            .join(' | ');
          message.error(msgs);
        }
      } else {
        message.error('Erreur lors de la sauvegarde');
      }
    }
  };

  const columns = [
    {
      title: 'Code',
      dataIndex: 'code',
      key: 'code',
      width: 80,
      render: (text, record) => (
        <Space>
          <Tag color={record.is_default ? 'green' : 'blue'} style={{ fontWeight: 'bold' }}>{text}</Tag>
          {record.is_default && isLocked && (
            <Tooltip title="Devise verrouillée — des documents commerciaux existent">
              <LockOutlined style={{ color: '#faad14' }} />
            </Tooltip>
          )}
        </Space>
      ),
    },
    {
      title: 'Nom',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: 'Symbole',
      dataIndex: 'symbol',
      key: 'symbol',
      width: 80,
      align: 'center',
    },
    {
      title: 'Taux de change',
      dataIndex: 'exchange_rate',
      key: 'exchange_rate',
      width: 140,
      align: 'right',
      render: (val) => parseFloat(val).toFixed(6),
    },
    {
      title: 'Par défaut',
      dataIndex: 'is_default',
      key: 'is_default',
      width: 100,
      align: 'center',
      render: (val) => val ? <CheckCircleOutlined style={{ color: '#52c41a', fontSize: 18 }} /> : null,
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 120,
      align: 'center',
      render: (_, record) => (
        <Space>
          <Button
            type="link"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
          />
          {record.is_default ? (
            <Tooltip title="La devise par défaut ne peut pas être supprimée">
              <Button
                type="link"
                danger
                icon={<DeleteOutlined />}
                disabled
              />
            </Tooltip>
          ) : (
            <Popconfirm
              title="Supprimer cette devise ?"
              description="Cette action est irréversible."
              onConfirm={() => handleDelete(record.id)}
              okText="Supprimer"
              cancelText="Annuler"
              okButtonProps={{ danger: true }}
            >
              <Button
                type="link"
                danger
                icon={<DeleteOutlined />}
              />
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div>
      {defaultCurrency && isLocked && (
        <Alert
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
          message={`Devise par défaut : ${defaultCurrency.code} — ${defaultCurrency.name}`}
          description="La devise par défaut est verrouillée car des documents commerciaux existent. Contactez un administrateur système pour la modifier."
        />
      )}

      <Card
        title={
          <Space>
            <DollarOutlined />
            <span>Gestion des devises</span>
          </Space>
        }
        extra={
          <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
            Nouvelle devise
          </Button>
        }
      >
        <Table
          columns={columns}
          dataSource={currencies}
          rowKey="id"
          loading={loading}
          pagination={false}
          size="middle"
        />
      </Card>

      <Modal
        title={editingCurrency ? 'Modifier la devise' : 'Nouvelle devise'}
        open={modalVisible}
        onOk={handleSubmit}
        onCancel={() => setModalVisible(false)}
        okText={editingCurrency ? 'Modifier' : 'Créer'}
        cancelText="Annuler"
        width={500}
      >
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item
            name="code"
            label="Code ISO"
            rules={[
              { required: true, message: 'Code requis' },
              { max: 3, message: '3 caractères maximum' },
            ]}
          >
            <Input
              placeholder="Ex: XOF, EUR, USD"
              maxLength={3}
              style={{ textTransform: 'uppercase' }}
              disabled={!!editingCurrency}
            />
          </Form.Item>
          <Form.Item
            name="name"
            label="Nom"
            rules={[{ required: true, message: 'Nom requis' }]}
          >
            <Input placeholder="Ex: Franc CFA, Euro, Dollar" />
          </Form.Item>
          <Form.Item
            name="symbol"
            label="Symbole"
          >
            <Input placeholder="Ex: F CFA, €, $" maxLength={5} />
          </Form.Item>
          <Form.Item
            name="exchange_rate"
            label="Taux de change (vs devise par défaut)"
            rules={[{ required: true, message: 'Taux requis' }]}
          >
            <InputNumber min={0} step={0.000001} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item
            name="decimal_places"
            label="Décimales"
          >
            <InputNumber min={0} max={6} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item
            name="symbol_position"
            label="Position du symbole"
          >
            <Select>
              <Select.Option value="before">Avant le montant</Select.Option>
              <Select.Option value="after">Après le montant</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item
            name="decimal_separator"
            label="Séparateur décimal"
          >
            <Input maxLength={1} style={{ width: 60 }} />
          </Form.Item>
          <Form.Item
            name="thousand_separator"
            label={
              <Space>
                <span>Séparateur de milliers</span>
                <Tooltip title="Laissez vide pour aucun séparateur, ou saisissez un espace pour les formats francophones (ex: 1 234 567)">
                  <InfoCircleOutlined style={{ color: '#1890ff' }} />
                </Tooltip>
              </Space>
            }
            extra={<Text type="secondary" style={{ fontSize: 12 }}>Virgule, point, espace ou vide</Text>}
          >
            <Input maxLength={1} style={{ width: 60 }} placeholder=" " />
          </Form.Item>
          <Form.Item
            name="is_default"
            label="Devise par défaut"
            valuePropName="checked"
          >
            <Switch
              disabled={isLocked && editingCurrency && !editingCurrency.is_default}
              checkedChildren="Oui"
              unCheckedChildren="Non"
            />
          </Form.Item>
          {isLocked && editingCurrency && !editingCurrency.is_default && (
            <Alert
              type="warning"
              showIcon
              message="Le changement de devise par défaut est verrouillé car des documents commerciaux existent."
              style={{ marginTop: -8 }}
            />
          )}
        </Form>
      </Modal>
    </div>
  );
};

export default CurrencyList;
