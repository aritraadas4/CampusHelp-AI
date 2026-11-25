import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import SubmitComplaint from './components/SubmitComplaint';
import TrackTicket from './components/TrackTicket';
import AdminDashboard from './components/AdminDashboard';
import MyComplaints from './components/MyComplaints';
import AuthModal from './components/AuthModal';
import { getStoredUser, api } from './api';

export default function App() {
  const [activeTab, setActiveTab] = useState('submit');
  const [user, setUser] = useState(getStoredUser());
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [trackedTicketId, setTrackedTicketId] = useState('');

  // Verify session on mount
  useEffect(() => {
    async function verifySession() {
      try {
        const currentUser = await api.getMe();
        setUser(currentUser);
      } catch {
        // Token expired or invalid
        api.logout();
        setUser(null);
      }
    }
    if (user) {
      verifySession();
    }
  }, []);

  const handleLogout = () => {
    api.logout();
    setUser(null);
    if (activeTab === 'dashboard' || activeTab === 'my-complaints') {
      setActiveTab('submit');
    }
  };

  const handleAuthSuccess = (authenticatedUser) => {
    setUser(authenticatedUser);
    if (authenticatedUser.role === 'admin' || authenticatedUser.role === 'staff') {
      setActiveTab('dashboard');
    } else {
      setActiveTab('submit');
    }
  };

  const handleTrackTicket = (ticketId) => {
    setTrackedTicketId(ticketId);
    setActiveTab('track');
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      
      {/* Top Navbar */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        user={user}
        onOpenAuth={() => setIsAuthOpen(true)}
        onLogout={handleLogout}
      />

      {/* Main Body Content */}
      <main className="flex-1">
        {activeTab === 'submit' && (
          <SubmitComplaint
            user={user}
            onComplaintSubmitted={(complaint) => {
              // optional callback
            }}
            onTrackTicket={handleTrackTicket}
          />
        )}

        {activeTab === 'track' && (
          <TrackTicket
            initialTicketId={trackedTicketId}
          />
        )}

        {activeTab === 'my-complaints' && (
          <MyComplaints
            user={user}
            onTrackTicket={handleTrackTicket}
            onNewComplaint={() => setActiveTab('submit')}
          />
        )}

        {activeTab === 'dashboard' && (
          <AdminDashboard
            user={user}
            onTrackTicket={handleTrackTicket}
          />
        )}
      </main>

      {/* Authentication Modal */}
      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        onAuthSuccess={handleAuthSuccess}
      />

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-6 text-xs text-slate-500 text-center">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p>© 2026 CampusHelp AI • Intelligent Campus Complaint Management</p>
          <div className="flex items-center space-x-3 text-[11px] text-slate-400">
            <span>ML Engine: Multinomial Naive Bayes + TF-IDF</span>
            <span>•</span>
            <span>Backend: FastAPI</span>
            <span>•</span>
            <span>Frontend: React 18 + Vite</span>
          </div>
        </div>
      </footer>

    </div>
  );
}
