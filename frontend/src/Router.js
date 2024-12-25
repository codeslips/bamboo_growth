import React from 'react';
import { HashRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import { Layout } from './Layout';
import Index from './pages/index/index';
import Home from './pages/Home';
import BambooLanguage from './pages/BambooLanguage';
import CourseList from './pages/CourseList';
import CourseRecord from './pages/DubbingLeaning';
import BasicLogin from './pages/BasicLogin';
import CourseDetail from './pages/CourseDetail';
import CourseShare from './pages/CourseShare'; // Add this import
import LessonLearning from './pages/LessonLearning';
import User from './pages/User';
import UserLessons from './pages/UserLessons';
import UserManagement from './pages/UserManagement';
import LessonResultsList from './pages/LessonResults';
import Lessons from './pages/Lessons';
import UserGroupList from './pages/UserGroupList';
import UserGroup from './pages/UserGroup';
import LessonTypes from './pages/LessonTypes';
import UserLearningResult from './pages/UserLearningResult';
import Resources from './pages/Resources';

// Add this new component
const ProtectedRoute = ({ children }) => {
  const isAuthenticated = localStorage.getItem('token'); // Assuming you store the auth token in localStorage
  return isAuthenticated ? children : <Navigate to="/login" replace />;
};

function AppRouter() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<BasicLogin />} />
        <Route element={<Layout />}>
          <Route path="/" element={<ProtectedRoute><Index /></ProtectedRoute>} />
          {/* Protected routes */}
          <Route path="/home" element={<ProtectedRoute><Home /></ProtectedRoute>} />
          <Route path="/bamboo-language" element={<ProtectedRoute><BambooLanguage /></ProtectedRoute>} />
          <Route path="/course-list" element={<ProtectedRoute><CourseList /></ProtectedRoute>} />
          <Route path="/courses" element={<ProtectedRoute><CourseDetail /></ProtectedRoute>} />
          <Route path="/user" element={<ProtectedRoute><User /></ProtectedRoute>} />
          <Route path="/user-lessons" element={<ProtectedRoute><UserLessons /></ProtectedRoute>} />
          <Route path="/user-management" element={<ProtectedRoute><UserManagement /></ProtectedRoute>} />
          <Route path="/lesson-results" element={<ProtectedRoute><LessonResultsList /></ProtectedRoute>} />
          <Route path="/lessons-list" element={<ProtectedRoute><Lessons /></ProtectedRoute>} />
          <Route path="/groups" element={<ProtectedRoute><UserGroupList /></ProtectedRoute>} />
          <Route path="/groups/:groupHash" element={<ProtectedRoute><UserGroup /></ProtectedRoute>} />
          <Route path="/lesson-types" element={<ProtectedRoute><LessonTypes /></ProtectedRoute>} />
          <Route path="/user-learning-result" element={<ProtectedRoute><UserLearningResult /></ProtectedRoute>} />
          <Route path="/resources" element={<ProtectedRoute><Resources /></ProtectedRoute>} />
        </Route>
        <Route path="/share/:hash" element={<CourseShare />} />
        <Route path="/lessons" element={<ProtectedRoute><LessonLearning /></ProtectedRoute>} />
      </Routes>
    </Router>
  );
}

export default AppRouter;