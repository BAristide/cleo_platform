// src/components/hr/RewardBoard.js
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Card, Typography, Row, Col, Tag, Button, Empty, Spin, Space, Avatar, Tooltip } from 'antd';
import { TrophyOutlined, PlusOutlined, StarOutlined, HeartOutlined, GiftOutlined } from '@ant-design/icons';
import axios from '../../utils/axiosConfig';

const { Title, Text } = Typography;

const ICON_MAP = {
  TrophyOutlined: <TrophyOutlined />,
  StarOutlined:   <StarOutlined />,
  HeartOutlined:  <HeartOutlined />,
  GiftOutlined:   <GiftOutlined />,
};

const RewardBoard = () => {
  const [rewards, setRewards]   = useState([]);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    axios.get('/api/hr/rewards/board/')
      .then(r => setRewards(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const formatDate = (d) => d ? new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' }) : '';

  if (loading) return <div style={{ textAlign: 'center', padding: 48 }}><Spin size="large" /></div>;

  return (
    <div>
      <Row justify="space-between" align="middle" style={{ marginBottom: 24 }}>
        <Col>
          <Space align="center">
            <TrophyOutlined style={{ fontSize: 28, color: '#faad14' }} />
            <Title level={2} style={{ margin: 0 }}>Tableau des recompenses</Title>
          </Space>
        </Col>
        <Col>
          <Link to="/hr/rewards/new">
            <Button type="primary" icon={<PlusOutlined />}>Attribuer une recompense</Button>
          </Link>
        </Col>
      </Row>

      {rewards.length === 0 ? (
        <Empty description="Aucune recompense pour le moment" />
      ) : (
        <Row gutter={[16, 16]}>
          {rewards.map(r => (
            <Col xs={24} sm={12} md={8} lg={6} key={r.id}>
              <Card
                style={{ textAlign: 'center', borderTop: '3px solid #faad14' }}
                bodyStyle={{ padding: 20 }}
              >
                <Avatar
                  size={56}
                  style={{ backgroundColor: '#fff7e6', color: '#faad14', fontSize: 24, marginBottom: 12 }}
                >
                  {ICON_MAP[r.reward_type_icon] || <TrophyOutlined />}
                </Avatar>
                <div>
                  <Tag color="gold" style={{ marginBottom: 8 }}>{r.reward_type_name}</Tag>
                </div>
                <Text strong style={{ fontSize: 15 }}>{r.employee_name}</Text>
                <br />
                {r.description && (
                  <Text type="secondary" style={{ fontSize: 12 }}>{r.description}</Text>
                )}
                <br />
                <Text type="secondary" style={{ fontSize: 11, marginTop: 8, display: 'block' }}>
                  {formatDate(r.awarded_date)}
                  {r.awarded_by_name && ` · Par ${r.awarded_by_name}`}
                </Text>
              </Card>
            </Col>
          ))}
        </Row>
      )}
    </div>
  );
};

export default RewardBoard;
