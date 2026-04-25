import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import './Auth.css';

export default function Register() {
  const [form, setForm] = useState({ username: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { data } = await api.post('/auth/register', form);
      login(data.token, data.user);
      navigate('/trading/dashboard');
    } catch (err) {
      const errors = err.response?.data?.errors;
      setError(errors ? errors[0].msg : (err.response?.data?.error || 'Error al registrarse'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="page-center">
      <div className="auth-box">
        <h1 className="auth-title">TradingApp</h1>
        <p className="auth-subtitle">Crea tu cuenta — $100,000 virtuales para empezar</p>
        {error && <div className="error-msg">{error}</div>}
        <form onSubmit={handleSubmit} className="auth-form">
          <div className="field">
            <label>Usuario</label>
            <input
              type="text"
              value={form.username}
              onChange={(e) => setForm({ ...form, username: e.target.value })}
              required autoFocus
            />
          </div>
          <div className="field">
            <label>Email</label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              required
            />
          </div>
          <div className="field">
            <label>Contraseña</label>
            <input
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              required minLength={6}
            />
          </div>
          <button className="btn-primary auth-btn" disabled={loading}>
            {loading ? 'Creando cuenta...' : 'Crear cuenta'}
          </button>
        </form>
        <p className="auth-link">
          ¿Ya tienes cuenta? <Link to="/trading/login">Inicia sesión</Link>
        </p>
      </div>
    </div>
  );
}
