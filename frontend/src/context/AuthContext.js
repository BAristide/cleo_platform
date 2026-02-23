import React, { createContext, useState, useEffect } from 'react';
import axios from '../utils/axiosConfig';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const checkAuthStatus = async () => {
    try {
      const res = await axios.get('/api/check-auth/');
      if (res.data.authenticated) {
        setIsAuthenticated(true);
        setUser({
          username: res.data.username,
          email: res.data.email,
          fullName: res.data.full_name,
          isSuperuser: res.data.is_superuser,
          isStaff: res.data.is_staff,
          roles: res.data.roles,
          modulesAccess: res.data.modules_access,
        });
      } else {
        setIsAuthenticated(false);
        setUser(null);
      }
    } catch (error) {
      setIsAuthenticated(false);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkAuthStatus();
  }, []);

  // Fonction pour gérer la déconnexion
  const logout = () => {
    window.location.href = '/logout/';
  };

  // Fonction pour rafraîchir les données utilisateur (après PATCH /me/)
  const refreshUser = () => {
    checkAuthStatus();
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, user, loading, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
};
