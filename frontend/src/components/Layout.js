import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import './Layout.css';

export default function Layout() {
  const { user, logout } = useAuth();
  const { nonLus, connected, newMessageAlert } = useSocket();
  const navigate = useNavigate();
  const [sidebarOpen,    setSidebarOpen]    = useState(false);
const [installPrompt,  setInstallPrompt]  = useState(null);
const [showInstall,    setShowInstall]    = useState(false);

// Capturer l'événement d'installation PWA
React.useEffect(() => {
  const handler = (e) => {
    e.preventDefault();
    setInstallPrompt(e);
    setShowInstall(true);
  };
  window.addEventListener('beforeinstallprompt', handler);
  return () => window.removeEventListener('beforeinstallprompt', handler);
}, []);

const handleInstall = async () => {
  if (!installPrompt) return;
  installPrompt.prompt();
  const { outcome } = await installPrompt.userChoice;
  if (outcome === 'accepted') setShowInstall(false);
  setInstallPrompt(null);
};

  const navItems = [
    { to: '/',         icon: '📊', label: 'Tableau de bord', exact: true },
    { to: '/factures', icon: '📄', label: 'Factures' },
    { to: '/clients',  icon: '👥', label: 'Clients' },
    { to: '/produits', icon: '🌾', label: 'Produits' },
    { to: '/employes', icon: '👤', label: 'Employés' },
    { to: '/chat',     icon: '💬', label: 'Messages', badge: nonLus > 0 ? nonLus : null },
  ];

  const handleLogout = () => { logout(); navigate('/login'); };

  return (
    <div className="layout">
      {sidebarOpen && <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />}

      {/* Toast notification nouveau message */}
      {newMessageAlert && (
        <div className="toast-notification" onClick={() => navigate('/chat')}>
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
          <div className={`ws-dot ${connected ? 'ws-on' : 'ws-off'}`}
            title={connected ? 'Connecté' : 'Déconnecté'} />
        </div>

        <nav className="sidebar-nav">
          {navItems.map(item => (
            <NavLink key={item.to} to={item.to} end={item.exact}
              className={({ isActive }) => `nav-item ${isActive ? 'nav-active' : ''}`}
              onClick={() => setSidebarOpen(false)}>
              <span className="nav-icon">{item.icon}</span>
              <span className="nav-label">{item.label}</span>
              {item.badge && <span className="nav-badge">{item.badge}</span>}
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="user-info">
            <div className="user-avatar">{user?.prenom?.[0]}{user?.nom?.[0]}</div>
            <div className="user-details">
              <span className="user-name">{user?.prenom} {user?.nom}</span>
              <span className="user-role">Responsable</span>
            </div>
          </div>
          <button className="btn-logout" onClick={handleLogout}>Déconnexion</button>
        </div>
      </aside>

      <div className="main-wrapper">
        <header className="topbar no-print">
          <button className="hamburger" onClick={() => setSidebarOpen(!sidebarOpen)}>☰</button>
          <div className="topbar-title">Trans Commerce Taha</div>
          <div className="topbar-actions" style={{ display: 'flex', gap: '8px' }}>
  {showInstall && (
    <button
      className="btn-secondary btn-sm"
      onClick={handleInstall}
      title="Installer l'application"
    >
      📲 Installer
    </button>
  )}
  <button className="btn-primary btn-sm"
    onClick={() => navigate('/factures/nouvelle')}>
    + Nouvelle facture
  </button>
</div>
        </header>
        <main className="main-content"><Outlet /></main>
      </div>
    </div>
  );
}
