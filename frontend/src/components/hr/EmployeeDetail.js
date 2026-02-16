import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  Card,
  Button,
  Space,
  Descriptions,
  Typography,
  Tabs,
  Table,
  Tag,
  Spin,
  message,
  Divider,
  Avatar,
  Row,
  Col,
  List,
  Progress,
  Timeline
} from 'antd';
import {
  UserOutlined,
  EditOutlined,
  DeleteOutlined,
  MailOutlined,
  PhoneOutlined,
  TeamOutlined,
  CalendarOutlined,
  CarOutlined,
  ToolOutlined,
  BookOutlined,
  BankOutlined,
  IdcardOutlined,
  ArrowLeftOutlined
} from '@ant-design/icons';
import axios from '../../utils/axiosConfig';
import { extractResultsFromResponse } from '../../utils/apiUtils';

const { Title, Text } = Typography;
const { TabPane } = Tabs;

const EmployeeDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [employee, setEmployee] = useState(null);
  const [missions, setMissions] = useState([]);
  const [availabilities, setAvailabilities] = useState([]);
  const [skills, setSkills] = useState([]);
  const [trainingPlans, setTrainingPlans] = useState([]);
  const [skillGaps, setSkillGaps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [subordinates, setSubordinates] = useState([]);

  useEffect(() => {
    const fetchEmployeeData = async () => {
      setLoading(true);
      try {
        // Récupérer les détails de l'employé
        const employeeResponse = await axios.get(`/api/hr/employees/${id}/`);
        setEmployee(employeeResponse.data);

        // Récupérer les missions
        const missionsResponse = await axios.get(`/api/hr/employees/${id}/missions/`);
        setMissions(extractResultsFromResponse(missionsResponse));

        // Récupérer les disponibilités
        const availabilitiesResponse = await axios.get(`/api/hr/employees/${id}/availabilities/`);
        setAvailabilities(extractResultsFromResponse(availabilitiesResponse));

        // Récupérer les compétences
        const skillsResponse = await axios.get(`/api/hr/employees/${id}/skills/`);
        setSkills(extractResultsFromResponse(skillsResponse));

        // Récupérer les plans de formation
        const trainingPlansResponse = await axios.get(`/api/hr/employees/${id}/training_plans/`);
        setTrainingPlans(extractResultsFromResponse(trainingPlansResponse));

        // Récupérer les écarts de compétences
        const skillGapsResponse = await axios.get(`/api/hr/employees/${id}/skill_gaps/`);
        setSkillGaps(skillGapsResponse.data);

        // Récupérer les subordonnés
        const subordinatesResponse = await axios.get(`/api/hr/employees/${id}/subordinates/`);
        setSubordinates(extractResultsFromResponse(subordinatesResponse));

        setLoading(false);
      } catch (error) {
        console.error("Erreur lors de la récupération des données:", error);
        message.error("Impossible de charger les détails de l'employé");
        setLoading(false);
      }
    };

    fetchEmployeeData();
  }, [id]);

  const handleDelete = async () => {
    try {
      await axios.delete(`/api/hr/employees/${id}/`);
      message.success("Employé supprimé avec succès");
      navigate('/hr/employees');
    } catch (error) {
      console.error("Erreur lors de la suppression:", error);
      message.error("Impossible de supprimer l'employé");
    }
  };

  // Colonnes pour les tableaux
  const missionsColumns = [
    {
      title: 'Titre',
      dataIndex: 'title',
      key: 'title',
      render: (text, record) => <Link to={`/hr/missions/${record.id}`}>{text}</Link>
    },
    {
      title: 'Lieu',
      dataIndex: 'location',
      key: 'location',
    },
    {
      title: 'Date de début',
      dataIndex: 'start_date',
      key: 'start_date',
    },
    {
      title: 'Date de fin',
      dataIndex: 'end_date',
      key: 'end_date',
    },
    {
      title: 'Statut',
      dataIndex: 'status_display',
      key: 'status_display',
      render: (text, record) => {
        let color;
        switch (record.status) {
          case 'draft': color = 'default'; break;
          case 'submitted': color = 'processing'; break;
          case 'approved_manager': color = 'processing'; break;
          case 'approved_hr': color = 'processing'; break;
          case 'approved_finance': color = 'success'; break;
          case 'rejected': color = 'error'; break;
          case 'cancelled': color = 'default'; break;
          case 'completed': color = 'success'; break;
          default: color = 'default';
        }
        return <Tag color={color}>{text}</Tag>;
      }
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Space>
          <Button size="small" type="primary">
            <Link to={`/hr/missions/${record.id}`}>Détails</Link>
          </Button>
        </Space>
      )
    }
  ];

  const skillsColumns = [
    {
      title: 'Compétence',
      dataIndex: 'skill_name',
      key: 'skill_name',
    },
    {
      title: 'Catégorie',
      dataIndex: 'skill_category',
      key: 'skill_category',
    },
    {
      title: 'Niveau',
      key: 'level',
      render: (_, record) => {
        const levelColors = {
          1: '#ffc107', // Débutant - jaune
          2: '#2196f3', // Intermédiaire - bleu
          3: '#4caf50', // Avancé - vert
          4: '#9c27b0', // Expert - violet
          5: '#f44336'  // Maître - rouge
        };
        
        return (
          <Space>
            <div className={`skill-level skill-level-${record.level}`} style={{ backgroundColor: levelColors[record.level] }}></div>
            {record.level_display}
          </Space>
        );
      }
    },
    {
      title: 'Certification',
      dataIndex: 'certification',
      key: 'certification',
      render: (text, record) => text ? `${text} (${record.certification_date})` : 'Aucune'
    }
  ];

  const trainingPlansColumns = [
    {
      title: 'Année',
      dataIndex: 'year',
      key: 'year',
    },
    {
      title: 'Statut',
      dataIndex: 'status_display',
      key: 'status_display',
      render: (text, record) => {
        let color;
        switch (record.status) {
          case 'draft': color = 'default'; break;
          case 'submitted': color = 'processing'; break;
          case 'approved_manager': color = 'processing'; break;
          case 'approved_hr': color = 'processing'; break;
          case 'approved_finance': color = 'success'; break;
          case 'rejected': color = 'error'; break;
          case 'completed': color = 'success'; break;
          default: color = 'default';
        }
        return <Tag color={color}>{text}</Tag>;
      }
    },
    {
      title: 'Objectifs',
      dataIndex: 'objectives',
      key: 'objectives',
      ellipsis: true,
    },
    {
      title: 'Formations',
      key: 'training_items',
      render: (_, record) => record.training_items ? record.training_items.length : 0
    },
    {
      title: 'Coût total',
      dataIndex: 'total_cost',
      key: 'total_cost',
      render: (value) => value ? `${value} MAD` : '0 MAD'
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Space>
          <Button size="small" type="primary">
            <Link to={`/hr/training-plans/${record.id}`}>Détails</Link>
          </Button>
        </Space>
      )
    }
  ];

  const availabilitiesColumns = [
    {
      title: 'Type',
      dataIndex: 'type_display',
      key: 'type_display',
    },
    {
      title: 'Date de début',
      dataIndex: 'start_date',
      key: 'start_date',
    },
    {
      title: 'Date de fin',
      dataIndex: 'end_date',
      key: 'end_date',
    },
    {
      title: 'Durée (jours)',
      dataIndex: 'duration_days',
      key: 'duration_days',
    },
    {
      title: 'Statut',
      dataIndex: 'status_display',
      key: 'status_display',
      render: (text, record) => {
        let color;
        switch (record.status) {
          case 'requested': color = 'processing'; break;
          case 'approved': color = 'success'; break;
          case 'rejected': color = 'error'; break;
          case 'cancelled': color = 'default'; break;
          default: color = 'default';
        }
        return <Tag color={color}>{text}</Tag>;
      }
    }
  ];

  const subordinatesColumns = [
    {
      title: 'Nom',
      key: 'name',
      render: (_, record) => (
        <Link to={`/hr/employees/${record.id}`}>
          {record.first_name} {record.last_name}
        </Link>
      ),
    },
    {
      title: 'Poste',
      dataIndex: 'job_title_name',
      key: 'job_title_name',
    },
    {
      title: 'Département',
      dataIndex: 'department_name',
      key: 'department_name',
    },
    {
      title: 'Email',
      dataIndex: 'email',
      key: 'email',
    }
  ];

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '300px' }}>
        <Spin size="large" />
      </div>
    );
  }

  if (!employee) {
    return <div>Employé non trouvé</div>;
  }

  return (
    <div className="employee-detail">
      <Space style={{ marginBottom: 16 }}>
        <Button icon={<ArrowLeftOutlined />}>
          <Link to="/hr/employees">Retour à la liste</Link>
        </Button>
        <Button type="primary" icon={<EditOutlined />}>
          <Link to={`/hr/employees/${id}/edit`}>Modifier</Link>
        </Button>
        <Button type="danger" icon={<DeleteOutlined />} onClick={handleDelete}>
          Supprimer
        </Button>
      </Space>

      <Row gutter={16}>
        <Col xs={24} sm={24} md={8} lg={6}>
          <Card className="employee-info-card">
            <div style={{ textAlign: 'center', marginBottom: 20 }}>
              <Avatar 
                size={100} 
                icon={<UserOutlined />} 
                style={{ backgroundColor: '#1890ff' }}
              />
              <Title level={3} style={{ marginTop: 16, marginBottom: 4 }}>
                {employee.first_name} {employee.last_name}
              </Title>
              <Text type="secondary">{employee.job_title && employee.job_title.name}</Text>
              <div style={{ marginTop: 8 }}>
                {employee.is_active ? 
                  <Tag color="green">Actif</Tag> : 
                  <Tag color="red">Inactif</Tag>
                }
                {employee.is_hr && <Tag color="blue">RH</Tag>}
                {employee.is_finance && <Tag color="green">Finance</Tag>}
                {(employee.subordinates && employee.subordinates.length > 0) && 
                  <Tag color="purple">Manager</Tag>
                }
              </div>
            </div>

            <Divider style={{ margin: '12px 0' }} />

            <div>
              <p>
                <MailOutlined style={{ marginRight: 8 }} />
                {employee.email}
              </p>
              {employee.phone && (
                <p>
                  <PhoneOutlined style={{ marginRight: 8 }} />
                  {employee.phone}
                </p>
              )}
              <p>
                <IdcardOutlined style={{ marginRight: 8 }} />
                ID: {employee.employee_id}
              </p>
              <p>
                <CalendarOutlined style={{ marginRight: 8 }} />
                Embauché le: {employee.hire_date}
              </p>
              {employee.birth_date && (
                <p>
                  <CalendarOutlined style={{ marginRight: 8 }} />
                  Né(e) le: {employee.birth_date}
                </p>
              )}
            </div>

            {employee.address && (
              <>
                <Divider style={{ margin: '12px 0' }} />
                <div>
                  <Title level={5}>Adresse</Title>
                  <p>{employee.address}</p>
                </div>
              </>
            )}

            <Divider style={{ margin: '12px 0' }} />
            
            <div>
              <Title level={5}>Hiérarchie</Title>
              <p>
                <TeamOutlined style={{ marginRight: 8 }} />
                Département: {employee.department && employee.department.name}
              </p>
              {employee.manager && (
                <p>
                  <UserOutlined style={{ marginRight: 8 }} />
                  Manager: <Link to={`/hr/employees/${employee.manager.id}`}>
                    {employee.manager.first_name} {employee.manager.last_name}
                  </Link>
                </p>
              )}
              {employee.second_manager && (
                <p>
                  <UserOutlined style={{ marginRight: 8 }} />
                  N+2: <Link to={`/hr/employees/${employee.second_manager.id}`}>
                    {employee.second_manager.first_name} {employee.second_manager.last_name}
                  </Link>
                </p>
              )}
            </div>
          </Card>
        </Col>

        <Col xs={24} sm={24} md={16} lg={18}>
          <Card>
            <Tabs defaultActiveKey="skills">
              <TabPane 
                tab={<span><ToolOutlined /> Compétences</span>}
                key="skills"
              >
                <Title level={4}>Compétences actuelles</Title>
                <Table 
                  dataSource={skills} 
                  columns={skillsColumns} 
                  rowKey="id" 
                  pagination={false}
                />

                {skillGaps && skillGaps.length > 0 && (
                  <>
                    <Divider />
                    <Title level={4}>Écarts de compétences</Title>
                    <Table
                      dataSource={skillGaps}
                      columns={[
                        {
                          title: 'Compétence',
                          dataIndex: 'skill',
                          key: 'skill',
                          render: (skill) => skill.name
                        },
                        {
                          title: 'Niveau requis',
                          key: 'required_level',
                          render: (_, record) => (
                            <Space>
                              <div className={`skill-level skill-level-${record.required_level}`}></div>
                              {record.required_level_display}
                            </Space>
                          )
                        },
                        {
                          title: 'Niveau actuel',
                          key: 'current_level',
                          render: (_, record) => (
                            <Space>
                              <div className={`skill-level skill-level-${record.current_level}`}></div>
                              {record.current_level_display}
                            </Space>
                          )
                        },
                        {
                          title: 'Écart',
                          dataIndex: 'gap',
                          key: 'gap'
                        },
                        {
                          title: 'Importance',
                          dataIndex: 'importance_display',
                          key: 'importance_display',
                          render: (text, record) => {
                            let color;
                            switch (record.importance) {
                              case 'optional': color = 'default'; break;
                              case 'preferred': color = 'blue'; break;
                              case 'required': color = 'green'; break;
                              case 'critical': color = 'red'; break;
                              default: color = 'default';
                            }
                            return <Tag color={color}>{text}</Tag>;
                          }
                        },
                        {
                          title: 'Statut',
                          dataIndex: 'status',
                          key: 'status',
                          render: (text) => {
                            return text === 'missing' ? 
                              <Tag color="red">Manquante</Tag> : 
                              <Tag color="orange">Insuffisante</Tag>;
                          }
                        }
                      ]}
                      rowKey={(record) => `${record.skill.id}-${record.status}`}
                      pagination={false}
                    />
                  </>
                )}
              </TabPane>

              <TabPane 
                tab={<span><CarOutlined /> Missions</span>}
                key="missions"
              >
                <Table 
                  dataSource={missions} 
                  columns={missionsColumns} 
                  rowKey="id" 
                  pagination={{ pageSize: 5 }}
                />
                <div style={{ marginTop: 16, textAlign: 'right' }}>
                  <Button type="primary">
                    <Link to={`/hr/missions/new?employee=${id}`}>Nouvelle mission</Link>
                  </Button>
                </div>
              </TabPane>

              <TabPane 
                tab={<span><BookOutlined /> Formations</span>}
                key="trainings"
              >
                <Table 
                  dataSource={trainingPlans} 
                  columns={trainingPlansColumns} 
                  rowKey="id" 
                  pagination={{ pageSize: 5 }}
                />
                <div style={{ marginTop: 16, textAlign: 'right' }}>
                  <Button type="primary">
                    <Link to={`/hr/training-plans/new?employee=${id}`}>Nouveau plan de formation</Link>
                  </Button>
                </div>
              </TabPane>

              <TabPane 
                tab={<span><CalendarOutlined /> Disponibilités</span>}
                key="availabilities"
              >
                <Table 
                  dataSource={availabilities} 
                  columns={availabilitiesColumns} 
                  rowKey="id" 
                  pagination={{ pageSize: 5 }}
                />
                <div style={{ marginTop: 16, textAlign: 'right' }}>
                  <Button type="primary">
                    <Link to={`/hr/availabilities/new?employee=${id}`}>Nouvelle disponibilité</Link>
                  </Button>
                </div>
              </TabPane>

              {subordinates && subordinates.length > 0 && (
                <TabPane 
                  tab={<span><TeamOutlined /> Équipe</span>}
                  key="team"
                >
                  <Title level={4}>Subordonnés directs ({subordinates.length})</Title>
                  <Table 
                    dataSource={subordinates} 
                    columns={subordinatesColumns} 
                    rowKey="id" 
                    pagination={{ pageSize: 10 }}
                  />
                </TabPane>
              )}
            </Tabs>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default EmployeeDetail;
