// src/components/payroll/Dashboard.js
import React, { useState, useEffect } from 'react';
import { 
  Row, Col, Card, Statistic, Table, List, Tabs, 
  Tag, Progress, Typography, Spin, Empty, Button 
} from 'antd';
import { 
  UserOutlined, BankOutlined, FileTextOutlined, 
  CheckCircleOutlined, ClockCircleOutlined, DollarOutlined,
  PlusOutlined, CalendarOutlined
} from '@ant-design/icons';
import { Link } from 'react-router-dom';
import { 
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, 
  Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell 
} from 'recharts';
import axios from 'axios';

const { Title, Text } = Typography;
const { TabPane } = Tabs;

const statusColors = {
  draft: 'default',
  in_progress: 'processing',
  calculated: 'warning',
  validated: 'success',
  paid: 'green',
  cancelled: 'error'
};

const Dashboard = () => {
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState(null);
  
  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await axios.get('/api/payroll/dashboard/');
        setDashboardData(response.data);
        setLoading(false);
      } catch (error) {
        console.error('Erreur lors du chargement des données du tableau de bord:', error);
        setLoading(false);
        
        // Données de démonstration en cas d'erreur
        setDashboardData({
          current_period: {
            id: 1,
            name: 'Mai 2025',
            start_date: '2025-05-01',
            end_date: '2025-05-31',
            runs_count: 1,
            payslips_count: 12,
            payslips_calculated: 10,
            total_gross: 120000,
            total_net: 90000
          },
          runs_by_status: [
            { status: 'draft', count: 1 },
            { status: 'in_progress', count: 1 },
            { status: 'calculated', count: 1 },
            { status: 'validated', count: 1 },
            { status: 'paid', count: 2 }
          ],
          payslips_by_status: [
            { status: 'draft', count: 2 },
            { status: 'calculated', count: 20 },
            { status: 'validated', count: 10 },
            { status: 'paid', count: 30 }
          ],
          advances_by_period: [
            { period__name: 'Mai 2025', total: 5000, count: 3 },
            { period__name: 'Avril 2025', total: 4500, count: 2 },
            { period__name: 'Mars 2025', total: 3000, count: 2 }
          ],
          recent_payslips: [],
          recent_advances: [],
          department_stats: [
            {
              employee__department__name: 'Direction Technique',
              employees_count: 5,
              total_gross: 50000,
              total_net: 40000,
              total_cnss: 5000,
              total_amo: 2000,
              total_ir: 3000
            },
            {
              employee__department__name: 'Finance',
              employees_count: 3,
              total_gross: 35000,
              total_net: 28000,
              total_cnss: 3500,
              total_amo: 1400,
              total_ir: 2100
            },
            {
              employee__department__name: 'Marketing',
              employees_count: 4,
              total_gross: 35000,
              total_net: 28000,
              total_cnss: 3500,
              total_amo: 1400,
              total_ir: 2100
            }
          ],
          totals: {
            employees: 12,
            periods: 6,
            payroll_runs: 6,
            payslips: 62,
            advances: 7
          }
        });
      }
    };
    
    fetchData();
  }, []);
  
  if (loading) {
    return <Spin size="large" tip="Chargement des données..." />;
  }
  
  if (!dashboardData) {
    return <Empty description="Aucune donnée disponible" />;
  }
  
  // Préparation des données pour les graphiques
  const payslipsByStatusData = dashboardData.payslips_by_status.map(item => ({
    name: item.status,
    value: item.count
  }));
  
  const runsByStatusData = dashboardData.runs_by_status.map(item => ({
    name: item.status,
    value: item.count
  }));
  
  const advancesByPeriodData = dashboardData.advances_by_period.map(item => ({
    name: item.period__name,
    amount: item.total,
    count: item.count
  }));
  
  const departmentStatsData = dashboardData.department_stats.map(item => ({
    name: item.employee__department__name || 'Non défini',
    gross: item.total_gross,
    net: item.total_net,
    count: item.employees_count
  }));
  
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D'];
  
  return (
    <div style={{ padding: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
        <Title level={2}>Tableau de bord Paie</Title>
        <div>
          <Button type="primary" icon={<PlusOutlined />} style={{ marginRight: '10px' }}>
            <Link to="/payroll/runs/new">Nouveau lancement</Link>
          </Button>
          <Button icon={<CalendarOutlined />}>
            <Link to="/payroll/periods/new">Nouvelle période</Link>
          </Button>
        </div>
      </div>
      
      {/* Période actuelle */}
      {dashboardData.current_period ? (
        <Card style={{ marginBottom: '20px' }} title="Période en cours">
          <Row gutter={16}>
            <Col span={6}>
              <Statistic
                title="Période"
                value={dashboardData.current_period.name}
                valueStyle={{ color: '#3f8600' }}
              />
              <Text type="secondary">
                Du {new Date(dashboardData.current_period.start_date).toLocaleDateString()} 
                au {new Date(dashboardData.current_period.end_date).toLocaleDateString()}
              </Text>
            </Col>
            <Col span={6}>
              <Statistic
                title="Bulletins"
                value={dashboardData.current_period.payslips_count}
                suffix={`/ ${dashboardData.current_period.payslips_calculated} calculés`}
                valueStyle={{ color: '#1890ff' }}
                prefix={<FileTextOutlined />}
              />
            </Col>
            <Col span={6}>
              <Statistic
                title="Total Brut"
                value={dashboardData.current_period.total_gross}
                valueStyle={{ color: '#cf1322' }}
                suffix="MAD"
              />
            </Col>
            <Col span={6}>
              <Statistic
                title="Total Net"
                value={dashboardData.current_period.total_net}
                valueStyle={{ color: '#3f8600' }}
                suffix="MAD"
              />
            </Col>
          </Row>
          <Row style={{ marginTop: '20px' }}>
            <Col span={24}>
              <Progress
                percent={Math.round((dashboardData.current_period.payslips_calculated / 
                  (dashboardData.current_period.payslips_count || 1)) * 100)}
                status="active"
                strokeColor={{
                  '0%': '#108ee9',
                  '100%': '#87d068',
                }}
                format={percent => `${percent}% calculés`}
              />
            </Col>
          </Row>
        </Card>
      ) : (
        <Card style={{ marginBottom: '20px' }}>
          <Empty description="Aucune période de paie en cours" />
          <div style={{ textAlign: 'center', marginTop: '16px' }}>
            <Button type="primary" icon={<PlusOutlined />}>
              <Link to="/payroll/periods/new">Créer une période</Link>
            </Button>
          </div>
        </Card>
      )}
      
      {/* Statistiques générales */}
      <Row gutter={16} style={{ marginBottom: '20px' }}>
        <Col span={6}>
          <Card>
            <Statistic
              title="Employés"
              value={dashboardData.totals.employees}
              prefix={<UserOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Périodes"
              value={dashboardData.totals.periods}
              prefix={<ClockCircleOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Lancements"
              value={dashboardData.totals.payroll_runs}
              prefix={<CheckCircleOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Acomptes"
              value={dashboardData.totals.advances}
              prefix={<DollarOutlined />}
            />
          </Card>
        </Col>
      </Row>
      
      {/* Graphiques et tableaux détaillés */}
      <Tabs defaultActiveKey="1">
        <TabPane tab="Bulletins et statuts" key="1">
          <Row gutter={16}>
            <Col span={12}>
              <Card title="Bulletins par statut">
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={payslipsByStatusData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    >
                      {payslipsByStatusData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => [`${value} bulletins`, 'Nombre']} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </Card>
            </Col>
            <Col span={12}>
              <Card title="Lancements par statut">
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={runsByStatusData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip formatter={(value) => [`${value} lancements`, 'Nombre']} />
                    <Bar dataKey="value" fill="#82ca9d" name="Nombre" />
                  </BarChart>
                </ResponsiveContainer>
              </Card>
            </Col>
          </Row>
          {dashboardData.recent_payslips && dashboardData.recent_payslips.length > 0 ? (
            <Row gutter={16} style={{ marginTop: '20px' }}>
              <Col span={24}>
                <Card title="Bulletins récents">
                  <Table
                    dataSource={dashboardData.recent_payslips}
                    rowKey="id"
                    pagination={false}
                    columns={[
                      {
                        title: 'Numéro',
                        dataIndex: 'number',
                        key: 'number',
                      },
                      {
                        title: 'Employé',
                        dataIndex: 'employee_data',
                        key: 'employee',
                        render: employee => employee ? `${employee.first_name} ${employee.last_name}` : 'N/A'
                      },
                      {
                        title: 'Période',
                        dataIndex: 'period_name',
                        key: 'period_name',
                      },
                      {
                        title: 'Brut',
                        dataIndex: 'gross_salary',
                        key: 'gross_salary',
                        render: value => `${value} MAD`
                      },
                      {
                        title: 'Net',
                        dataIndex: 'net_salary',
                        key: 'net_salary',
                        render: value => `${value} MAD`
                      },
                      {
                        title: 'Statut',
                        dataIndex: 'status',
                        key: 'status',
                        render: (status, record) => (
                          <Tag color={statusColors[status] || 'default'}>
                            {record.status_display || status}
                          </Tag>
                        )
                      }
                    ]}
                  />
                </Card>
              </Col>
            </Row>
          ) : null}
        </TabPane>
        <TabPane tab="Statistiques par département" key="2">
          <Row gutter={16}>
            <Col span={24}>
              <Card title="Masse salariale par département">
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={departmentStatsData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip formatter={(value) => [`${value} MAD`, 'Montant']} />
                    <Legend />
                    <Bar dataKey="gross" name="Salaire brut" fill="#8884d8" />
                    <Bar dataKey="net" name="Salaire net" fill="#82ca9d" />
                  </BarChart>
                </ResponsiveContainer>
              </Card>
            </Col>
          </Row>
          <Row gutter={16} style={{ marginTop: '20px' }}>
            <Col span={24}>
              <Card title="Détail par département">
                <Table
                  dataSource={dashboardData.department_stats}
                  rowKey={(record) => record.employee__department__name || 'sans-dept'}
                  pagination={false}
                  columns={[
                    {
                      title: 'Département',
                      dataIndex: 'employee__department__name',
                      key: 'department',
                      render: value => value || 'Non défini'
                    },
                    {
                      title: 'Employés',
                      dataIndex: 'employees_count',
                      key: 'employees_count',
                    },
                    {
                      title: 'Salaire Brut',
                      dataIndex: 'total_gross',
                      key: 'total_gross',
                      render: value => `${value} MAD`
                    },
                    {
                      title: 'Salaire Net',
                      dataIndex: 'total_net',
                      key: 'total_net',
                      render: value => `${value} MAD`
                    },
                    {
                      title: 'CNSS',
                      dataIndex: 'total_cnss',
                      key: 'total_cnss',
                      render: value => `${value} MAD`
                    },
                    {
                      title: 'AMO',
                      dataIndex: 'total_amo',
                      key: 'total_amo',
                      render: value => `${value} MAD`
                    },
                    {
                      title: 'IR',
                      dataIndex: 'total_ir',
                      key: 'total_ir',
                      render: value => `${value} MAD`
                    }
                  ]}
                />
              </Card>
            </Col>
          </Row>
        </TabPane>
        <TabPane tab="Acomptes" key="3">
          <Row gutter={16}>
            <Col span={12}>
              <Card title="Acomptes par période">
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={advancesByPeriodData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis yAxisId="left" orientation="left" stroke="#8884d8" />
                    <YAxis yAxisId="right" orientation="right" stroke="#82ca9d" />
                    <Tooltip />
                    <Legend />
                    <Line yAxisId="left" type="monotone" dataKey="amount" stroke="#8884d8" name="Montant" />
                    <Line yAxisId="right" type="monotone" dataKey="count" stroke="#82ca9d" name="Nombre" />
                  </LineChart>
                </ResponsiveContainer>
              </Card>
            </Col>
            <Col span={12}>
              <Card 
                title="Acomptes récents"
                extra={
                  <Button type="primary" size="small">
                    <Link to="/payroll/advances/new">Nouveau</Link>
                  </Button>
                }
              >
                {dashboardData.recent_advances && dashboardData.recent_advances.length > 0 ? (
                  <List
                    dataSource={dashboardData.recent_advances}
                    renderItem={item => (
                      <List.Item>
                        <List.Item.Meta
                          title={`${item.employee_name} - ${item.amount} MAD`}
                          description={`${item.period_name} - Payé le ${new Date(item.payment_date).toLocaleDateString()}`}
                        />
                        <div>
                          <Tag color={item.is_paid ? 'green' : 'orange'}>
                            {item.is_paid ? 'Payé' : 'Non payé'}
                          </Tag>
                        </div>
                      </List.Item>
                    )}
                  />
                ) : (
                  <Empty description="Aucun acompte récent" />
                )}
              </Card>
            </Col>
          </Row>
        </TabPane>
      </Tabs>
    </div>
  );
};

export default Dashboard;
