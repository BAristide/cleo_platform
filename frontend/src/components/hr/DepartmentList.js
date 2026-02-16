// src/components/hr/DepartmentList.js
import React, { useState, useEffect } from 'react';
import { Table, Card, Button, Space, Input, Typography, Tag, Spin, message, Popconfirm, Tree } from 'antd';
import { 
  SearchOutlined, 
  PlusOutlined, 
  EditOutlined, 
  DeleteOutlined,
  TeamOutlined,
  BranchesOutlined
} from '@ant-design/icons';
import { Link } from 'react-router-dom';
import axios from '../../utils/axiosConfig';
import { extractResultsFromResponse } from '../../utils/apiUtils';

const { Title } = Typography;

const DepartmentList = () => {
  const [loading, setLoading] = useState(true);
  const [departments, setDepartments] = useState([]);
  const [searchText, setSearchText] = useState('');
  const [showAsTree, setShowAsTree] = useState(false);
  const [treeData, setTreeData] = useState([]);

  useEffect(() => {
    fetchDepartments();
  }, []);

  const fetchDepartments = async () => {
    setLoading(true);
    try {
      const response = await axios.get('/api/hr/departments/');
      const data = extractResultsFromResponse(response);
      setDepartments(data);
      
      // Créer la structure pour l'affichage en arbre
      const treeStructure = buildTreeData(data);
      setTreeData(treeStructure);
      
      setLoading(false);
    } catch (error) {
      console.error("Erreur lors du chargement des départements:", error);
      message.error("Impossible de charger les départements");
      setLoading(false);
    }
  };

  // Fonction pour construire la structure de données pour le composant Tree
  const buildTreeData = (departments) => {
    // Convertir en objets pour le composant Tree
    const treeNodes = departments.map(dept => ({
      key: dept.id,
      title: (
        <Space>
          {dept.name}
          <Tag color="blue">{dept.employee_count} employés</Tag>
        </Space>
      ),
      parent: dept.parent,
      employee_count: dept.employee_count
    }));

    // Fonction récursive pour créer l'arbre
    const buildTree = (nodes, parent = null) => {
      return nodes
        .filter(node => node.parent === parent)
        .map(node => ({
          ...node,
          children: buildTree(nodes, node.key)
        }));
    };

    return buildTree(treeNodes);
  };

  const handleDelete = async (id) => {
    try {
      await axios.delete(`/api/hr/departments/${id}/`);
      message.success("Département supprimé avec succès");
      fetchDepartments();
    } catch (error) {
      console.error("Erreur lors de la suppression:", error);
      message.error("Impossible de supprimer le département. Vérifiez qu'il n'a pas d'employés ou de sous-départements.");
    }
  };

  const handleSearch = (e) => {
    setSearchText(e.target.value);
  };

  const filteredDepartments = departments.filter(dept => 
    dept.name.toLowerCase().includes(searchText.toLowerCase()) ||
    (dept.code && dept.code.toLowerCase().includes(searchText.toLowerCase()))
  );

  const columns = [
    {
      title: 'Nom',
      dataIndex: 'name',
      key: 'name',
      render: (text, record) => (
        <Link to={`/hr/departments/${record.id}`}>{text}</Link>
      ),
      sorter: (a, b) => a.name.localeCompare(b.name)
    },
    {
      title: 'Code',
      dataIndex: 'code',
      key: 'code',
    },
    {
      title: 'Département parent',
      dataIndex: 'parent_name',
      key: 'parent_name',
      render: (text, record) => text || "—",
    },
    {
      title: 'Nombre d\'employés',
      dataIndex: 'employee_count',
      key: 'employee_count',
      sorter: (a, b) => a.employee_count - b.employee_count,
      render: (count) => <Tag color="blue">{count}</Tag>
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (text, record) => (
        <Space size="small">
          <Button size="small" type="primary" icon={<EditOutlined />}>
            <Link to={`/hr/departments/${record.id}`}>Détails</Link>
          </Button>
          <Popconfirm
            title="Êtes-vous sûr de vouloir supprimer ce département ?"
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
    <div className="department-list">
      <Card>
        <Title level={2}>Départements</Title>

        <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
          <Space>
            <Input
              placeholder="Rechercher un département..."
              value={searchText}
              onChange={handleSearch}
              prefix={<SearchOutlined />}
              style={{ width: 250 }}
            />
            <Button 
              icon={showAsTree ? <TeamOutlined /> : <BranchesOutlined />} 
              onClick={() => setShowAsTree(!showAsTree)}
            >
              {showAsTree ? "Vue en liste" : "Vue en arbre"}
            </Button>
          </Space>

          <Button type="primary" icon={<PlusOutlined />}>
            <Link to="/hr/departments/new">Nouveau département</Link>
          </Button>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', margin: '20px 0' }}>
            <Spin size="large" />
          </div>
        ) : showAsTree ? (
          <div className="department-tree">
            <Tree
              showLine
              defaultExpandAll
              treeData={treeData}
            />
          </div>
        ) : (
          <Table
            columns={columns}
            dataSource={filteredDepartments}
            rowKey="id"
            pagination={{ pageSize: 10 }}
          />
        )}
      </Card>
    </div>
  );
};

export default DepartmentList;
