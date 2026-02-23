// src/components/common/AdminRoute.js
import React, { useContext } from 'react';
import { Navigate } from 'react-router-dom';
import { message } from 'antd';
import { AuthContext } from '../../context/AuthContext';

const AdminRoute = ({ children }) => {
  const { user } = useContext(AuthContext);

  const isAdmin = user?.isSuperuser || user?.modulesAccess?.core === 'admin';

  if (!isAdmin) {
    message.error("Vous n'avez pas les droits pour accéder à cette page.");
    return <Navigate to="/" replace />;
  }

  return children;
};

export default AdminRoute;
