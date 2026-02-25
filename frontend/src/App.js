import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Spin } from 'antd';
import './App.css';
import ExecutiveDashboard from './components/dashboard/ExecutiveDashboard';
import CRMRoutes from './components/crm/Routes';
import SalesRoutes from './components/sales/Routes';
import HRRoutes from './components/hr/Routes';
import PayrollRoutes from './components/payroll/Routes';
import AccountingRoutes from './components/accounting/Routes';
import RecruitmentRoutes from './components/recruitment/Routes';
import InventoryRoutes from './components/inventory/Routes';
import PurchasingRoutes from './components/purchasing/Routes';
import SetupWizard from './components/setup/SetupWizard';
import { AuthProvider } from './context/AuthContext';
import { CurrencyProvider } from './context/CurrencyContext';
import PrivateRoute from './components/PrivateRoute';
import ProfilePage from './components/profile/ProfilePage';
import ChangePassword from './components/profile/ChangePassword';
import UserRoutes from './components/users/UserRoutes';
import AdminRoute from './components/common/AdminRoute';
import axios from './utils/axiosConfig';

function App() {
  const [setupStatus, setSetupStatus] = useState(null);
  const [checkingSetup, setCheckingSetup] = useState(true);

  useEffect(() => {
    const checkSetup = async () => {
      try {
        const res = await axios.get('/api/core/setup/status/');
        setSetupStatus(res.data);
      } catch (err) {
        // Si l'API échoue, on suppose que le setup est fait (mode dégradé)
        setSetupStatus({ setup_completed: true });
      } finally {
        setCheckingSetup(false);
      }
    };
    checkSetup();
  }, []);

  if (checkingSetup) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <Spin size="large" tip="Vérification de la configuration..." />
      </div>
    );
  }

  // Si le setup n'est pas fait, afficher le wizard
  if (!setupStatus?.setup_completed) {
    return (
      <AuthProvider>
        <Router>
          <Routes>
            <Route path="/setup" element={
              <PrivateRoute>
                <AdminRoute>
                  <SetupWizard />
                </AdminRoute>
              </PrivateRoute>
            } />
            <Route path="*" element={<Navigate to="/setup" replace />} />
          </Routes>
        </Router>
      </AuthProvider>
    );
  }

  // Setup fait : application normale
  return (
    <AuthProvider>
      <CurrencyProvider>
        <Router>
          <Routes>
            <Route path="/" element={
              <PrivateRoute>
                <ExecutiveDashboard />
              </PrivateRoute>
            } />
            <Route path="/profile" element={
              <PrivateRoute>
                <ProfilePage />
              </PrivateRoute>
            } />
            <Route path="/profile/password" element={
              <PrivateRoute>
                <ChangePassword />
              </PrivateRoute>
            } />
            <Route path="/users/*" element={
              <PrivateRoute>
                <AdminRoute>
                  <UserRoutes />
                </AdminRoute>
              </PrivateRoute>
            } />
            <Route path="/crm/*" element={
              <PrivateRoute>
                <CRMRoutes />
              </PrivateRoute>
            } />
            <Route path="/sales/*" element={
              <PrivateRoute>
                <SalesRoutes />
              </PrivateRoute>
            } />
            <Route path="/hr/*" element={
              <PrivateRoute>
                <HRRoutes />
              </PrivateRoute>
            } />
            <Route path="/payroll/*" element={
              <PrivateRoute>
                <PayrollRoutes />
              </PrivateRoute>
            } />
            <Route path="/accounting/*" element={
              <PrivateRoute>
                <AccountingRoutes />
              </PrivateRoute>
            } />
            <Route path="/recruitment/*" element={
              <PrivateRoute>
                <RecruitmentRoutes />
              </PrivateRoute>
            } />
            <Route path="/purchasing/*" element={
              <PrivateRoute>
                <PurchasingRoutes />
              </PrivateRoute>
            } />
            <Route path="/inventory/*" element={
              <PrivateRoute>
                <InventoryRoutes />
              </PrivateRoute>
            } />
            <Route path="/setup" element={<Navigate to="/" replace />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Router>
      </CurrencyProvider>
    </AuthProvider>
  );
}

export default App;
