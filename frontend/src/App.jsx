import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import LandingPage from './components/LandingPage';
import Login from './components/Login';
import Register from './components/Register';
import ProtectedDashboard from './components/ProtectedDashboard';

function MainAppContent() {
  const { user, loading } = useAuth();
  const [view, setView] = useState('landing'); // 'landing' | 'login' | 'register'

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white">
        <div className="flex items-center space-x-3">
          <div className="w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-sm font-medium text-slate-300">Loading Minnie session...</span>
        </div>
      </div>
    );
  }

  // If user is authenticated, render Protected Dashboard
  if (user) {
    return <ProtectedDashboard />;
  }

  // Unauthenticated routing views
  return (
    <div className="min-h-screen bg-slate-900 flex flex-col">
      {view === 'landing' && (
        <div>
          {/* Navigation Bar overlay */}
          <div className="max-w-6xl mx-auto px-6 pt-6 flex justify-end space-x-3">
            <button
              onClick={() => setView('login')}
              className="px-4 py-2 text-sm font-semibold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition"
            >
              Sign In
            </button>
            <button
              onClick={() => setView('register')}
              className="px-4 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg shadow-lg transition"
            >
              Get Started
            </button>
          </div>
          <LandingPage />
        </div>
      )}

      {view === 'login' && (
        <div className="min-h-screen flex items-center justify-center p-6 relative">
          <button
            onClick={() => setView('landing')}
            className="absolute top-6 left-6 text-sm text-slate-400 hover:text-white flex items-center space-x-1"
          >
            ← Back to Home
          </button>
          <Login
            onSwitchToRegister={() => setView('register')}
            onLoginSuccess={() => setView('landing')}
          />
        </div>
      )}

      {view === 'register' && (
        <div className="min-h-screen flex items-center justify-center p-6 relative">
          <button
            onClick={() => setView('landing')}
            className="absolute top-6 left-6 text-sm text-slate-400 hover:text-white flex items-center space-x-1"
          >
            ← Back to Home
          </button>
          <Register
            onSwitchToLogin={() => setView('login')}
            onRegisterSuccess={() => setView('landing')}
          />
        </div>
      )}
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MainAppContent />
    </AuthProvider>
  );
}
