// src/components/hr/Routes.js
import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './Layout';
import Dashboard from './Dashboard';

// Employés
import EmployeeList from './EmployeeList';
import EmployeeDetail from './EmployeeDetail';
import EmployeeForm from './forms/EmployeeForm';

// Départements et postes
import DepartmentList from './DepartmentList';
import DepartmentDetail from './DepartmentDetail';
import JobTitleList from './JobTitleList';
import JobTitleDetail from './JobTitleDetail';

// Missions et disponibilités
import MissionList from './MissionList';
import MissionDetail from './MissionDetail';
import MissionForm from './forms/MissionForm';
import AvailabilityList from './AvailabilityList';
import AvailabilityForm from './forms/AvailabilityForm';

// Compétences et formations
import SkillList from './SkillList';
import SkillDetail from './SkillDetail';
import TrainingCourseList from './TrainingCourseList';
import TrainingCourseDetail from './TrainingCourseDetail';
import TrainingPlanList from './TrainingPlanList';
import TrainingPlanDetail from './TrainingPlanDetail';
import TrainingPlanForm from './forms/TrainingPlanForm';

// Portail et communication
import EmployeePortal from './EmployeePortal';
import AnnouncementFeed from './AnnouncementFeed';
import AnnouncementForm from './AnnouncementForm';
import WorkCertificateList from './WorkCertificateList';
import WorkCertificateForm from './WorkCertificateForm';
import ComplaintForm from './ComplaintForm';
import ComplaintManagement from './ComplaintManagement';
import RewardBoard from './RewardBoard';
import RewardForm from './forms/RewardForm';

// Congés — EVO-09
import LeaveList from './LeaveList';
import LeaveRequestForm from './forms/LeaveRequestForm';

// Notes de frais — EVO-10
import ExpenseList from './ExpenseList';
import ExpenseReportForm from './forms/ExpenseReportForm';

const HRRoutes = () => {
  return (
    <Layout>
      <Routes>
        {/* Dashboard */}
        <Route path="/" element={<Dashboard />} />

        {/* Employés */}
        <Route path="/employees" element={<EmployeeList />} />
        <Route path="/employees/new" element={<EmployeeForm />} />
        <Route path="/employees/:id" element={<EmployeeDetail />} />
        <Route path="/employees/:id/edit" element={<EmployeeForm />} />

        {/* Départements */}
        <Route path="/departments" element={<DepartmentList />} />
        <Route path="/departments/new" element={<DepartmentDetail />} />
        <Route path="/departments/:id" element={<DepartmentDetail />} />

        {/* Postes */}
        <Route path="/job-titles" element={<JobTitleList />} />
        <Route path="/job-titles/:id" element={<JobTitleDetail />} />

        {/* Missions */}
        <Route path="/missions" element={<MissionList />} />
        <Route path="/missions/new" element={<MissionForm />} />
        <Route path="/missions/:id" element={<MissionDetail />} />
        <Route path="/missions/:id/edit" element={<MissionForm />} />

        {/* Disponibilités */}
        <Route path="/availabilities" element={<AvailabilityList />} />
        <Route path="/availabilities/new" element={<AvailabilityForm />} />
        <Route path="/availabilities/:id/edit" element={<AvailabilityForm />} />

        {/* Compétences */}
        <Route path="/skills" element={<SkillList />} />
        <Route path="/skills/:id" element={<SkillDetail />} />

        {/* Formations */}
        <Route path="/training-courses" element={<TrainingCourseList />} />
        <Route path="/training-courses/:id" element={<TrainingCourseDetail />} />

        {/* Plans de formation */}
        <Route path="/training-plans" element={<TrainingPlanList />} />
        <Route path="/training-plans/new" element={<TrainingPlanForm />} />
        <Route path="/training-plans/:id" element={<TrainingPlanDetail />} />
        <Route path="/training-plans/:id/edit" element={<TrainingPlanForm />} />

        {/* Portail employé */}
        <Route path="/portal" element={<EmployeePortal />} />

        {/* Annonces */}
        <Route path="/announcements" element={<AnnouncementFeed />} />
        <Route path="/announcements/new" element={<AnnouncementForm />} />

        {/* Attestations */}
        <Route path="/certificates" element={<WorkCertificateList />} />
        <Route path="/certificates/new" element={<WorkCertificateForm />} />

        {/* Doléances */}
        <Route path="/complaints" element={<ComplaintManagement />} />
        <Route path="/complaints/new" element={<ComplaintForm />} />

        {/* Récompenses */}
        <Route path="/rewards" element={<RewardBoard />} />
        <Route path="/rewards/new" element={<RewardForm />} />

        {/* Congés — EVO-09 */}
        <Route path="/leaves" element={<LeaveList />} />
        <Route path="/leaves/new" element={<LeaveRequestForm />} />

        {/* Notes de frais — EVO-10 */}
        <Route path="/expenses" element={<ExpenseList />} />
        <Route path="/expenses/new" element={<ExpenseReportForm />} />
        <Route path="/expenses/:id/edit" element={<ExpenseReportForm />} />

        {/* Redirection par défaut */}
        <Route path="*" element={<Navigate to="/hr" replace />} />
      </Routes>
    </Layout>
  );
};

export default HRRoutes;
