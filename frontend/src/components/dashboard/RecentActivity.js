// src/components/dashboard/RecentActivity.js
import React, { useEffect } from 'react';
import { Card, List, Avatar, Tag, Typography } from 'antd';
import { Link } from 'react-router-dom';
import {
  FileTextOutlined,
  ShoppingCartOutlined,
  UserOutlined,
  DollarOutlined,
  BankOutlined,
  SolutionOutlined,
  TeamOutlined,
  ClockCircleOutlined
} from '@ant-design/icons';

const { Text } = Typography;

const RecentActivity = ({ activities = [] }) => {
  // Afficher les données brutes dans la console pour le débogage
  useEffect(() => {
    console.log('Raw activities data:', activities);
  }, [activities]);

  // Si aucune activité n'est disponible, afficher des données de démonstration
  const demoActivities = [
    {
      id: 1,
      module: 'sales',
      type: 'invoice',
      title: 'Nouvelle facture FACT-2189',
      description: 'Facture émise pour Client ABC',
      time: '2025-05-15T10:30:00',
      path: '/sales/invoices/1',
    },
    {
      id: 2,
      module: 'crm',
      type: 'opportunity',
      title: 'Nouvelle opportunité signée',
      description: 'Projet de développement web avec XYZ Corp',
      time: '2025-05-14T16:45:00',
      path: '/crm/opportunities/1',
    },
    {
      id: 3,
      module: 'hr',
      type: 'employee',
      title: 'Nouvel employé ajouté',
      description: 'Mohamed Alami a rejoint le département IT',
      time: '2025-05-13T09:15:00',
      path: '/hr/employees/1',
    },
    {
      id: 4,
      module: 'accounting',
      type: 'entry',
      title: 'Écriture comptable validée',
      description: 'Écriture ACH/2025/00087 validée par Ahmed',
      time: '2025-05-12T14:20:00',
      path: '/accounting/entries/1',
    },
    {
      id: 5,
      module: 'payroll',
      type: 'payroll',
      title: 'Paie de mai 2025 calculée',
      description: '25 bulletins de paie générés',
      time: '2025-05-10T11:10:00',
      path: '/payroll/payroll-runs/1',
    }
  ];

  // Utiliser les données démo si aucune activité réelle n'est disponible
  const displayActivities = activities && activities.length > 0 ? activities : demoActivities;

  // Analyser une activité pour déterminer son module et son type
  const analyzeActivity = (activity) => {
    // Par défaut
    let module = 'unknown';
    let type = 'unknown';
    let path = '#';
    
    // Essayer de déterminer le module et le type à partir des données disponibles
    if (activity) {
      // Vérifier si nous avons un module explicite
      if (activity.module) {
        module = activity.module;
      } 
      // Sinon, essayer de déterminer à partir de l'URL ou d'autres attributs
      else if (activity.url || activity.path) {
        const urlPath = activity.url || activity.path;
        if (urlPath.includes('/sales/')) module = 'sales';
        else if (urlPath.includes('/crm/')) module = 'crm';
        else if (urlPath.includes('/hr/')) module = 'hr';
        else if (urlPath.includes('/payroll/')) module = 'payroll';
        else if (urlPath.includes('/accounting/')) module = 'accounting';
        else if (urlPath.includes('/recruitment/')) module = 'recruitment';
      }
      // Essayer de déterminer le type
      if (activity.type) {
        type = activity.type;
      } else if (activity.action_type) {
        type = activity.action_type;
      }
      // Déterminer le chemin
      if (activity.url) {
        path = activity.url;
      } else if (activity.path) {
        path = activity.path;
      }
    }
    
    return { module, type, path };
  };

  // Mapper les icônes par module
  const getIcon = (module, type) => {
    switch (module) {
      case 'sales':
        return <FileTextOutlined />;
      case 'crm':
        return <TeamOutlined />;
      case 'hr':
        return <UserOutlined />;
      case 'payroll':
        return <DollarOutlined />;
      case 'accounting':
        return <BankOutlined />;
      case 'recruitment':
        return <SolutionOutlined />;
      default:
        return <ClockCircleOutlined />;
    }
  };

  // Mapper les couleurs des tags par module
  const getTagColor = (module) => {
    switch (module) {
      case 'sales': return 'blue';
      case 'crm': return 'green';
      case 'hr': return 'purple';
      case 'payroll': return 'gold';
      case 'accounting': return 'cyan';
      case 'recruitment': return 'orange';
      default: return 'default';
    }
  };

  // Mapper les noms des modules
  const getModuleName = (module) => {
    switch (module) {
      case 'sales': return 'Ventes';
      case 'crm': return 'CRM';
      case 'hr': return 'RH';
      case 'payroll': return 'Paie';
      case 'accounting': return 'Comptabilité';
      case 'recruitment': return 'Recrutement';
      default: return 'Activité';
    }
  };

  // Formater la date avec gestion des différents formats possibles
  const formatDate = (dateValue) => {
    try {
      // Si nous n'avons pas de date, retourner 'Date inconnue'
      if (!dateValue) return "Date inconnue";
      
      // Essayer plusieurs formats possibles pour la date
      let dateObject;
      
      // Si c'est déjà un objet Date
      if (dateValue instanceof Date) {
        dateObject = dateValue;
      }
      // Si c'est une chaîne ISO ou similaire
      else if (typeof dateValue === 'string') {
        // Remplacer certains formats non standard
        const cleanDateString = dateValue
          .replace(/(\d+)\/(\d+)\/(\d+)/, '$3-$2-$1') // Format DD/MM/YYYY -> YYYY-MM-DD
          .replace(/(\d+)-(\d+)-(\d+) (\d+):(\d+):(\d+)/, '$1-$2-$3T$4:$5:$6'); // Format YYYY-MM-DD HH:MM:SS -> YYYY-MM-DDThh:mm:ss
        
        dateObject = new Date(cleanDateString);
      }
      // Si c'est un timestamp numérique
      else if (typeof dateValue === 'number') {
        dateObject = new Date(dateValue);
      }
      
      // Vérifier si la date est valide
      if (isNaN(dateObject.getTime())) {
        console.warn('Invalid date after conversion:', dateValue);
        return "Date inconnue";
      }
      
      // Formatter la date en français
      return new Intl.DateTimeFormat('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }).format(dateObject);
    } catch (error) {
      console.error('Error formatting date:', error, 'Date value:', dateValue);
      return "Date inconnue";
    }
  };

  // Extraire le titre de l'activité
  const getActivityTitle = (activity) => {
    if (activity.title) return activity.title;
    if (activity.description) return activity.description.split('.')[0]; // Première phrase
    if (activity.action) return activity.action;
    if (activity.action_type) {
      const actionMap = {
        'create': 'Création',
        'update': 'Mise à jour',
        'delete': 'Suppression',
        'view': 'Consultation'
      };
      const objectType = activity.object_type || 'élément';
      return `${actionMap[activity.action_type] || activity.action_type} d'un ${objectType}`;
    }
    return "Activité";
  };

  // Extraire la description de l'activité
  const getActivityDescription = (activity) => {
    if (activity.description) return activity.description;
    if (activity.details) return activity.details;
    if (activity.action_type && activity.object_type) {
      return `Action: ${activity.action_type} sur ${activity.object_type} ${activity.object_id || ''}`;
    }
    return "";
  };

  // Extraire l'heure de l'activité
  const getActivityTime = (activity) => {
    // Essayer différentes propriétés possibles pour la date/heure
    return activity.time || activity.date || activity.timestamp || 
           activity.created_at || activity.created || activity.datetime ||
           activity.action_date || activity.action_time;
  };

  return (
    <Card title="Activités récentes">
      <List
        itemLayout="horizontal"
        dataSource={displayActivities}
        renderItem={item => {
          const { module, type, path } = analyzeActivity(item);
          const title = getActivityTitle(item);
          const description = getActivityDescription(item);
          const time = getActivityTime(item);
          
          return (
            <List.Item key={item.id || Math.random().toString()}>
              <List.Item.Meta
                avatar={<Avatar icon={getIcon(module, type)} />}
                title={
                  <Link to={path}>
                    {title}
                    <Tag color={getTagColor(module)} style={{ marginLeft: 8 }}>
                      {getModuleName(module)}
                    </Tag>
                  </Link>
                }
                description={
                  <>
                    <Text>{description}</Text>
                    <br />
                    <Text type="secondary">{formatDate(time)}</Text>
                  </>
                }
              />
            </List.Item>
          );
        }}
      />
    </Card>
  );
};

export default RecentActivity;
