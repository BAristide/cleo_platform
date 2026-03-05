// src/components/hr/AnnouncementFeed.js
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Card, Typography, Spin, Alert, Button, Tag, Space,
  Empty, Row, Col, Tooltip
} from 'antd';
import {
  PushpinOutlined, PlusOutlined, UserOutlined, ClockCircleOutlined
} from '@ant-design/icons';
import axios from '../../utils/axiosConfig';
import { extractResultsFromResponse } from '../../utils/apiUtils';

const { Title, Text, Paragraph } = Typography;

const AnnouncementFeed = () => {
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  const fetchAnnouncements = async () => {
    setLoading(true);
    try {
      const resp = await axios.get('/api/hr/announcements/');
      setAnnouncements(extractResultsFromResponse(resp));
    } catch {
      setError('Impossible de charger les annonces.');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('fr-FR', {
      day: '2-digit', month: 'long', year: 'numeric',
    });
  };

  const audienceLabel = {
    all: 'Tous',
    department: 'Departement',
    individual: 'Individuel',
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '48px 0' }}>
        <Spin size="large" />
      </div>
    );
  }

  if (error) {
    return <Alert message={error} type="error" showIcon />;
  }

  return (
    <div>
      <Row justify="space-between" align="middle" style={{ marginBottom: 24 }}>
        <Col>
          <Title level={2} style={{ margin: 0 }}>Annonces internes</Title>
        </Col>
        <Col>
          <Link to="/hr/announcements/new">
            <Button type="primary" icon={<PlusOutlined />}>
              Nouvelle annonce
            </Button>
          </Link>
        </Col>
      </Row>

      {announcements.length === 0 ? (
        <Empty description="Aucune annonce pour le moment" />
      ) : (
        <Space direction="vertical" style={{ width: '100%' }} size={16}>
          {announcements.map((a) => (
            <Card
              key={a.id}
              style={{
                borderLeft: a.is_pinned ? '4px solid #1677ff' : undefined,
              }}
            >
              <Row justify="space-between" align="top">
                <Col flex="auto">
                  <Space align="center" style={{ marginBottom: 8 }}>
                    {a.is_pinned && (
                      <Tooltip title="Epinglee">
                        <PushpinOutlined style={{ color: '#1677ff' }} />
                      </Tooltip>
                    )}
                    <Text strong style={{ fontSize: 16 }}>{a.title}</Text>
                    {a.is_auto_generated && (
                      <Tag color="default">Automatique</Tag>
                    )}
                    <Tag color="blue">
                      {audienceLabel[a.target_audience] || a.target_audience}
                    </Tag>
                  </Space>
                  <Paragraph style={{ marginBottom: 8 }}>{a.content}</Paragraph>
                  <Space size="large">
                    {a.author_name && (
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        <UserOutlined /> {a.author_name}
                      </Text>
                    )}
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      <ClockCircleOutlined /> {formatDate(a.created_at)}
                    </Text>
                    {a.expires_at && (
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        Expire le {formatDate(a.expires_at)}
                      </Text>
                    )}
                  </Space>
                </Col>
              </Row>
            </Card>
          ))}
        </Space>
      )}
    </div>
  );
};

export default AnnouncementFeed;
