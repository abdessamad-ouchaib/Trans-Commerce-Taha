import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Login.css';

export default function Login() {
  const [email, setEmail] = useState('');
  const [motDePasse, setMotDePasse] = useState('');
  const [error, setError] = useState('');
  const { login, loading } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    const result = await login(email, motDePasse);
    if (result.success) navigate('/');
    else setError(result.message);
  };

  return (
    <div className="login-page">
      <div className="login-bg" />
      <div className="login-card">
        <div className="login-logo">
          <span className="login-truck">🚛</span>
          <div>
            <p className="login-company-name">Trans Commerce</p>
            <p className="login-taha">TAHA</p>
          </div>
        </div>
        <p className="login-subtitle">Gestion des factures et transports</p>
        <form onSubmit={handleSubmit} className="login-form">
          {error && <div className="alert alert-error">{error}</div>}
          <div className="form-group">
            <label className="form-label">Email</label>
            <input
              type="email"
              className="form-control"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="abdelaali@tct.ma"
              required
            />
          </div>
          <div className="form-group">
            <label className="form-label">Mot de passe</label>
            <input
              type="password"
              className="form-control"
              value={motDePasse}
              onChange={e => setMotDePasse(e.target.value)}
              placeholder="••••••••"
              required
            />
          </div>
          <button type="submit" className="btn-primary login-btn" disabled={loading}>
            {loading ? 'Connexion...' : 'Se connecter'}
          </button>
        </form>
        <p className="login-footer">Trans Commerce Taha sarl · Témara</p>
      </div>
    </div>
  );
}
