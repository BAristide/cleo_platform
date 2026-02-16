// src/components/recruitment/Routes.js
import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './Layout';
import Dashboard from './Dashboard';

// Gestion des offres d'emploi
import JobOpeningList from './JobOpeningList';
import JobOpeningDetail from './JobOpeningDetail';
import JobOpeningForm from './JobOpeningForm';

// Gestion des candidatures
import ApplicationList from './ApplicationList';
import ApplicationDetail from './ApplicationDetail';
import InterviewScheduleForm from './InterviewScheduleForm';

// Gestion des évaluations
import EvaluationForm from './EvaluationForm';
import EvaluationDetail from './EvaluationDetail';

// Statistiques
import RecruitmentStats from './RecruitmentStats';

const RecruitmentRoutes = () => {
  return (
    <Layout>
      <Routes>
        {/* Dashboard */}
        <Route path="/" element={<Dashboard />} />
        
        {/* Offres d'emploi */}
        <Route path="/job-openings" element={<JobOpeningList />} />
        <Route path="/job-openings/new" element={<JobOpeningForm />} />
        <Route path="/job-openings/:id" element={<JobOpeningDetail />} />
        <Route path="/job-openings/:id/edit" element={<JobOpeningForm />} />
        
        {/* Candidatures */}
        <Route path="/applications" element={<ApplicationList />} />
        <Route path="/applications/:id" element={<ApplicationDetail />} />
        <Route path="/applications/:id/schedule-interview" element={<InterviewScheduleForm />} />
        
        {/* Candidatures par offre d'emploi */}
        <Route path="/job-openings/:jobId/applications" element={<ApplicationList />} />
        
        {/* Évaluations */}
        <Route path="/applications/:applicationId/evaluate" element={<EvaluationForm />} />
        <Route path="/evaluations/:id" element={<EvaluationDetail />} />
        
        {/* Statistiques */}
        <Route path="/statistics" element={<RecruitmentStats />} />
        
        {/* Redirection par défaut */}
        <Route path="*" element={<Navigate to="/recruitment" replace />} />
      </Routes>
    </Layout>
  );
};

export default RecruitmentRoutes;
