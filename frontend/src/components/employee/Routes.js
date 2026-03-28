// src/components/employee/Routes.js
import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './Layout';
import Dashboard from './Dashboard';
import LeaveList from './LeaveList';
import LeaveRequestForm from './LeaveRequestForm';
import LeaveBalanceDashboard from './LeaveBalanceDashboard';
import TeamCalendar from './TeamCalendar';
import ExpenseList from './ExpenseList';
import ExpenseReportForm from './ExpenseReportForm';
import WorkCertificateList from './WorkCertificateList';
import WorkCertificateForm from './WorkCertificateForm';
import ComplaintManagement from './ComplaintManagement';
import ComplaintForm from './ComplaintForm';
import PaySlipList from './PaySlipList';
import AnnouncementFeed from './AnnouncementFeed';
import RewardBoard from './RewardBoard';
import TrainingRequestList from './TrainingRequestList';
import TrainingRequestForm from './TrainingRequestForm';
import ApprovalDashboard from '../common/ApprovalDashboard';

const EmployeeRoutes = () => {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/leaves" element={<LeaveList />} />
        <Route path="/leaves/new" element={<LeaveRequestForm />} />
        <Route path="/leaves/calendar" element={<TeamCalendar />} />
        <Route path="/expenses" element={<ExpenseList />} />
        <Route path="/expenses/new" element={<ExpenseReportForm />} />
        <Route path="/expenses/:id/edit" element={<ExpenseReportForm />} />
        <Route path="/certificates" element={<WorkCertificateList />} />
        <Route path="/certificates/new" element={<WorkCertificateForm />} />
        <Route path="/complaints" element={<ComplaintManagement />} />
        <Route path="/complaints/new" element={<ComplaintForm />} />
        <Route path="/payslips" element={<PaySlipList />} />
        <Route path="/announcements" element={<AnnouncementFeed />} />
        <Route path="/rewards" element={<RewardBoard />} />
        <Route path="/training" element={<TrainingRequestList />} />
        <Route path="/training/new" element={<TrainingRequestForm />} />
        <Route path="/training/:id/edit" element={<TrainingRequestForm />} />
        <Route path="/approvals" element={<ApprovalDashboard />} />
        <Route path="*" element={<Navigate to="/my-space" replace />} />
      </Routes>
    </Layout>
  );
};

export default EmployeeRoutes;
