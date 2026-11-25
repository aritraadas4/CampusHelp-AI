import React, { useState, useEffect } from 'react';
import { FileText, Clock, CheckCircle2, AlertTriangle, ArrowRight, RefreshCw } from 'lucide-react';
import { api } from '../api';

export default function MyComplaints({ user, onTrackTicket, onNewComplaint }) {
  const [complaints, setComplaints] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchMyComplaints = async () => {
    setIsLoading(true);
    setError('');
    try {
      const data = await api.listComplaints({ limit: 50 });
      setComplaints(data);
    } catch (err) {
      setError(err.message || 'Failed to load your complaints.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMyComplaints();
  }, []);

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            My Submitted Complaints
          </h1>
          <p className="text-slate-600 mt-1">
            Complaints submitted under your account (<span className="font-semibold text-slate-700">{user?.email}</span>)
          </p>
        </div>

        <button
          onClick={onNewComplaint}
          className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors"
        >
          + New Complaint
        </button>
      </div>

      {error && (
        <div className="mb-6 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm">
          {error}
        </div>
      )}

      {isLoading ? (
        <div className="py-16 text-center text-slate-400">
          <RefreshCw className="w-8 h-8 mx-auto mb-2 animate-spin text-sky-600" />
          <p className="text-xs font-semibold">Loading your complaints...</p>
        </div>
      ) : complaints.length > 0 ? (
        <div className="space-y-4">
          {complaints.map((c) => (
            <div
              key={c.id}
              onClick={() => onTrackTicket(c.ticket_id)}
              className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs hover:border-sky-300 hover:shadow-md transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-4"
            >
              <div className="space-y-1 max-w-xl">
                <div className="flex items-center space-x-2">
                  <span className="font-extrabold text-sky-700 text-base">{c.ticket_id}</span>
                  <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                    c.status === 'Resolved' ? 'bg-emerald-100 text-emerald-800' :
                    c.status === 'In Progress' ? 'bg-indigo-100 text-indigo-800' :
                    c.status === 'Under Review' ? 'bg-blue-100 text-blue-800' :
                    c.status === 'Rejected' ? 'bg-rose-100 text-rose-800' :
                    'bg-amber-100 text-amber-800'
                  }`}>
                    {c.status}
                  </span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    c.urgency === 'Urgent' ? 'bg-rose-100 text-rose-800' :
                    c.urgency === 'High' ? 'bg-orange-100 text-orange-800' :
                    'bg-slate-100 text-slate-700'
                  }`}>
                    {c.urgency}
                  </span>
                </div>
                <p className="text-sm font-semibold text-slate-800 line-clamp-1">{c.complaint}</p>
                <p className="text-xs text-slate-600">
                  {c.department} • Submitted on {c.date}
                </p>
              </div>

              <div className="flex items-center space-x-2 text-sky-600 font-bold text-xs shrink-0">
                <span>View Details</span>
                <ArrowRight className="w-4 h-4" />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-500">
          <FileText className="w-10 h-10 mx-auto mb-3 text-slate-300" />
          <h3 className="font-bold text-slate-800 text-base">No complaints yet</h3>
          <p className="text-xs text-slate-600 mt-1 max-w-sm mx-auto">
            You haven't submitted any complaints under this account yet.
          </p>
          <button
            onClick={onNewComplaint}
            className="mt-4 px-5 py-2.5 bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs rounded-xl transition-colors"
          >
            Submit Your First Complaint
          </button>
        </div>
      )}
    </div>
  );
}
