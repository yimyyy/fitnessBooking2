import React from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';

export function HomePage() {
  const { t } = useLanguage();
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex flex-col items-center justify-center px-4">
      <div className="max-w-2xl text-center space-y-6">
        <h1 className="text-5xl font-bold text-gray-900">FitBook</h1>
        <p className="text-xl text-gray-600">Book your fitness classes with ease.</p>
        <div className="flex gap-4 justify-center">
          <Link to="/classes" className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium">
            {t.nav.classes}
          </Link>
          {!user && (
            <Link to="/register" className="px-6 py-3 bg-white text-blue-600 border border-blue-600 rounded-lg hover:bg-blue-50 font-medium">
              {t.auth.register}
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
