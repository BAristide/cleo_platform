// src/components/hr/LeaveBalanceDashboard.js
import React, { useState, useEffect } from 'react';
import { Row, Col, Card, Statistic, Typography, Spin, Alert, Button, Progress, Empty } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import axios from '../../utils/axiosConfig';

const { Text } = Typography;

const LeaveBalanceDashboard = ({ employeeId }) => {
  const navigate = useNavigate();
  const [allocations, setAllocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchBalance = async () => {
      setLoading(true);
      try {
        let url = '/api/hr/leave-allocations/my_balance/';
        if (employeeId) {
          const year = new Date().getFullYear();
          url = `/api/hr/leave-allocations/?employee=${employeeId}&year=${year}`;
        }
        const resp = await axios.get(url);
        const data = resp.data;
        setAllocations(Array.isArray(data) ? data : (data.results || []));
      } catch {
        setError('Impossible de charger les soldes de congés.');
      } finally {
        setLoading(false);
      }
    };
    fetchBalance();
  }, [employeeId]);

  if (loading) return <Spin style={{ display: 'block', margin: '24px auto' }} />;
  if (error) return <Alert type="warning" message={error} showIcon />;

  return (
    <div>
      <div style={{ marginBottom: 16, textAlign: 'right' }}>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => navigate('/hr/leaves/new')}
        >
          Nouvelle demande
        </Button>
      </div>

      {allocations.length === 0 ? (
        <Empty description="Aucun solde de congés pour cette année. Les soldes sont crédités automatiquement chaque mois." />
      ) : (
        <Row gutter={[16, 16]}>
          {allocations.map((alloc) => {
            const total = parseFloat(alloc.total_days) + parseFloat(alloc.carried_days);
            const used = parseFloat(alloc.used_days) + parseFloat(alloc.pending_days);
            const remaining = parseFloat(alloc.remaining_days);
            const pct = total > 0 ? Math.min(100, Math.round((used / total) * 100)) : 0;

            return (
              <Col xs={24} sm={12} lg={8} key={alloc.id}>
                <Card
                  size="small"
                  title={
                    <span>
                      <span
                        style={{
                          display: 'inline-block',
                          width: 10,
                          height: 10,
                          borderRadius: '50%',
                          backgroundColor: alloc.leave_type_color || '#1890ff',
                          marginRight: 8,
                        }}
                      />
                      {alloc.leave_type_name}
                    </span>
                  }
                >
                  <Row gutter={8}>
                    <Col span={8}>
                      <Statistic
                        title="Solde"
                        value={remaining}
                        suffix="j"
                        precision={1}
                        valueStyle={{ fontSize: 20, color: remaining <= 0 ? '#ff4d4f' : '#52c41a' }}
                      />
                    </Col>
                    <Col span={8}>
                      <Statistic
                        title="Utilisés"
                        value={alloc.used_days}
                        suffix="j"
                        precision={1}
                        valueStyle={{ fontSize: 20, color: '#fa8c16' }}
                      />
                    </Col>
                    <Col span={8}>
                      <Statistic
                        title="En attente"
                        value={alloc.pending_days}
                        suffix="j"
                        precision={1}
                        valueStyle={{ fontSize: 20, color: '#faad14' }}
                      />
                    </Col>
                  </Row>
                  {total > 0 && (
                    <Progress
                      percent={pct}
                      size="small"
                      style={{ marginTop: 8 }}
                      status={remaining <= 0 ? 'exception' : 'normal'}
                      strokeColor={alloc.leave_type_color || '#1890ff'}
                    />
                  )}
                  {alloc.carried_days > 0 && (
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      dont {alloc.carried_days} j reportés N-1
                    </Text>
                  )}
                </Card>
              </Col>
            );
          })}
        </Row>
      )}
    </div>
  );
};

export default LeaveBalanceDashboard;
