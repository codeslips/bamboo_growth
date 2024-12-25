import React, { createContext, useContext, useState, useEffect } from 'react';
import { post } from '../api';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        setIsLoading(true);
        const token = localStorage.getItem('token');
        if (token) {
          const userData = localStorage.getItem('user');
          if (userData) {
            const parsedUser = JSON.parse(userData);
            const finalUser = typeof parsedUser === 'string' ? JSON.parse(parsedUser) : parsedUser;
            setUser(finalUser);
          }
        }
      } catch (error) {
        console.error('Auth initialization error:', error);
      } finally {
        setIsLoading(false);
      }
    };

    initializeAuth();
  }, []);

  const login = async (mobilePhone, password) => {
    try {
      setError(null);
      const formData = {
        mobile_phone: mobilePhone,
        password: password
      };

      const response = await post('/auth/login', formData);
      
      console.log('Raw response data:', response);
      const { user: userData, access_token } = response;
      
      const userObject = typeof userData === 'string' ? JSON.parse(userData) : userData;
      
      localStorage.setItem('token', access_token);
      localStorage.setItem('user', JSON.stringify(userObject));
      
      setUser(userObject);
      return userObject;
    } catch (err) {
      setError(err.message || 'An error occurred during login');
      throw err;
    }
  };

  const signup = async (userData) => {
    try {
      setError(null);
      const response = await post('/auth/signup', userData);
      return response;
    } catch (err) {
      setError(err.message || 'An error occurred during signup');
      throw err;
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
  };

  const updateUser = (userData) => {
    setUser(userData);
    localStorage.setItem('user', JSON.stringify(userData));
  };

  const value = {
    user,
    isLoading,
    login,
    logout,
    signup,
    updateUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export default AuthContext;
