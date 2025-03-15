// client/src/App.js
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ChakraProvider, CSSReset, Box } from '@chakra-ui/react';
import { AuthProvider } from './context/AuthContext';

// Auth Components
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import ProtectedRoute from './components/ProtectedRoute';

// Admin Pages
import AdminDashboard from './pages/admin/Dashboard';
import AdminUsers from './pages/admin/Users';
import AdminStores from './pages/admin/Stores';
import AdminAddUser from './pages/admin/AddUser';
import AdminAddStore from './pages/admin/AddStore';
import AdminEditUser from './pages/admin/EditUser';
import AdminEditStore from './pages/admin/EditStore';

// Normal User Pages
import UserDashboard from './pages/user/Dashboard';
import UserProfile from './pages/user/Profile';

// Store Owner Pages
import OwnerDashboard from './pages/owner/Dashboard';
import OwnerProfile from './pages/owner/Profile';

// Shared Components
import Navbar from './components/Navbar';
import ChangePassword from './pages/shared/ChangePassword';
import NotFound from './pages/shared/NotFound';

function App() {
  return (
    <ChakraProvider>
      <CSSReset />
      <AuthProvider>
        <Router>
          <Navbar />
          <Box p={4}>
            <Routes>
              {/* Public Routes */}
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              
              {/* Redirect root to appropriate dashboard based on role */}
              <Route path="/" element={<Navigate to="/login" replace />} />
              
              {/* Admin Routes */}
              <Route 
                path="/admin/dashboard" 
                element={
                  <ProtectedRoute allowedRoles={['system_admin']}>
                    <AdminDashboard />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/admin/users" 
                element={
                  <ProtectedRoute allowedRoles={['system_admin']}>
                    <AdminUsers />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/admin/stores" 
                element={
                  <ProtectedRoute allowedRoles={['system_admin']}>
                    <AdminStores />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/admin/users/add" 
                element={
                  <ProtectedRoute allowedRoles={['system_admin']}>
                    <AdminAddUser />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/admin/stores/add" 
                element={
                  <ProtectedRoute allowedRoles={['system_admin']}>
                    <AdminAddStore />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/admin/users/edit/:id" 
                element={
                  <ProtectedRoute allowedRoles={['system_admin']}>
                    <AdminEditUser />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/admin/stores/edit/:id" 
                element={
                  <ProtectedRoute allowedRoles={['system_admin']}>
                    <AdminEditStore />
                  </ProtectedRoute>
                } 
              />
              
              {/* Normal User Routes */}
              <Route 
                path="/user/dashboard" 
                element={
                  <ProtectedRoute allowedRoles={['normal_user']}>
                    <UserDashboard />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/user/profile" 
                element={
                  <ProtectedRoute allowedRoles={['normal_user']}>
                    <UserProfile />
                  </ProtectedRoute>
                } 
              />
              
              {/* Store Owner Routes */}
              <Route 
                path="/owner/dashboard" 
                element={
                  <ProtectedRoute allowedRoles={['store_owner']}>
                    <OwnerDashboard />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/owner/profile" 
                element={
                  <ProtectedRoute allowedRoles={['store_owner']}>
                    <OwnerProfile />
                  </ProtectedRoute>
                } 
              />
              
              {/* Shared Routes */}
              <Route 
                path="/change-password" 
                element={
                  <ProtectedRoute allowedRoles={['system_admin', 'normal_user', 'store_owner']}>
                    <ChangePassword />
                  </ProtectedRoute>
                } 
              />
              
              {/* 404 Page */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Box>
        </Router>
      </AuthProvider>
    </ChakraProvider>
  );
}

export default App;
