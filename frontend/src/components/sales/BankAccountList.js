// src/components/sales/BankAccountList.js
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Table, Button, Space, Typography, Card, Input, Select,
  Tag, Popconfirm, message, Row, Col, Modal, Form, Checkbox
} from 'antd';
import {
  SearchOutlined, EditOutlined, DeleteOutlined, PlusOutlined,
  BankOutlined, DollarOutlined, CheckCircleOutlined
} from '@ant-design/icons';
import axios from '../../utils/axiosConfig';
import { extractResultsFromResponse } from '../../utils/apiUtils';

const { Title } = Typography;
const { Option } = Select;

const BankAccountList = () => {
  const [bankAccounts, setBankAccounts] = useState([]);
  const [currencies, setCurrencies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState('');
  const [currencyFilter, setCurrencyFilter] = useState('all');
  const [actionLoading, setActionLoading] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [currentAccount, setCurrentAccount] = useState(null);
  const [form] = Form.useForm();
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0,
  });

  const navigate = useNavigate();

  useEffect(() => {
    fetchBankAccounts();
    fetchCurrencies();
  }, [currencyFilter, pagination.current, pagination.pageSize]);

  const fetchBankAccounts = async () => {
    setLoading(true);
    try {
      // Construire les paramètres de requête
      const params = {
        page: pagination.current,
        page_size: pagination.pageSize,
      };

      // Ajouter les filtres si définis
      if (currencyFilter && currencyFilter !== 'all') {
        params.currency = currencyFilter;
      }

      if (searchText) {
        params.search = searchText;
      }

      const response = await axios.get('/api/sales/bank-accounts/', { params });

      // Extraire les résultats avec l'utilitaire
      const accountsData = extractResultsFromResponse(response);

      // Mettre à jour la pagination avec la réponse
      if (response.data && response.data.count !== undefined) {
        setPagination({
          ...pagination,
          total: response.data.count,
        });
      }

      setBankAccounts(accountsData);
    } catch (error) {
      console.error('Erreur lors de la récupération des comptes bancaires:', error);
      message.error('Impossible de charger les comptes bancaires');
    } finally {
      setLoading(false);
    }
  };

  const fetchCurrencies = async () => {
    try {
      const response = await axios.get('/api/core/currencies/');
      const currenciesData = extractResultsFromResponse(response);
      setCurrencies(currenciesData);
    } catch (error) {
      console.error('Erreur lors de la récupération des devises:', error);
      message.error('Impossible de charger les devises');
    }
  };

  const handleSearch = () => {
    // Réinitialiser à la première page lors d'une recherche
    setPagination({
      ...pagination,
      current: 1,
    });
    fetchBankAccounts();
  };

  const resetFilters = () => {
    setSearchText('');
    setCurrencyFilter('all');
    setPagination({
      ...pagination,
      current: 1,
    });
    fetchBankAccounts();
  };

  const handleTableChange = (pagination, filters, sorter) => {
    setPagination(pagination);
  };

  const handleCurrencyChange = (value) => {
    setCurrencyFilter(value);
    setPagination({
      ...pagination,
      current: 1,
    });
  };

  const handleDeleteAccount = async (id) => {
    setActionLoading(true);
    try {
      await axios.delete(`/api/sales/bank-accounts/${id}/`);
      message.success('Compte bancaire supprimé avec succès');
      fetchBankAccounts();
    } catch (error) {
      console.error("Erreur lors de la suppression du compte bancaire:", error);
      message.error("Impossible de supprimer le compte bancaire. Ce compte est peut-être utilisé dans des documents de vente.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleSetDefault = async (id) => {
    setActionLoading(true);
    try {
      await axios.patch(`/api/sales/bank-accounts/${id}/`, { is_default: true });
      message.success('Compte bancaire défini comme compte par défaut');
      fetchBankAccounts();
    } catch (error) {
      console.error("Erreur lors de la définition du compte par défaut:", error);
      message.error("Impossible de définir ce compte comme compte par défaut");
    } finally {
      setActionLoading(false);
    }
  };

  const showEditModal = (account) => {
    setCurrentAccount(account);
    form.setFieldsValue({
      ...account
    });
    setEditModalVisible(true);
  };

  const showCreateModal = () => {
    setCurrentAccount(null);
    form.resetFields();
    form.setFieldsValue({
      is_default: false
    });
    setEditModalVisible(true);
  };

  const handleFormSubmit = async (values) => {
    setActionLoading(true);
    try {
      if (currentAccount) {
        // Mise à jour d'un compte existant
        await axios.put(`/api/sales/bank-accounts/${currentAccount.id}/`, values);
        message.success('Compte bancaire mis à jour avec succès');
      } else {
        // Création d'un nouveau compte
        await axios.post('/api/sales/bank-accounts/', values);
        message.success('Compte bancaire créé avec succès');
      }
      setEditModalVisible(false);
      fetchBankAccounts();
    } catch (error) {
      console.error("Erreur lors de l'enregistrement du compte bancaire:", error);
      message.error("Impossible d'enregistrer le compte bancaire");
    } finally {
      setActionLoading(false);
    }
  };

  const getCurrencyName = (currencyId) => {
    const currency = currencies.find(c => c.id === currencyId);
    return currency ? currency.code : '';
  };

  const columns = [
    {
      title: 'Nom',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: 'Banque',
      dataIndex: 'bank_name',
      key: 'bank_name',
    },
    {
      title: 'RIB',
      dataIndex: 'rib',
      key: 'rib',
    },
    {
      title: 'IBAN',
      dataIndex: 'iban',
      key: 'iban',
      render: text => text || '-',
    },
    {
      title: 'SWIFT/BIC',
      dataIndex: 'swift',
      key: 'swift',
      render: text => text || '-',
    },
    {
      title: 'Devise',
      dataIndex: 'currency',
      key: 'currency',
      render: (currencyId) => {
        const currency = currencies.find(c => c.id === currencyId);
        return currency ? (
          <Tag color="blue">{currency.code}</Tag>
        ) : '-';
      },
    },
    {
      title: 'Par défaut',
      dataIndex: 'is_default',
      key: 'is_default',
      render: (isDefault) => isDefault ? (
        <Tag color="green" icon={<CheckCircleOutlined />}>Par défaut</Tag>
      ) : '-',
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Space size="small">
          <Button
            size="small"
            icon={<EditOutlined />}
            onClick={() => showEditModal(record)}
          />
          {!record.is_default && (
            <Button
              size="small"
              type="primary"
              icon={<CheckCircleOutlined />}
              onClick={() => handleSetDefault(record.id)}
              loading={actionLoading}
            >
              Définir par défaut
            </Button>
          )}
          <Popconfirm
            title="Êtes-vous sûr de vouloir supprimer ce compte bancaire?"
            description="Cette action ne peut pas être annulée."
            onConfirm={() => handleDeleteAccount(record.id)}
            okText="Oui"
            cancelText="Non"
          >
            <Button
              size="small"
              danger
              icon={<DeleteOutlined />}
              loading={actionLoading}
            />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div className="bank-account-list-container">
      <Card>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
          <Title level={2}>Comptes bancaires</Title>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={showCreateModal}
          >
            Nouveau compte
          </Button>
        </div>

        {/* Filtres */}
        <div style={{ marginBottom: 16 }}>
          <Row gutter={16}>
            <Col span={16}>
              <Input
                placeholder="Rechercher par nom, banque ou RIB"
                value={searchText}
                onChange={e => setSearchText(e.target.value)}
                onPressEnter={handleSearch}
                prefix={<SearchOutlined />}
              />
            </Col>
            <Col span={8}>
              <Space>
                <Select
                  placeholder="Filtrer par devise"
                  style={{ width: 150 }}
                  value={currencyFilter}
                  onChange={handleCurrencyChange}
                >
                  <Option value="all">Toutes les devises</Option>
                  {currencies.map(currency => (
                    <Option key={currency.id} value={currency.id}>{currency.code}</Option>
                  ))}
                </Select>
                <Button onClick={handleSearch} type="primary">Rechercher</Button>
                {(searchText || currencyFilter !== 'all') && (
                  <Button onClick={resetFilters}>Réinitialiser</Button>
                )}
              </Space>
            </Col>
          </Row>
        </div>

        {/* Tableau des comptes bancaires */}
        <Table
          columns={columns}
          dataSource={bankAccounts}
          rowKey="id"
          loading={loading}
          pagination={pagination}
          onChange={handleTableChange}
          locale={{ emptyText: 'Aucun compte bancaire trouvé' }}
        />
      </Card>

      {/* Modal pour créer/éditer un compte bancaire */}
      <Modal
        title={currentAccount ? 'Modifier le compte bancaire' : 'Nouveau compte bancaire'}
        visible={editModalVisible}
        onCancel={() => setEditModalVisible(false)}
        footer={null}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleFormSubmit}
        >
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="name"
                label="Nom"
                rules={[{ required: true, message: 'Veuillez saisir le nom du compte' }]}
              >
                <Input prefix={<BankOutlined />} placeholder="Compte principal" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="bank_name"
                label="Nom de la banque"
                rules={[{ required: true, message: 'Veuillez saisir le nom de la banque' }]}
              >
                <Input placeholder="Banque du Maroc" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="currency"
            label="Devise"
            rules={[{ required: true, message: 'Veuillez sélectionner une devise' }]}
          >
            <Select placeholder="Sélectionner une devise">
              {currencies.map(currency => (
                <Option key={currency.id} value={currency.id}>
                  <Space>
                    <DollarOutlined />
                    {currency.code} - {currency.name}
                  </Space>
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="rib"
            label="RIB"
            rules={[{ required: true, message: 'Veuillez saisir le RIB' }]}
          >
            <Input placeholder="000123456789" />
          </Form.Item>

          <Form.Item
            name="iban"
            label="IBAN"
          >
            <Input placeholder="FR76 0000 0000 0000 0000 0000 000" />
          </Form.Item>

          <Form.Item
            name="swift"
            label="Code SWIFT/BIC"
          >
            <Input placeholder="ABCDEFGH" />
          </Form.Item>

          <Form.Item
            name="is_default"
            valuePropName="checked"
          >
            <Checkbox>Définir comme compte par défaut pour cette devise</Checkbox>
          </Form.Item>

          <Form.Item>
            <div style={{ textAlign: 'right' }}>
              <Button onClick={() => setEditModalVisible(false)} style={{ marginRight: 8 }}>
                Annuler
              </Button>
              <Button type="primary" htmlType="submit" loading={actionLoading}>
                {currentAccount ? 'Mettre à jour' : 'Créer'}
              </Button>
            </div>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default BankAccountList;
