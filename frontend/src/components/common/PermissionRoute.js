// src/components/common/PermissionRoute.js
import React, { useContext } from 'react';
import { Navigate } from 'react-router-dom';
import { Result, Button } from 'antd';
import { AuthContext } from '../../context/AuthContext';

/**
 * Garde de route basée sur les permissions module.
 * Usage: <PermissionRoute module="sales" level="read"><SalesRoutes /></PermissionRoute>
 *
 * @param {string} module - Le nom du module (ex: 'sales', 'hr', 'accounting')
 * @param {string} level - Le niveau minimum requis (default: 'read')
 */

const ACCESS_HIERARCHY = {
  'no_access': 0,
  'read': 1,
  'create': 2,
  'update': 3,
  'delete': 4,
  'admin': 5,
};

const PermissionRoute = ({ children, module, level = 'read' }) => {
  const { user } = useContext(AuthContext);

  // Superuser bypass
  if (user?.isSuperuser) {
    return children;
  }

  const userLevel = user?.modulesAccess?.[module] || 'no_access';
  const userScore = ACCESS_HIERARCHY[userLevel] || 0;
  const requiredScore = ACCESS_HIERARCHY[level] || 0;

  if (userScore >= requiredScore) {
    return children;
  }

  return (
    <Result
      status="403"
      title="Accès refusé"
      subTitle={`Vous n'avez pas les permissions nécessaires pour accéder au module ${module}.`}
      extra={
        <Button type="primary" onClick={() => window.location.href = '/'}>
          Retour au tableau de bord
        </Button>
      }
    />
  );
};

/**
 * Hook utilitaire pour vérifier les permissions dans un composant.
 */
export const useModuleAccess = () => {
  const { user } = useContext(AuthContext);

  const hasAccess = (module, level = 'read') => {
    if (user?.isSuperuser) return true;
    const userLevel = user?.modulesAccess?.[module] || 'no_access';
    const userScore = ACCESS_HIERARCHY[userLevel] || 0;
    const requiredScore = ACCESS_HIERARCHY[level] || 0;
    return userScore >= requiredScore;
  };

  const getAccessLevel = (module) => {
    if (user?.isSuperuser) return 'admin';
    return user?.modulesAccess?.[module] || 'no_access';
  };

  return { hasAccess, getAccessLevel };
};

export default PermissionRoute;
