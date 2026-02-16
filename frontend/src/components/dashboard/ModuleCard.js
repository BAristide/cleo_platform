// src/components/dashboard/ModuleCard.js
import React from 'react';
import { Card, Typography, Statistic, Button } from 'antd';
import { Link } from 'react-router-dom';
import { 
  TeamOutlined, 
  ShoppingCartOutlined, 
  UserOutlined, 
  DollarOutlined, 
  BankOutlined, 
  SolutionOutlined 
} from '@ant-design/icons';

const { Title, Text } = Typography;

const ModuleCard = ({ title, icon, description, path, stats }) => {
  // Mapper les icônes par nom
  const iconMap = {
    'team': <TeamOutlined />,
    'shopping-cart': <ShoppingCartOutlined />,
    'user': <UserOutlined />,
    'dollar': <DollarOutlined />,
    'bank': <BankOutlined />,
    'solution': <SolutionOutlined />
  };

  return (
    <Card 
      hoverable 
      className="module-card"
      actions={[
        <Link to={path}><Button type="primary">Accéder</Button></Link>
      ]}
    >
      <div className="icon-container">
        {iconMap[icon]}
      </div>
      <Title level={4}>{title}</Title>
      <Text>{description}</Text>
      
      {stats && Object.keys(stats).length > 0 && (
        <div className="stats-container">
          {stats.count !== undefined && (
            <Statistic title="Total" value={stats.count} />
          )}
          {stats.recent !== undefined && (
            <Statistic title="Récents" value={stats.recent} />
          )}
        </div>
      )}
    </Card>
  );
};

export default ModuleCard;
