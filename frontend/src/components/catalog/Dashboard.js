// src/components/catalog/Dashboard.js
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Card, Row, Col, Typography, Spin, Statistic } from 'antd';
import {
  AppstoreOutlined, TagsOutlined, CheckCircleOutlined, CloseCircleOutlined,
} from '@ant-design/icons';
import axios from '../../utils/axiosConfig';
import { extractResultsFromResponse } from '../../utils/apiUtils';

const { Title } = Typography;

const CatalogDashboard = () => {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalProducts: 0,
    activeProducts: 0,
    inactiveProducts: 0,
    totalCategories: 0,
  });

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const [productsRes, activeRes, inactiveRes, categoriesRes] = await Promise.all([
        axios.get('/api/catalog/products/', { params: { page_size: 1 } }).catch(() => ({ data: { count: 0 } })),
        axios.get('/api/catalog/products/', { params: { is_active: true, page_size: 1 } }).catch(() => ({ data: { count: 0 } })),
        axios.get('/api/catalog/products/', { params: { is_active: false, page_size: 1 } }).catch(() => ({ data: { count: 0 } })),
        axios.get('/api/catalog/product-categories/').catch(() => ({ data: { results: [] } })),
      ]);

      const categoriesData = extractResultsFromResponse(categoriesRes);

      setStats({
        totalProducts: productsRes.data?.count || 0,
        activeProducts: activeRes.data?.count || 0,
        inactiveProducts: inactiveRes.data?.count || 0,
        totalCategories: categoriesRes.data?.count || categoriesData.length || 0,
      });
    } catch (error) {
      console.error('Erreur lors du chargement des statistiques catalogue:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 300 }}>
        <Spin size="large" tip="Chargement du catalogue..." />
      </div>
    );
  }

  return (
    <div>
      <Title level={3}>Tableau de bord du catalogue</Title>

      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} md={6}>
          <Link to="/catalog/products">
            <Card hoverable>
              <Statistic
                title="Produits"
                value={stats.totalProducts}
                prefix={<AppstoreOutlined style={{ color: '#0ea5e9' }} />}
                suffix="produits"
              />
            </Card>
          </Link>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Actifs"
              value={stats.activeProducts}
              prefix={<CheckCircleOutlined style={{ color: '#10b981' }} />}
              suffix="produits"
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Inactifs"
              value={stats.inactiveProducts}
              prefix={<CloseCircleOutlined style={{ color: '#ef4444' }} />}
              suffix="produits"
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Link to="/catalog/categories">
            <Card hoverable>
              <Statistic
                title="Categories"
                value={stats.totalCategories}
                prefix={<TagsOutlined style={{ color: '#8b5cf6' }} />}
                suffix="categories"
              />
            </Card>
          </Link>
        </Col>
      </Row>
    </div>
  );
};

export default CatalogDashboard;
