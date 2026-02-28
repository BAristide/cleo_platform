import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Spin, ConfigProvider } from 'antd';
import frFR from 'antd/locale/fr_FR';
import './App.css';
import ExecutiveDashboard from './components/dashboard/ExecutiveDashboard';
import CRMRoutes from './components/crm/Routes';
import SalesRoutes from './components/sales/Routes';
import CatalogRoutes from './components/catalog/Routes';
import HRRoutes from './components/hr/Routes';
import PayrollRoutes from './components/payroll/Routes';
import AccountingRoutes from './components/accounting/Routes';
import RecruitmentRoutes from './components/recruitment/Routes';
import InventoryRoutes from './components/inventory/Routes';
import PurchasingRoutes from './components/purchasing/Routes';
import SetupWizard from './components/setup/SetupWizard';
import { AuthProvider } from './context/AuthContext';
import { CompanyProvider } from './context/CompanyContext';
import { CurrencyProvider } from './context/CurrencyContext';
import PrivateRoute from './components/PrivateRoute';
import PermissionRoute from './components/common/PermissionRoute';
import ProfilePage from './components/profile/ProfilePage';
import ChangePassword from './components/profile/ChangePassword';
import UserRoutes from './components/users/UserRoutes';
import AdminRoute from './components/common/AdminRoute';
import NotificationCenter from './components/notifications/NotificationCenter';
import NotificationPreferences from './components/notifications/NotificationPreferences';
import PlatformSettings from './components/settings/PlatformSettings';
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

  if (!setupStatus?.setup_completed) {
    return (
      <AuthProvider>
        <ConfigProvider locale={frFR}>
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
        </ConfigProvider>
      </AuthProvider>
    );
  }

  return (
    <AuthProvider>
      <CompanyProvider>
        <CurrencyProvider>
        <ConfigProvider locale={frFR}>
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
                  <PermissionRoute module="crm">
                    <CRMRoutes />
                  </PermissionRoute>
                </PrivateRoute>
              } />
              <Route path="/catalog/*" element={
                <PrivateRoute>
                  <PermissionRoute module="sales">
                    <CatalogRoutes />
                  </PermissionRoute>
                </PrivateRoute>
              } />
              <Route path="/sales/*" element={
                <PrivateRoute>
                  <PermissionRoute module="sales">
                    <SalesRoutes />
                  </PermissionRoute>
                </PrivateRoute>
              } />
              <Route path="/hr/*" element={
                <PrivateRoute>
                  <PermissionRoute module="hr">
                    <HRRoutes />
                  </PermissionRoute>
                </PrivateRoute>
              } />
              <Route path="/payroll/*" element={
                <PrivateRoute>
                  <PermissionRoute module="payroll">
                    <PayrollRoutes />
                  </PermissionRoute>
                </PrivateRoute>
              } />
              <Route path="/accounting/*" element={
                <PrivateRoute>
                  <PermissionRoute module="accounting">
                    <AccountingRoutes />
                  </PermissionRoute>
                </PrivateRoute>
              } />
              <Route path="/recruitment/*" element={
                <PrivateRoute>
                  <PermissionRoute module="recruitment">
                    <RecruitmentRoutes />
                  </PermissionRoute>
                </PrivateRoute>
              } />
              <Route path="/purchasing/*" element={
                <PrivateRoute>
                  <PermissionRoute module="purchasing">
                    <PurchasingRoutes />
                  </PermissionRoute>
                </PrivateRoute>
              } />
              <Route path="/inventory/*" element={
                <PrivateRoute>
                  <PermissionRoute module="inventory">
                    <InventoryRoutes />
                  </PermissionRoute>
                </PrivateRoute>
              } />

              <Route path="/settings" element={
                <PrivateRoute>
                  <AdminRoute>
                    <PlatformSettings />
                  </AdminRoute>
                </PrivateRoute>
              } />

              <Route path="/notifications" element={
                <PrivateRoute>
                  <NotificationCenter />
                </PrivateRoute>
              } />
              <Route path="/notifications/preferences" element={
                <PrivateRoute>
                  <NotificationPreferences />
                </PrivateRoute>
              } />
              <Route path="/setup" element={<Navigate to="/" replace />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Router>
        </ConfigProvider>
      </CurrencyProvider>
        </CompanyProvider>
    </AuthProvider>
  );
}

export default App;
