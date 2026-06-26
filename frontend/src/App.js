import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import Login from './pages/Login';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Factures from './pages/Factures';
import NouvelleFacture from './pages/NouvelleFacture';
import DetailFacture from './pages/DetailFacture';
import Clients from './pages/Clients';
import Produits from './pages/Produits';
import Employes from './pages/Employes';
import Chat from './pages/Chat';

const PrivateRoute = ({ children }) => {
  const { user } = useAuth();
  return user ? children : <Navigate to="/login" replace />;
};

export default function App() {
  return (
    <AuthProvider>
      <SocketProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/" element={<PrivateRoute><Layout /></PrivateRoute>}>
              <Route index element={<Dashboard />} />
              <Route path="factures" element={<Factures />} />
              <Route path="factures/nouvelle" element={<NouvelleFacture />} />
              <Route path="factures/:id" element={<DetailFacture />} />
              <Route path="factures/:id/modifier" element={<NouvelleFacture />} />
              <Route path="clients" element={<Clients />} />
              <Route path="produits" element={<Produits />} />
              <Route path="employes" element={<Employes />} />
              <Route path="chat" element={<Chat />} />
              <Route path="chat/:contactId/:contactType" element={<Chat />} />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </SocketProvider>
    </AuthProvider>
  );
}
