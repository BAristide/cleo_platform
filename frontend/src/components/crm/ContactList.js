// src/components/crm/ContactList.js
import React, { useState, useEffect } from 'react';
import { Table, Button, Space, Input, Card, Tag, Typography, message, Tooltip, Popconfirm } from 'antd';
import { 
  SearchOutlined, 
  PlusOutlined, 
  EditOutlined, 
  DeleteOutlined, 
  UserOutlined,
  MailOutlined,
  PhoneOutlined 
} from '@ant-design/icons';
import { Link } from 'react-router-dom';
import axios from '../../utils/axiosConfig';
import { extractResultsFromResponse } from '../../utils/apiUtils';

const { Title } = Typography;

const ContactList = () => {
  const [loading, setLoading] = useState(false);
  const [contacts, setContacts] = useState([]);
  const [searchText, setSearchText] = useState('');
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0
  });

  useEffect(() => {
    fetchContacts();
  }, [pagination.current, pagination.pageSize]);

  const fetchContacts = async () => {
    setLoading(true);
    try {
      const response = await axios.get('/api/crm/contacts/', {
        params: {
          page: pagination.current,
          page_size: pagination.pageSize,
          search: searchText || undefined
        }
      });
      
      console.log('Contacts API response:', response); // Pour déboguer
      
      // Utiliser l'utilitaire pour extraire les résultats
      const data = extractResultsFromResponse(response);
      
      // Mettre à jour la pagination avec les données de l'API
      if (response.data && response.data.count !== undefined) {
        setPagination({
          ...pagination,
          total: response.data.count
        });
      }
      
      setContacts(data);
    } catch (error) {
      console.error("Erreur lors de la récupération des contacts:", error);
      message.error("Impossible de charger les contacts");
      // Données de démonstration en cas d'erreur
      setContacts([
        {
          id: 1,
          first_name: 'Ahmed',
          last_name: 'Bennani',
          email: 'ahmed.bennani@example.com',
          phone: '+212 6 12 34 56 78',
          company_name: 'TechMaroc',
          title: 'Directeur Commercial',
          source: 'website'
        },
        {
          id: 2,
          first_name: 'Sara',
          last_name: 'Alaoui',
          email: 'sara.alaoui@example.com',
          phone: '+212 6 98 76 54 32',
          company_name: 'Santé Plus',
          title: 'Chef de Projet',
          source: 'referral'
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await axios.delete(`/api/crm/contacts/${id}/`);
      message.success('Contact supprimé avec succès');
      fetchContacts();
    } catch (error) {
      console.error("Erreur lors de la suppression:", error);
      message.error("Impossible de supprimer le contact");
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
    fetchContacts();
  };

  const resetSearch = () => {
    setSearchText('');
    setPagination({
      ...pagination,
      current: 1
    });
    fetchContacts();
  };

  const columns = [
    {
      title: 'Nom',
      key: 'name',
      render: (text, record) => (
        <Link to={`/crm/contacts/${record.id}`}>
          {record.first_name} {record.last_name}
        </Link>
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
      title: 'Fonction',
      dataIndex: 'title',
      key: 'title'
    },
    {
      title: 'Contact',
      key: 'contact',
      render: (text, record) => (
        <Space>
          {record.email && (
            <Tooltip title={record.email}>
              <a href={`mailto:${record.email}`}>
                <MailOutlined />
              </a>
            </Tooltip>
          )}
          {record.phone && (
            <Tooltip title={record.phone}>
              <a href={`tel:${record.phone}`}>
                <PhoneOutlined />
              </a>
            </Tooltip>
          )}
        </Space>
      )
    },
    {
      title: 'Source',
      dataIndex: 'source',
      key: 'source',
      render: (source) => {
        const sourceMap = {
          'website': { color: 'blue', text: 'Site Web' },
          'referral': { color: 'green', text: 'Référence' },
          'cold_call': { color: 'orange', text: 'Appel à froid' },
          'social': { color: 'purple', text: 'Réseaux Sociaux' },
          'email': { color: 'cyan', text: 'Email' },
          'chatbot': { color: 'magenta', text: 'Chatbot IA' },
          'event': { color: 'gold', text: 'Événement' },
          'other': { color: 'gray', text: 'Autre' },
        };
        return (
          <Tag color={sourceMap[source]?.color || 'default'}>
            {sourceMap[source]?.text || source}
          </Tag>
        );
      },
      filters: [
        { text: 'Site Web', value: 'website' },
        { text: 'Référence', value: 'referral' },
        { text: 'Appel à froid', value: 'cold_call' },
        { text: 'Réseaux Sociaux', value: 'social' },
        { text: 'Email', value: 'email' },
        { text: 'Chatbot IA', value: 'chatbot' },
        { text: 'Événement', value: 'event' },
        { text: 'Autre', value: 'other' },
      ]
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (text, record) => (
        <Space size="small">
          <Button size="small" icon={<EditOutlined />}>
            <Link to={`/crm/contacts/${record.id}/edit`}>Modifier</Link>
          </Button>
          <Popconfirm
            title="Êtes-vous sûr de vouloir supprimer ce contact?"
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
    <div className="contact-list-container">
      <Card>
        <Title level={2}>Contacts</Title>

        <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
          <Space>
            <Input
              placeholder="Rechercher un contact..."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              onPressEnter={handleSearch}
              prefix={<SearchOutlined />}
              style={{ width: 300 }}
            />
            <Button onClick={handleSearch} type="primary">Rechercher</Button>
            {searchText && <Button onClick={resetSearch}>Réinitialiser</Button>}
          </Space>

          <Button type="primary" icon={<PlusOutlined />}>
            <Link to="/crm/contacts/new">Nouveau Contact</Link>
          </Button>
        </div>

        <Table
          columns={columns}
          dataSource={contacts}
          loading={loading}
          rowKey="id"
          pagination={pagination}
          onChange={handleTableChange}
        />
      </Card>
    </div>
  );
};

export default ContactList;
