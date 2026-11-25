import React, { useState } from 'react';
import { X, LogIn, UserPlus, Shield, User, Lock, Mail, CheckCircle2 } from 'lucide-react';
import { api } from '../api';

export default function AuthModal({ isOpen, onClose, onAuthSuccess }) {
  const [tab, setTab] = useState('login'); // 'login' or 'register'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleQuickLogin = (demoEmail, demoPw) => {
    setEmail(demoEmail);
    setPassword(demoPw);
    submitLogin(demoEmail, demoPw);
  };

  const submitLogin = async (loginEmail, loginPw) => {
    setIsLoading(true);
    setError('');
    try {
      const res = await api.login(loginEmail, loginPw);
      onAuthSuccess(res.user);
      onClose();
    } catch (err) {
      setError(err.message || 'Invalid email or password.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (tab === 'login') {
      submitLogin(email, password);
    } else {
      if (!fullName.trim() || !email.trim() || !password.trim()) {
        setError('Please fill out all required fields.');
        return;
      }
      setIsLoading(true);
      try {
        const res = await api.register(email, password, fullName);
        onAuthSuccess(res.user);
        onClose();
      } catch (err) {
        setError(err.message || 'Registration failed. Email may already be registered.');
      } finally {
        setIsLoading(false);
      }
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 relative border border-slate-200">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1 rounded-lg transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="text-center mb-6">
          <div className="w-12 h-12 bg-sky-100 text-sky-700 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-xs">
            <Shield className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-extrabold text-slate-900">Campus Portal Access</h2>
          <p className="text-xs text-slate-600 mt-0.5">Secure authentication for students, staff, and administrators.</p>
        </div>

        {/* Tab switch */}
        <div className="flex bg-slate-100 p-1 rounded-xl mb-5">
          <button
            type="button"
            onClick={() => { setTab('login'); setError(''); }}
            className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
              tab === 'login' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => { setTab('register'); setError(''); }}
            className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
              tab === 'register' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Register Student
          </button>
        </div>

        {/* Quick Demo Credentials for Fast Evaluation */}
        {tab === 'login' && (
          <div className="mb-5 p-3 rounded-xl bg-sky-50/70 border border-sky-100">
            <span className="text-[11px] font-bold text-sky-900 uppercase tracking-wider block mb-2">
              ⚡ 1-Click Evaluation Accounts
            </span>
            <div className="grid grid-cols-2 gap-1.5 text-[11px]">
              <button
                type="button"
                onClick={() => handleQuickLogin('admin@campus.edu', 'Admin@123')}
                className="px-2.5 py-1.5 bg-white hover:bg-sky-100/60 border border-sky-200 rounded-lg text-slate-800 font-bold text-left transition-colors cursor-pointer"
              >
                👔 Admin
              </button>
              <button
                type="button"
                onClick={() => handleQuickLogin('it.staff@campus.edu', 'Staff@123')}
                className="px-2.5 py-1.5 bg-white hover:bg-sky-100/60 border border-sky-200 rounded-lg text-slate-800 font-bold text-left transition-colors cursor-pointer"
              >
                💻 IT Staff
              </button>
              <button
                type="button"
                onClick={() => handleQuickLogin('electrical.staff@campus.edu', 'Staff@123')}
                className="px-2.5 py-1.5 bg-white hover:bg-sky-100/60 border border-sky-200 rounded-lg text-slate-800 font-bold text-left transition-colors cursor-pointer"
              >
                ⚡ Electrical Staff
              </button>
              <button
                type="button"
                onClick={() => handleQuickLogin('student@campus.edu', 'Student@123')}
                className="px-2.5 py-1.5 bg-white hover:bg-sky-100/60 border border-sky-200 rounded-lg text-slate-800 font-bold text-left transition-colors cursor-pointer"
              >
                🎓 Student
              </button>
            </div>
          </div>
        )}

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold">
            {error}
          </div>
        )}

        {/* Auth Form */}
        <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
          
          {tab === 'register' && (
            <div>
              <label className="block font-bold text-slate-700 mb-1">Full Name</label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Rahul Sharma"
                  className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-300 text-slate-900 font-medium outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block font-bold text-slate-700 mb-1">Email Address</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@campus.edu"
                className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-300 text-slate-900 font-medium outline-none focus:ring-2 focus:ring-sky-500"
              />
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Password</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-300 text-slate-900 font-medium outline-none focus:ring-2 focus:ring-sky-500"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-2.5 px-4 bg-sky-600 hover:bg-sky-700 text-white font-bold rounded-xl transition-all shadow-xs disabled:opacity-50 mt-4 cursor-pointer"
          >
            {isLoading ? 'Authenticating...' : tab === 'login' ? 'Sign In to CampusHelp' : 'Create Student Account'}
          </button>
        </form>

      </div>
    </div>
  );
}
