import React, { createContext, useContext, useState, useEffect } from 'react';
import API from '../utils/api';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const u = localStorage.getItem('tct_user');
    return u ? JSON.parse(u) : null;
  });
  const [loading, setLoading] = useState(false);

  const login = async (email, motDePasse) => {
    setLoading(true);
    try {
      const { data } = await API.post('/auth/login', { email, motDePasse });
      localStorage.setItem('tct_token', data.token);
      localStorage.setItem('tct_user', JSON.stringify(data.user));
      setUser(data.user);
      return { success: true };
    } catch (err) {
      return { success: false, message: err.response?.data?.message || 'Erreur de connexion.' };
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('tct_token');
    localStorage.removeItem('tct_user');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
