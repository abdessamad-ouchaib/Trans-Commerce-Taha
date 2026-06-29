import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import './Layout.css';

export default function LayoutChauffeur() {
  const { user, logout } = useAuth();
  const { nonLus, connected, newMessageAlert } = useSocket();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = () => { logout(); navigate('/login'); };

  return (
    <div className="layout">
      {sidebarOpen && <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />}

      {/* Toast notification nouveau message */}
      {newMessageAlert && (
        <div className="toast-notification"
          onClick={() => navigate('/chauffeur/messages')}>
          <span className="toast-icon">💬</span>
          <div className="toast-content">
            <strong>{newMessageAlert.from}</strong>
            <p>{newMessageAlert.text}</p>
          </div>
        </div>
      )}

      <aside className={`sidebar ${sidebarOpen ? 'sidebar-open' : ''}`}>
        <div className="sidebar-header">
          <div className="logo">
            <div className="logo-icon">🚛</div>
            <div className="logo-text">
              <span className="logo-main">Trans Commerce</span>
              <span className="logo-sub">TAHA</span>
            </div>
          </div>
          <div className={`ws-dot ${connected ? 'ws-on' : 'ws-off'}`} />
        </div>

        <nav className="sidebar-nav">
          <NavLink to="/chauffeur" end
            className={({ isActive }) => `nav-item ${isActive ? 'nav-active' : ''}`}
            onClick={() => setSidebarOpen(false)}>
            <span className="nav-icon">🏠</span>
            <span className="nav-label">Mon espace</span>
          </NavLink>
          <NavLink to="/chauffeur/messages"
            className={({ isActive }) => `nav-item ${isActive ? 'nav-active' : ''}`}
            onClick={() => setSidebarOpen(false)}>
            <span className="nav-icon">💬</span>
            <span className="nav-label">Messages</span>
            {nonLus > 0 && <span className="nav-badge">{nonLus}</span>}
          </NavLink>
        </nav>

        <div className="sidebar-footer">
          <div className="user-info">
            <div className="user-avatar">{user?.prenom?.[0]}{user?.nom?.[0]}</div>
            <div className="user-details">
              <span className="user-name">{user?.prenom} {user?.nom}</span>
              <span className="user-role">🚛 Chauffeur</span>
            </div>
          </div>
          <button className="btn-logout" onClick={handleLogout}>Déconnexion</button>
        </div>
      </aside>

      <div className="main-wrapper">
        <header className="topbar no-print">
          <button className="hamburger" onClick={() => setSidebarOpen(!sidebarOpen)}>☰</button>
          <div className="topbar-title">Trans Commerce Taha — Espace Chauffeur</div>
        </header>
        <main className="main-content"><Outlet /></main>
      </div>
    </div>
  );
}
