// src/components/accounting/AssetDetail.js
import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  Card,
  Descriptions,
  Button,
  Table,
  Tag,
  Typography,
  Space,
  Row,
  Col,
  Spin,
  Alert,
  Divider,
  Progress,
  Statistic,
  Popconfirm,
  Modal,
  message,
  Steps,
  Timeline
} from 'antd';
import {
  EditOutlined,
  DeleteOutlined,
  CalculatorOutlined,
  CheckCircleOutlined,
  BuildOutlined,
  ToolOutlined,
  DollarOutlined,
  ArrowRightOutlined,
  ExclamationCircleOutlined,
  ClockCircleOutlined
} from '@ant-design/icons';
import axios from '../../utils/axiosConfig';
import { extractResultsFromResponse } from '../../utils/apiUtils';
import moment from 'moment';

const { Title, Text } = Typography;
const { Step } = Steps;
const { confirm } = Modal;

const AssetDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [computingDepreciation, setComputingDepreciation] = useState(false);
  const [postingDepreciation, setPostingDepreciation] = useState(false);
  const [error, setError] = useState(null);
  const [asset, setAsset] = useState(null);
  const [depreciations, setDepreciations] = useState([]);

  useEffect(() => {
    fetchAssetDetails();
  }, [id]);

  const fetchAssetDetails = async () => {
    setLoading(true);
    setError(null);

    try {
      const [assetResponse, depreciationsResponse] = await Promise.all([
        axios.get(`/api/accounting/assets/${id}/`),
        axios.get('/api/accounting/asset-depreciations/', { params: { asset_id: id } })
      ]);

      const assetData = assetResponse.data;
      const depreciationsData = extractResultsFromResponse(depreciationsResponse);

      setAsset(assetData);
      setDepreciations(depreciationsData);
    } catch (error) {
      console.error('Erreur lors de la récupération des détails de l\'immobilisation:', error);
      setError('Impossible de charger les détails de l\'immobilisation. Veuillez réessayer plus tard.');
      
      // If API fails, use demo data
      if (demoAssets[id - 1]) {
        setAsset(demoAssets[id - 1]);
        setDepreciations(demoAssetDepreciations.filter(d => d.asset_id === parseInt(id)));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAsset = async () => {
    confirm({
      title: 'Êtes-vous sûr de vouloir supprimer cette immobilisation?',
      icon: <ExclamationCircleOutlined />,
      content: 'Cette action est irréversible.',
      okText: 'Oui',
      okType: 'danger',
      cancelText: 'Non',
      onOk: async () => {
        try {
          await axios.delete(`/api/accounting/assets/${id}/`);
          message.success('Immobilisation supprimée avec succès.');
          navigate('/accounting/assets');
        } catch (error) {
          console.error('Erreur lors de la suppression de l\'immobilisation:', error);
          message.error('Erreur lors de la suppression de l\'immobilisation. Veuillez réessayer.');
        }
      },
    });
  };

  const handleComputeDepreciation = async () => {
    setComputingDepreciation(true);
    try {
      await axios.post(`/api/accounting/assets/${id}/compute_depreciation/`);
      message.success('Tableau d\'amortissement calculé avec succès.');
      fetchAssetDetails();
    } catch (error) {
      console.error('Erreur lors du calcul du tableau d\'amortissement:', error);
      message.error('Erreur lors du calcul du tableau d\'amortissement. Veuillez réessayer.');
    } finally {
      setComputingDepreciation(false);
    }
  };

  const handlePostDepreciation = async (depreciationId) => {
    setPostingDepreciation(true);
    try {
      await axios.post(`/api/accounting/asset-depreciations/${depreciationId}/post/`);
      message.success('Dotation comptabilisée avec succès.');
      fetchAssetDetails();
    } catch (error) {
      console.error('Erreur lors de la comptabilisation de la dotation:', error);
      message.error('Erreur lors de la comptabilisation de la dotation. Veuillez réessayer.');
    } finally {
      setPostingDepreciation(false);
    }
  };

  // Demo data
  const demoAssets = [
    {
      id: 1,
      code: 'A-0001',
      name: 'Serveur Dell PowerEdge',
      category_id: 1,
      category_name: 'Matériel informatique',
      acquisition_date: '2023-01-15',
      acquisition_value: 50000,
      salvage_value: 5000,
      depreciation_value: 30000, // 60% amorti
      method: 'linear', // Using category's method
      duration_years: 3, // Using category's duration
      state: 'open',
      first_depreciation_date: '2023-01-31',
      note: 'Serveur destiné à l\'hébergement des applications internes',
      created_at: '2023-01-16T10:30:00',
      updated_at: '2023-01-16T10:30:00'
    },
    {
      id: 2,
      code: 'A-0002',
      name: 'Bureaux open space',
      category_id: 2,
      category_name: 'Mobilier de bureau',
      acquisition_date: '2022-06-10',
      acquisition_value: 75000,
      salvage_value: 7500,
      depreciation_value: 13500, // 18% amorti
      method: 'linear', // Using category's method
      duration_years: 10, // Using category's duration
      state: 'open',
      first_depreciation_date: '2022-06-30',
      note: 'Mobilier pour les postes de travail du nouveau bâtiment',
      created_at: '2022-06-11T14:45:00',
      updated_at: '2022-06-11T14:45:00'
    },
    {
      id: 3,
      code: 'A-0003',
      name: 'Renault Kangoo',
      category_id: 3,
      category_name: 'Véhicules',
      acquisition_date: '2021-10-05',
      acquisition_value: 120000,
      salvage_value: 20000,
      depreciation_value: 80000, // 67% amorti
      method: 'degressive',
      duration_years: 5,
      state: 'open',
      first_depreciation_date: '2021-10-31',
      note: 'Véhicule de service pour les livraisons',
      created_at: '2021-10-06T09:15:00',
      updated_at: '2021-10-06T09:15:00'
    }
  ];

  const demoAssetDepreciations = [
    {
      id: 101,
      asset_id: 1,
      name: 'Dotation 1',
      sequence: 1,
      date: '2023-01-31',
      amount: 1250,
      remaining_value: 43750,
      move_id: 501,
      state: 'posted',
      created_at: '2023-01-31T10:30:00',
      updated_at: '2023-01-31T10:30:00'
    },
    {
      id: 102,
      asset_id: 1,
      name: 'Dotation 2',
      sequence: 2,
      date: '2023-02-28',
      amount: 1250,
      remaining_value: 42500,
      move_id: 502,
      state: 'posted',
      created_at: '2023-02-28T10:30:00',
      updated_at: '2023-02-28T10:30:00'
    },
    {
      id: 103,
      asset_id: 1,
      name: 'Dotation 3',
      sequence: 3,
      date: '2023-03-31',
      amount: 1250,
      remaining_value: 41250,
      move_id: null,
      state: 'draft',
      created_at: '2023-03-01T10:30:00',
      updated_at: '2023-03-01T10:30:00'
    },
    {
      id: 104,
      asset_id: 1,
      name: 'Dotation 4',
      sequence: 4,
      date: '2023-04-30',
      amount: 1250,
      remaining_value: 40000,
      move_id: null,
      state: 'draft',
      created_at: '2023-04-01T10:30:00',
      updated_at: '2023-04-01T10:30:00'
    },
    {
      id: 201,
      asset_id: 2,
      name: 'Dotation 1',
      sequence: 1,
      date: '2022-06-30',
      amount: 563,
      remaining_value: 66938,
      move_id: 601,
      state: 'posted',
      created_at: '2022-06-30T14:45:00',
      updated_at: '2022-06-30T14:45:00'
    },
    {
      id: 202,
      asset_id: 2,
      name: 'Dotation 2',
      sequence: 2,
      date: '2022-07-31',
      amount: 563,
      remaining_value: 66375,
      move_id: 602,
      state: 'posted',
      created_at: '2022-07-31T14:45:00',
      updated_at: '2022-07-31T14:45:00'
    },
    {
      id: 301,
      asset_id: 3,
      name: 'Dotation 1',
      sequence: 1,
      date: '2021-10-31',
      amount: 5000,
      remaining_value: 95000,
      move_id: 701,
      state: 'posted',
      created_at: '2021-10-31T09:15:00',
      updated_at: '2021-10-31T09:15:00'
    },
    {
      id: 302,
      asset_id: 3,
      name: 'Dotation 2',
      sequence: 2,
      date: '2021-11-30',
      amount: 5000,
      remaining_value: 90000,
      move_id: 702,
      state: 'posted',
      created_at: '2021-11-30T09:15:00',
      updated_at: '2021-11-30T09:15:00'
    }
  ];

  const getStateTag = (state) => {
    const stateMap = {
      'draft': { text: 'Brouillon', color: 'orange' },
      'open': { text: 'En cours', color: 'green' },
      'close': { text: 'Clôturé', color: 'blue' },
      'sold': { text: 'Cédé', color: 'red' }
    };
    
    return (
      <Tag color={stateMap[state]?.color}>
        {stateMap[state]?.text || state}
      </Tag>
    );
  };

  const getDepreciationStateTag = (state) => {
    const stateMap = {
      'draft': { text: 'À comptabiliser', color: 'orange' },
      'posted': { text: 'Comptabilisé', color: 'green' },
      'cancel': { text: 'Annulé', color: 'red' }
    };
    
    return (
      <Tag color={stateMap[state]?.color}>
        {stateMap[state]?.text || state}
      </Tag>
    );
  };

  const columns = [
    {
      title: 'Séquence',
      dataIndex: 'sequence',
      key: 'sequence',
      width: '10%',
      render: (text, record) => `${text}`,
      sorter: (a, b) => a.sequence - b.sequence,
    },
    {
      title: 'Nom',
      dataIndex: 'name',
      key: 'name',
      width: '15%',
    },
    {
      title: 'Date',
      dataIndex: 'date',
      key: 'date',
      width: '15%',
      render: (text) => moment(text).format('DD/MM/YYYY'),
      sorter: (a, b) => moment(a.date).unix() - moment(b.date).unix(),
    },
    {
      title: 'Montant',
      dataIndex: 'amount',
      key: 'amount',
      width: '15%',
      align: 'right',
      render: (text) => `${parseFloat(text).toFixed(2)} MAD`,
    },
    {
      title: 'Valeur restante',
      dataIndex: 'remaining_value',
      key: 'remaining_value',
      width: '15%',
      align: 'right',
      render: (text) => `${parseFloat(text).toFixed(2)} MAD`,
    },
    {
      title: 'Écriture',
      dataIndex: 'move_id',
      key: 'move_id',
      width: '15%',
      render: (moveId) => moveId ? (
        <Link to={`/accounting/entries/${moveId}`}>
          Voir l'écriture
        </Link>
      ) : '-',
    },
    {
      title: 'Statut',
      dataIndex: 'state',
      key: 'state',
      width: '15%',
      render: (state) => getDepreciationStateTag(state),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: '10%',
      render: (_, record) => (
        record.state === 'draft' ? (
          <Button 
            type="link" 
            size="small" 
            icon={<DollarOutlined />} 
            onClick={() => handlePostDepreciation(record.id)}
            loading={postingDepreciation}
          >
            Comptabiliser
          </Button>
        ) : null
      ),
    },
  ];

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
        <Spin size="large" />
      </div>
    );
  }

  if (error && !asset) {
    return (
      <Alert
        message="Erreur"
        description={error}
        type="error"
        showIcon
        action={
          <Button size="small" onClick={() => navigate('/accounting/assets')}>
            Retour à la liste
          </Button>
        }
      />
    );
  }

  const displayedAsset = asset || demoAssets[0];
  const displayedDepreciations = depreciations.length > 0 ? depreciations : 
    demoAssetDepreciations.filter(d => d.asset_id === parseInt(id));
  
  // Calculate asset stats
  const netBookValue = parseFloat(displayedAsset.acquisition_value) - parseFloat(displayedAsset.depreciation_value || 0);
  const depreciationPercentage = (parseFloat(displayedAsset.depreciation_value || 0) / parseFloat(displayedAsset.acquisition_value)) * 100;
  const totalDepreciations = displayedDepreciations.length;
  const postedDepreciations = displayedDepreciations.filter(d => d.state === 'posted').length;

  return (
    <div className="asset-detail">
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <Title level={2}>
            {displayedAsset.code} - {displayedAsset.name}
          </Title>
          <Space>
            {getStateTag(displayedAsset.state)}
            <Tag icon={<BuildOutlined />} color="blue">
              {displayedAsset.category_name}
            </Tag>
          </Space>
        </div>
        <Space>
          {displayedAsset.state === 'draft' && (
            <>
              <Link to={`/accounting/assets/${id}/edit`}>
                <Button icon={<EditOutlined />}>Modifier</Button>
              </Link>
              <Popconfirm
                title="Êtes-vous sûr de vouloir supprimer cette immobilisation?"
                onConfirm={handleDeleteAsset}
                okText="Oui"
                cancelText="Non"
              >
                <Button icon={<DeleteOutlined />} danger>Supprimer</Button>
              </Popconfirm>
            </>
          )}
          <Button 
            type="primary" 
            icon={<CalculatorOutlined />} 
            onClick={handleComputeDepreciation}
            loading={computingDepreciation}
          >
            Calculer les amortissements
          </Button>
          <Button onClick={() => navigate('/accounting/assets')}>
            Retour à la liste
          </Button>
        </Space>
      </div>

      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={8}>
          <Card>
            <Statistic
              title="Valeur nette comptable"
              value={netBookValue}
              precision={2}
              suffix="MAD"
              valueStyle={{ color: '#3f8600' }}
            />
            <Divider style={{ margin: '12px 0' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text>Amortissement</Text>
              <Text>{depreciationPercentage.toFixed(1)}%</Text>
            </div>
            <Progress 
              percent={depreciationPercentage} 
              status={depreciationPercentage >= 100 ? 'success' : 'active'} 
              showInfo={false}
              style={{ marginTop: 8 }}
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card>
            <Statistic
              title="Valeur d'acquisition"
              value={displayedAsset.acquisition_value}
              precision={2}
              suffix="MAD"
            />
            <Divider style={{ margin: '12px 0' }} />
            <Row gutter={16}>
              <Col span={12}>
                <Statistic
                  title="Amortissement"
                  value={displayedAsset.depreciation_value || 0}
                  precision={2}
                  suffix="MAD"
                  valueStyle={{ fontSize: '14px' }}
                />
              </Col>
              <Col span={12}>
                <Statistic
                  title="Valeur résiduelle"
                  value={displayedAsset.salvage_value}
                  precision={2}
                  suffix="MAD"
                  valueStyle={{ fontSize: '14px' }}
                />
              </Col>
            </Row>
          </Card>
        </Col>
        <Col span={8}>
          <Card>
            <Statistic
              title="Dotations aux amortissements"
              value={postedDepreciations}
              suffix={`/ ${totalDepreciations} calculées`}
              prefix={<ToolOutlined />}
            />
            <Divider style={{ margin: '12px 0' }} />
            <Steps size="small" progressDot current={postedDepreciations}>
              {displayedDepreciations.slice(0, 5).map((dep, index) => (
                <Step 
                  key={dep.id} 
                  title={`${index + 1}`} 
                  description={moment(dep.date).format('MM/YYYY')}
                />
              ))}
              {totalDepreciations > 5 && (
                <Step title={`+${totalDepreciations - 5}`} description="..." />
              )}
            </Steps>
          </Card>
        </Col>
      </Row>

      <Card style={{ marginBottom: 24 }}>
        <Descriptions title="Informations de l'immobilisation" bordered>
          <Descriptions.Item label="Code">{displayedAsset.code}</Descriptions.Item>
          <Descriptions.Item label="Nom">{displayedAsset.name}</Descriptions.Item>
          <Descriptions.Item label="Catégorie">{displayedAsset.category_name}</Descriptions.Item>
          <Descriptions.Item label="Date d'acquisition">{moment(displayedAsset.acquisition_date).format('DD/MM/YYYY')}</Descriptions.Item>
          <Descriptions.Item label="État">{getStateTag(displayedAsset.state)}</Descriptions.Item>
          <Descriptions.Item label="Date de début d'amortissement">
            {displayedAsset.first_depreciation_date ? moment(displayedAsset.first_depreciation_date).format('DD/MM/YYYY') : '-'}
          </Descriptions.Item>
          <Descriptions.Item label="Méthode d'amortissement" span={3}>
            {displayedAsset.method === 'linear' ? 'Linéaire' : 
             displayedAsset.method === 'degressive' ? 'Dégressive' : 
             '-'} 
            {displayedAsset.duration_years && ` (${displayedAsset.duration_years} ans)`}
          </Descriptions.Item>
          <Descriptions.Item label="Notes" span={3}>
            {displayedAsset.note || '-'}
          </Descriptions.Item>
        </Descriptions>
      </Card>

      <Card title="Dotations aux amortissements">
        <Table
          columns={columns}
          dataSource={displayedDepreciations}
          rowKey="id"
          pagination={false}
          size="middle"
          summary={pageData => {
            let totalAmount = 0;
            
            pageData.forEach(({ amount }) => {
              totalAmount += parseFloat(amount || 0);
            });
            
            return (
              <Table.Summary.Row>
                <Table.Summary.Cell index={0} colSpan={3}><strong>Total</strong></Table.Summary.Cell>
                <Table.Summary.Cell index={3} align="right">
                  <strong>{totalAmount.toFixed(2)} MAD</strong>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={4} colSpan={4}></Table.Summary.Cell>
              </Table.Summary.Row>
            );
          }}
        />
      </Card>

      <Card title="Cycle de vie de l'immobilisation">
        <Timeline mode="left">
          <Timeline.Item 
            dot={<BuildOutlined style={{ fontSize: '16px' }} />}
          >
            <p>
              <strong>Acquisition</strong> - {moment(displayedAsset.acquisition_date).format('DD/MM/YYYY')}
            </p>
            <p>Valeur d'acquisition: {parseFloat(displayedAsset.acquisition_value).toFixed(2)} MAD</p>
          </Timeline.Item>
          
          {displayedAsset.first_depreciation_date && (
            <Timeline.Item 
              dot={<ArrowRightOutlined style={{ fontSize: '16px' }} />}
            >
              <p>
                <strong>Début d'amortissement</strong> - {moment(displayedAsset.first_depreciation_date).format('DD/MM/YYYY')}
              </p>
              <p>Méthode: {displayedAsset.method === 'linear' ? 'Linéaire' : 'Dégressive'} - Durée: {displayedAsset.duration_years} ans</p>
            </Timeline.Item>
          )}
          
          {displayedDepreciations.filter(d => d.state === 'posted').slice(-1).map(dep => (
            <Timeline.Item 
              key={dep.id}
              dot={<CheckCircleOutlined style={{ fontSize: '16px', color: '#52c41a' }} />}
            >
              <p>
                <strong>Dernière dotation comptabilisée</strong> - {moment(dep.date).format('DD/MM/YYYY')}
              </p>
              <p>Montant: {parseFloat(dep.amount).toFixed(2)} MAD - Valeur restante: {parseFloat(dep.remaining_value).toFixed(2)} MAD</p>
            </Timeline.Item>
          ))}
          
          {/* If asset is not fully depreciated, show next depreciation */}
          {displayedDepreciations.filter(d => d.state === 'draft').slice(0, 1).map(dep => (
            <Timeline.Item 
              key={dep.id}
              dot={<ClockCircleOutlined style={{ fontSize: '16px', color: '#1890ff' }} />}
              color="blue"
            >
              <p>
                <strong>Prochaine dotation</strong> - {moment(dep.date).format('DD/MM/YYYY')}
              </p>
              <p>Montant: {parseFloat(dep.amount).toFixed(2)} MAD</p>
            </Timeline.Item>
          ))}
          
          {/* Show end date if asset has a duration */}
          {displayedAsset.duration_years && displayedAsset.first_depreciation_date && (
            <Timeline.Item 
              dot={<DollarOutlined style={{ fontSize: '16px' }} />}
              color="gray"
            >
              <p>
                <strong>Fin d'amortissement prévue</strong> - {moment(displayedAsset.first_depreciation_date).add(displayedAsset.duration_years, 'years').format('DD/MM/YYYY')}
              </p>
              <p>Valeur résiduelle: {parseFloat(displayedAsset.salvage_value).toFixed(2)} MAD</p>
            </Timeline.Item>
          )}
        </Timeline>
      </Card>
    </div>
  );
};

export default AssetDetail;
