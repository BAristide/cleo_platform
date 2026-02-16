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

        {/* Redirection par défaut */}
        <Route path="*" element={<Navigate to="/hr" replace />} />
      </Routes>
    </Layout>
  );
};

export default HRRoutes;
