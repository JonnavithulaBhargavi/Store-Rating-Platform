import React, { createContext, useState, useContext, useEffect } from 'react';
import axios from 'axios';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Check if the user is already logged in (session validation)
  useEffect(() => {
    const validateSession = async () => {
      try {
        setLoading(true);
        // Call to backend to validate session token
        const response = await axios.get('/api/auth/me', { withCredentials: true });
        if (response.data.user) {
          setCurrentUser(response.data.user);
        }
      } catch (err) {
        // Session invalid or expired
        setCurrentUser(null);
        console.error('Session validation error:', err);
      } finally {
        setLoading(false);
      }
    };

    validateSession();
  }, []);

  const login = async (email, password) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await axios.post('/api/auth/login', { email, password }, { withCredentials: true });
      
      if (response.data.user) {
        setCurrentUser(response.data.user);
        return response.data.user;
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed. Please try again.');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const signup = async (userData) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await axios.post('/api/auth/signup', userData, { withCredentials: true });
      
      if (response.data.user) {
        setCurrentUser(response.data.user);
        return response.data.user;
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Signup failed. Please try again.');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      setLoading(true);
      await axios.post('/api/auth/logout', {}, { withCredentials: true });
      setCurrentUser(null);
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      setLoading(false);
    }
  };

  const updatePassword = async (currentPassword, newPassword) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await axios.put('/api/auth/password', { 
        currentPassword, 
        newPassword 
      }, { withCredentials: true });
      
      return response.data;
    } catch (err) {
      setError(err.response?.data?.message || 'Password update failed.');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Helper functions to check user roles
  const isAdmin = () => currentUser?.role === 'ADMIN';
  const isStoreOwner = () => currentUser?.role === 'STORE_OWNER';
  const isNormalUser = () => currentUser?.role === 'USER';

  const value = {
    currentUser,
    loading,
    error,
    login,
    signup,
    logout,
    updatePassword,
    isAdmin,
    isStoreOwner,
    isNormalUser
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export default AuthContext;
