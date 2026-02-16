// src/components/payroll/Routes.js
import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './Layout';
import Dashboard from './Dashboard';
import PayrollPeriodList from './PayrollPeriodList';
import PayrollRunList from './PayrollRunList';
import PayrollRunDetail from './PayrollRunDetail';
import PaySlipList from './PaySlipList';
import PaySlipDetail from './PaySlipDetail';
import EmployeePayrollList from './EmployeePayrollList';
import AdvanceSalaryList from './AdvanceSalaryList';
import { Typography, Empty, Button } from 'antd';
import { Link } from 'react-router-dom';

const { Title } = Typography;

// Composant temporaire pour les routes non encore implémentées
const ComingSoon = ({ title }) => (
  <div style={{ textAlign: 'center', padding: '50px 0' }}>
    <Empty 
      description={
        <span>
          <Title level={4}>{title} - Fonctionnalité à venir</Title>
          <p>Cette fonctionnalité est en cours de développement et sera bientôt disponible.</p>
        </span>
      }
    >
      <Button type="primary">
        <Link to="/payroll">Retour au tableau de bord</Link>
      </Button>
    </Empty>
  </div>
);

const PayrollRoutes = () => {
  return (
    <Layout>
      <Routes>
        {/* Dashboard */}
        <Route path="/" element={<Dashboard />} />

        {/* Périodes de paie */}
        <Route path="/periods" element={<PayrollPeriodList />} />
        <Route path="/periods/new" element={<ComingSoon title="Nouvelle période de paie" />} />
        <Route path="/periods/:id" element={<ComingSoon title="Détail période de paie" />} />
        
        {/* Lancements de paie */}
        <Route path="/runs" element={<PayrollRunList />} />
        <Route path="/runs/new" element={<ComingSoon title="Nouveau lancement de paie" />} />
        <Route path="/runs/:id" element={<PayrollRunDetail />} />
        
        {/* Bulletins de paie */}
        <Route path="/payslips" element={<PaySlipList />} />
        <Route path="/payslips/:id" element={<PaySlipDetail />} />
        
        {/* Données de paie des employés */}
        <Route path="/employee-payrolls" element={<EmployeePayrollList />} />
        <Route path="/employee-payrolls/new" element={<ComingSoon title="Nouvelles données de paie" />} />
        <Route path="/employee-payrolls/:id" element={<ComingSoon title="Détail données de paie" />} />
        
        {/* Acomptes */}
        <Route path="/advances" element={<AdvanceSalaryList />} />
        <Route path="/advances/new" element={<ComingSoon title="Nouvel acompte" />} />
        <Route path="/advances/:id" element={<ComingSoon title="Détail acompte" />} />

        {/* Redirection par défaut */}
        <Route path="*" element={<Navigate to="/payroll" replace />} />
      </Routes>
    </Layout>
  );
};

export default PayrollRoutes;
