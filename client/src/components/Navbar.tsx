import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { LanguageToggle } from './LanguageToggle';

export function Navbar() {
  const { user, logout } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <nav className="bg-blue-700 text-white px-6 py-3 flex items-center justify-between shadow">
      <Link to="/" className="font-bold text-lg">FitBook</Link>
      <div className="flex items-center gap-4 text-sm">
        <Link to="/classes" className="hover:underline">{t.nav.classes}</Link>
        {user && <Link to="/bookings" className="hover:underline">{t.nav.bookings}</Link>}
        {user?.role === 'admin' && <Link to="/admin" className="hover:underline">{t.nav.admin}</Link>}
        {user ? (
          <button onClick={handleLogout} className="hover:underline">{t.nav.logout}</button>
        ) : (
          <>
            <Link to="/login" className="hover:underline">{t.nav.login}</Link>
            <Link to="/register" className="hover:underline">{t.nav.register}</Link>
          </>
        )}
        <LanguageToggle />
      </div>
    </nav>
  );
}
