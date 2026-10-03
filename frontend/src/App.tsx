import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import ProtectedRoute from './routes/ProtectedRoute';

import Landing from './pages/public/Landing';
import Login from './pages/public/Login';
import Register from './pages/public/Register';
import PublicSubmission from './pages/public/PublicSubmission';

import StudentDashboard from './pages/student/Dashboard';
import StudentAssignments from './pages/student/Assignments';
import SubmissionDetail from './pages/student/SubmissionDetail';
import Workspaces from './pages/student/Workspaces';
import WorkspaceDetail from './pages/student/WorkspaceDetail';
import StudentProgress from './pages/student/Progress';
import QuizPage from './pages/student/QuizPage';

import TeacherDashboard from './pages/teacher/Dashboard';
import TeacherClasses from './pages/teacher/Classes';
import TeacherClassDetail from './pages/teacher/ClassDetail';
import TeacherSubmissions from './pages/teacher/Submissions';

import AdminOverview from './pages/admin/Overview';
import AdminUsers from './pages/admin/Users';
import AIUsage from './pages/admin/AIUsage';

export default function App() {
  const { user } = useAuth();

  return (
    <Routes>
      <Route path="/" element={user ? <Navigate to={`/${user.role}`} replace /> : <Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/submissions/public/:assignmentId" element={<PublicSubmission />} />

      <Route path="/student" element={<ProtectedRoute roles={['student']}><StudentDashboard /></ProtectedRoute>} />
      <Route path="/student/assignments" element={<ProtectedRoute roles={['student']}><StudentAssignments /></ProtectedRoute>} />
      <Route path="/student/assignments/:assignmentId/submit" element={<ProtectedRoute roles={['student']}><PublicSubmission /></ProtectedRoute>} />
      <Route path="/student/submissions/:id" element={<ProtectedRoute roles={['student']}><SubmissionDetail /></ProtectedRoute>} />
      <Route path="/student/quiz" element={<ProtectedRoute roles={['student']}><QuizPage /></ProtectedRoute>} />
      <Route path="/student/workspaces" element={<ProtectedRoute roles={['student']}><Workspaces /></ProtectedRoute>} />
      <Route path="/student/workspaces/:id" element={<ProtectedRoute roles={['student']}><WorkspaceDetail /></ProtectedRoute>} />
      <Route path="/student/progress" element={<ProtectedRoute roles={['student']}><StudentProgress /></ProtectedRoute>} />

      <Route path="/teacher" element={<ProtectedRoute roles={['teacher']}><TeacherDashboard /></ProtectedRoute>} />
      <Route path="/teacher/classes" element={<ProtectedRoute roles={['teacher']}><TeacherClasses /></ProtectedRoute>} />
      <Route path="/teacher/classes/:id" element={<ProtectedRoute roles={['teacher']}><TeacherClassDetail /></ProtectedRoute>} />
      <Route path="/teacher/submissions" element={<ProtectedRoute roles={['teacher']}><TeacherSubmissions /></ProtectedRoute>} />

      <Route path="/admin" element={<ProtectedRoute roles={['admin']}><AdminOverview /></ProtectedRoute>} />
      <Route path="/admin/users" element={<ProtectedRoute roles={['admin']}><AdminUsers /></ProtectedRoute>} />
      <Route path="/admin/ai-usage" element={<ProtectedRoute roles={['admin']}><AIUsage /></ProtectedRoute>} />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
