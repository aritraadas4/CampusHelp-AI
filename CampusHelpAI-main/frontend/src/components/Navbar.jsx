import React from 'react';
import { Shield, Sparkles, PlusCircle, Search, LayoutDashboard, UserCheck, LogOut, LogIn, FileText } from 'lucide-react';

export default function Navbar({ activeTab, setActiveTab, user, onOpenAuth, onLogout }) {
  const isStaffOrAdmin = user && (user.role === 'staff' || user.role === 'admin');

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* Logo / Brand */}
          <div 
            onClick={() => setActiveTab('submit')}
            className="flex items-center space-x-3 cursor-pointer group"
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-sky-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-sky-500/20 group-hover:scale-105 transition-transform">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-1.5">
                <span className="font-extrabold text-xl tracking-tight bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">
                  CampusHelp
                </span>
                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-semibold bg-sky-100 text-sky-800">
                  <Sparkles className="w-3 h-3 mr-0.5" /> AI
                </span>
              </div>
              <p className="text-[10px] text-slate-600 -mt-0.5 font-medium">Smart Campus Complaint System</p>
            </div>
          </div>

          {/* Navigation Tabs */}
          <nav className="hidden md:flex items-center space-x-1">
            <button
              onClick={() => setActiveTab('submit')}
              className={`flex items-center space-x-2 px-3.5 py-2 rounded-lg text-sm font-semibold transition-colors ${
                activeTab === 'submit'
                  ? 'bg-sky-50 text-sky-700'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <PlusCircle className="w-4 h-4" />
              <span>Submit Complaint</span>
            </button>

            <button
              onClick={() => setActiveTab('track')}
              className={`flex items-center space-x-2 px-3.5 py-2 rounded-lg text-sm font-semibold transition-colors ${
                activeTab === 'track'
                  ? 'bg-sky-50 text-sky-700'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Search className="w-4 h-4" />
              <span>Track Ticket</span>
            </button>

            {user?.role === 'student' && (
              <button
                onClick={() => setActiveTab('my-complaints')}
                className={`flex items-center space-x-2 px-3.5 py-2 rounded-lg text-sm font-semibold transition-colors ${
                  activeTab === 'my-complaints'
                    ? 'bg-sky-50 text-sky-700'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <FileText className="w-4 h-4" />
                <span>My Complaints</span>
              </button>
            )}

            {isStaffOrAdmin && (
              <button
                onClick={() => setActiveTab('dashboard')}
                className={`flex items-center space-x-2 px-3.5 py-2 rounded-lg text-sm font-semibold transition-colors ${
                  activeTab === 'dashboard'
                    ? 'bg-sky-50 text-sky-700'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <LayoutDashboard className="w-4 h-4" />
                <span>Admin & Staff Portal</span>
              </button>
            )}
          </nav>

          {/* User Auth Section */}
          <div className="flex items-center space-x-3">
            {user ? (
              <div className="flex items-center space-x-3">
                <div className="hidden sm:flex flex-col text-right">
                  <span className="text-xs font-bold text-slate-800">{user.full_name}</span>
                  <span className="text-[11px] font-medium text-slate-600 capitalize">
                    {user.role} {user.department ? `• ${user.department}` : ''}
                  </span>
                </div>
                <div className="w-9 h-9 rounded-full bg-slate-200 border border-slate-300 flex items-center justify-center font-bold text-slate-700 text-sm">
                  {user.full_name ? user.full_name.charAt(0).toUpperCase() : 'U'}
                </div>
                <button
                  onClick={onLogout}
                  title="Sign out"
                  className="p-2 text-slate-600 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={onOpenAuth}
                className="flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-semibold bg-slate-900 text-white hover:bg-slate-800 shadow-sm transition-all"
              >
                <LogIn className="w-4 h-4" />
                <span>Staff / Student Login</span>
              </button>
            )}
          </div>
        </div>

        {/* Mobile Navigation bar */}
        <div className="flex md:hidden border-t border-slate-100 py-2 justify-around">
          <button
            onClick={() => setActiveTab('submit')}
            className={`flex flex-col items-center text-xs font-semibold ${
              activeTab === 'submit' ? 'text-sky-600' : 'text-slate-500'
            }`}
          >
            <PlusCircle className="w-5 h-5 mb-0.5" />
            <span>Submit</span>
          </button>
          <button
            onClick={() => setActiveTab('track')}
            className={`flex flex-col items-center text-xs font-semibold ${
              activeTab === 'track' ? 'text-sky-600' : 'text-slate-500'
            }`}
          >
            <Search className="w-5 h-5 mb-0.5" />
            <span>Track</span>
          </button>
          {isStaffOrAdmin && (
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`flex flex-col items-center text-xs font-semibold ${
                activeTab === 'dashboard' ? 'text-sky-600' : 'text-slate-500'
              }`}
            >
              <LayoutDashboard className="w-5 h-5 mb-0.5" />
              <span>Portal</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
