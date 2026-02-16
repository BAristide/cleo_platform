// src/components/crm/OpportunityList.js
import React, { useState, useEffect } from 'react';
import { Table, Button, Space, Input, Card, Tag, Typography, message, Popconfirm, Select } from 'antd';
import { 
  SearchOutlined, 
  PlusOutlined, 
  EditOutlined, 
  DeleteOutlined, 
  DollarOutlined 
} from '@ant-design/icons';
import { Link } from 'react-router-dom';
import axios from '../../utils/axiosConfig';
import { extractResultsFromResponse } from '../../utils/apiUtils';

const { Title, Text } = Typography;
const { Option } = Select;

const OpportunityList = () => {
  const [loading, setLoading] = useState(false);
  const [opportunities, setOpportunities] = useState([]);
  const [searchText, setSearchText] = useState('');
  const [stages, setStages] = useState([]);
  const [selectedStage, setSelectedStage] = useState(null);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0
  });

  useEffect(() => {
    fetchOpportunities();
    fetchStages();
  }, [pagination.current, pagination.pageSize, selectedStage]);

  const fetchStages = async () => {
    try {
      const response = await axios.get('/api/crm/sales-stages/');
      const data = extractResultsFromResponse(response);
      setStages(data);
    } catch (error) {
      console.error("Erreur lors de la récupération des étapes:", error);
      message.error("Impossible de charger les étapes de vente");
    }
  };

  const fetchOpportunities = async () => {
    setLoading(true);
    try {
      const params = {
        page: pagination.current,
        page_size: pagination.pageSize,
        search: searchText || undefined
      };
      
      if (selectedStage) {
        params.stage = selectedStage;
      }
      
      const response = await axios.get('/api/crm/opportunities/', { params });
      console.log('Opportunities API response:', response); // Pour déboguer
      
      // Utiliser l'utilitaire pour extraire les résultats
      const data = extractResultsFromResponse(response);
      
      // Mettre à jour la pagination avec les données de l'API
      if (response.data && response.data.count !== undefined) {
        setPagination({
          ...pagination,
          total: response.data.count
        });
      }
      
      setOpportunities(data);
    } catch (error) {
      console.error("Erreur lors de la récupération des opportunités:", error);
      message.error("Impossible de charger les opportunités");
      // Conserver les données de démonstration en cas d'erreur
      setOpportunities([
        {
          id: 1,
          name: 'Projet développement web',
          company_name: 'TechMaroc',
          stage_name: 'Qualification',
          stage_color: '#1890ff',
          amount: 50000,
          currency: 'MAD',
          probability: 10
        },
        {
          id: 2,
          name: 'Système gestion hospitalière',
          company_name: 'Santé Plus',
          stage_name: 'Proposition',
          stage_color: '#52c41a',
          amount: 120000,
          currency: 'MAD',
          probability: 30
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await axios.delete(`/api/crm/opportunities/${id}/`);
      message.success('Opportunité supprimée avec succès');
      fetchOpportunities();
    } catch (error) {
      console.error("Erreur lors de la suppression:", error);
      message.error("Impossible de supprimer l'opportunité");
    }
  };

  const handleTableChange = (pagination) => {
    setPagination(pagination);
  };

  const handleSearch = () => {
    setPagination({
      ...pagination,
      current: 1 // Réinitialiser à la première page lors d'une recherche
    });
    fetchOpportunities();
  };

  const resetSearch = () => {
    setSearchText('');
    setSelectedStage(null);
    setPagination({
      ...pagination,
      current: 1
    });
    fetchOpportunities();
  };

  const columns = [
    {
      title: 'Nom',
      dataIndex: 'name',
      key: 'name',
      render: (text, record) => (
        <Link to={`/crm/opportunities/${record.id}`}>{text}</Link>
      ),
      sorter: true
    },
    {
      title: 'Entreprise',
      dataIndex: 'company_name',
      key: 'company_name',
      sorter: true
    },
    {
      title: 'Étape',
      key: 'stage',
      render: (text, record) => (
        <Tag color={record.stage_color}>{record.stage_name}</Tag>
      ),
      filters: stages.map(stage => ({ text: stage.name, value: stage.id })),
      onFilter: (value, record) => record.stage_id === value
    },
    {
      title: 'Montant',
      key: 'amount',
      render: (text, record) => (
        `${record.amount ? record.amount.toLocaleString() : 0} ${record.currency || 'MAD'}`
      ),
      sorter: (a, b) => (a.amount || 0) - (b.amount || 0)
    },
    {
      title: 'Probabilité',
      dataIndex: 'probability',
      key: 'probability',
      render: (probability) => `${probability || 0}%`,
      sorter: (a, b) => (a.probability || 0) - (b.probability || 0)
    },
    {
      title: 'Date de clôture',
      dataIndex: 'expected_close_date',
      key: 'expected_close_date',
      sorter: true
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (text, record) => (
        <Space size="small">
          <Button size="small">
            <Link to={`/crm/opportunities/${record.id}`}>Détails</Link>
          </Button>
          <Button size="small" icon={<EditOutlined />}>
            <Link to={`/crm/opportunities/${record.id}/edit`}>Modifier</Link>
          </Button>
          <Popconfirm
            title="Êtes-vous sûr de vouloir supprimer cette opportunité?"
            onConfirm={() => handleDelete(record.id)}
            okText="Oui"
            cancelText="Non"
          >
            <Button size="small" danger icon={<DeleteOutlined />}>
              Supprimer
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div className="opportunity-list-container">
      <Card>
        <Title level={2}>Opportunités</Title>

        <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
          <Space>
            <Input
              placeholder="Rechercher une opportunité..."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              onPressEnter={handleSearch}
              prefix={<SearchOutlined />}
              style={{ width: 250 }}
            />
            <Select
              placeholder="Filtrer par étape"
              style={{ width: 180 }}
              allowClear
              value={selectedStage}
              onChange={setSelectedStage}
            >
              {stages.map(stage => (
                <Option key={stage.id} value={stage.id}>
                  <Tag color={stage.color}>{stage.name}</Tag>
                </Option>
              ))}
            </Select>
            <Button onClick={handleSearch} type="primary">Rechercher</Button>
            {(searchText || selectedStage) && <Button onClick={resetSearch}>Réinitialiser</Button>}
          </Space>

          <Button type="primary" icon={<PlusOutlined />}>
            <Link to="/crm/opportunities/new">Nouvelle Opportunité</Link>
          </Button>
        </div>

        <Table
          columns={columns}
          dataSource={opportunities}
          loading={loading}
          rowKey="id"
          pagination={pagination}
          onChange={handleTableChange}
          summary={pageData => {
            let totalAmount = 0;
            let weightedAmount = 0;
            
            pageData.forEach(({ amount, probability }) => {
              if (amount) {
                totalAmount += amount;
                weightedAmount += amount * (probability || 0) / 100;
              }
            });
            
            return (
              <>
                <Table.Summary.Row>
                  <Table.Summary.Cell index={0} colSpan={3}>Total</Table.Summary.Cell>
                  <Table.Summary.Cell index={1}>
                    <Text strong>{totalAmount.toLocaleString()} MAD</Text>
                  </Table.Summary.Cell>
                  <Table.Summary.Cell index={2} colSpan={3}></Table.Summary.Cell>
                </Table.Summary.Row>
                <Table.Summary.Row>
                  <Table.Summary.Cell index={0} colSpan={3}>Montant pondéré</Table.Summary.Cell>
                  <Table.Summary.Cell index={1}>
                    <Text type="success" strong>{weightedAmount.toLocaleString()} MAD</Text>
                  </Table.Summary.Cell>
                  <Table.Summary.Cell index={2} colSpan={3}></Table.Summary.Cell>
                </Table.Summary.Row>
              </>
            );
          }}
        />
      </Card>
    </div>
  );
};

export default OpportunityList;
