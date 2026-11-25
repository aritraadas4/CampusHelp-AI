import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, Search, Filter, ShieldAlert, CheckCircle2, 
  Clock, AlertTriangle, RefreshCw, Edit3, X, UserCheck, Building 
} from 'lucide-react';
import { api } from '../api';

const DEPARTMENTS = [
  'IT Department',
  'Electrical Department',
  'Plumbing Department',
  'Housekeeping',
  'Maintenance Department',
  'General Administration'
];

const STATUSES = ['Pending', 'Under Review', 'In Progress', 'Resolved', 'Rejected'];
const URGENCIES = ['Low', 'Medium', 'High', 'Urgent'];

export default function AdminDashboard({ user, onTrackTicket }) {
  const [analytics, setAnalytics] = useState(null);
  const [complaints, setComplaints] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  // Filters
  const [selectedDept, setSelectedDept] = useState(user?.department || '');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [selectedUrgency, setSelectedUrgency] = useState('');
  const [reviewOnly, setReviewOnly] = useState(false);
  const [searchInput, setSearchInput] = useState('');

  // Edit / Triage Modal State
  const [editingComplaint, setEditingComplaint] = useState(null);
  const [editStatus, setEditStatus] = useState('');
  const [editDept, setEditDept] = useState('');
  const [editUrgency, setEditUrgency] = useState('');
  const [editAssignedTo, setEditAssignedTo] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState('');

  // Initial load
  useEffect(() => {
    fetchData();
  }, [selectedDept, selectedStatus, selectedUrgency, reviewOnly]);

  const fetchData = async () => {
    setIsLoading(true);
    setError('');
    try {
      // Load Analytics
      const analyticsRes = await api.getAnalytics();
      setAnalytics(analyticsRes);

      // Load Complaints list
      const complaintsRes = await api.listComplaints({
        department: selectedDept || undefined,
        status: selectedStatus || undefined,
        urgency: selectedUrgency || undefined,
        review_required: reviewOnly ? true : undefined,
        search: searchInput.trim() || undefined,
        limit: 100,
      });
      setComplaints(complaintsRes);
    } catch (err) {
      setError(err.message || 'Failed to load dashboard data.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenEdit = (complaint) => {
    setEditingComplaint(complaint);
    setEditStatus(complaint.status);
    setEditDept(complaint.department);
    setEditUrgency(complaint.urgency || 'Medium');
    setEditAssignedTo(complaint.assigned_to || '');
    setEditNotes(complaint.admin_notes || '');
    setSaveSuccess('');
  };

  const handleSaveUpdate = async (e) => {
    e.preventDefault();
    if (!editingComplaint) return;

    setIsSaving(true);
    setError('');
    setSaveSuccess('');

    try {
      await api.updateComplaint(editingComplaint.id, {
        status: editStatus,
        department: editDept,
        urgency: editUrgency,
        assigned_to: editAssignedTo,
        admin_notes: editNotes,
      });

      setSaveSuccess('Complaint updated successfully!');
      setTimeout(() => {
        setEditingComplaint(null);
        fetchData();
      }, 700);
    } catch (err) {
      setError(err.message || 'Failed to update complaint.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Campus Administration Portal
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-900 text-white">
              {user?.role === 'admin' ? 'Administrator' : `${user?.department} Staff`}
            </span>
          </div>
          <p className="text-slate-600 mt-1">
            Monitor resolution metrics, triage AI-categorized complaints, and update ticket progress.
          </p>
        </div>

        <button
          onClick={fetchData}
          disabled={isLoading}
          className="flex items-center space-x-2 px-4 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold text-xs rounded-xl shadow-xs transition-colors self-start sm:self-auto cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          <span>Refresh Data</span>
        </button>
      </div>

      {error && (
        <div className="mb-6 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm">
          {error}
        </div>
      )}

      {/* KPI Stats Cards */}
      {analytics && (
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
            <span className="text-xs font-semibold text-slate-600 block">Total Complaints</span>
            <div className="text-3xl font-extrabold text-slate-900 mt-1">{analytics.total_complaints}</div>
            <span className="text-[11px] text-slate-600 mt-1 block">Across all campus departments</span>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
            <span className="text-xs font-semibold text-amber-700 block flex items-center space-x-1">
              <Clock className="w-3.5 h-3.5 mr-1" />
              <span>Pending Action</span>
            </span>
            <div className="text-3xl font-extrabold text-amber-600 mt-1">
              {analytics.status_breakdown?.Pending || 0}
            </div>
            <span className="text-[11px] text-slate-600 mt-1 block">Awaiting triage / assignment</span>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
            <span className="text-xs font-semibold text-indigo-700 block flex items-center space-x-1">
              <RefreshCw className="w-3.5 h-3.5 mr-1" />
              <span>In Progress</span>
            </span>
            <div className="text-3xl font-extrabold text-indigo-600 mt-1">
              {analytics.status_breakdown?.['In Progress'] || 0}
            </div>
            <span className="text-[11px] text-slate-600 mt-1 block">Currently being resolved</span>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
            <span className="text-xs font-semibold text-emerald-700 block flex items-center space-x-1">
              <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
              <span>Resolved</span>
            </span>
            <div className="text-3xl font-extrabold text-emerald-600 mt-1">
              {analytics.status_breakdown?.Resolved || 0}
            </div>
            <span className="text-[11px] text-slate-600 mt-1 block">Successfully resolved issues</span>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-amber-200 bg-amber-50/40 shadow-xs col-span-2 sm:col-span-1">
            <span className="text-xs font-bold text-amber-900 block flex items-center space-x-1">
              <ShieldAlert className="w-3.5 h-3.5 mr-1 text-amber-600" />
              <span>Human Review</span>
            </span>
            <div className="text-3xl font-extrabold text-amber-800 mt-1">
              {analytics.needs_human_review_count}
            </div>
            <span className="text-[11px] text-amber-800/80 mt-1 block">Confidence &lt; 40%</span>
          </div>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs mb-6 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          
          {/* Department Filter (Admin can choose any; staff locked or default) */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Department</label>
            <select
              value={selectedDept}
              onChange={(e) => setSelectedDept(e.target.value)}
              disabled={user?.role === 'staff' && user.department}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-800 outline-none bg-white"
            >
              <option value="">All Departments</option>
              {DEPARTMENTS.map((dept) => (
                <option key={dept} value={dept}>{dept}</option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Status</label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-800 outline-none bg-white"
            >
              <option value="">All Statuses</option>
              {STATUSES.map((st) => (
                <option key={st} value={st}>{st}</option>
              ))}
            </select>
          </div>

          {/* Urgency Filter */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Urgency</label>
            <select
              value={selectedUrgency}
              onChange={(e) => setSelectedUrgency(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-800 outline-none bg-white"
            >
              <option value="">All Urgencies</option>
              {URGENCIES.map((urg) => (
                <option key={urg} value={urg}>{urg}</option>
              ))}
            </select>
          </div>

          {/* Search Input */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Search Tickets</label>
            <div className="flex items-center space-x-2">
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && fetchData()}
                placeholder="Search ticket, name, keywords..."
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-medium text-slate-800 outline-none"
              />
              <button
                onClick={fetchData}
                className="p-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl cursor-pointer"
              >
                <Search className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

        </div>

        {/* Quick Toggles */}
        <div className="flex items-center space-x-3 pt-2 border-t border-slate-100 text-xs">
          <label className="flex items-center space-x-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={reviewOnly}
              onChange={(e) => setReviewOnly(e.target.checked)}
              className="rounded text-sky-600 focus:ring-sky-500 w-4 h-4"
            />
            <span className="font-semibold text-amber-800">Show only tickets requiring human review (&lt;40% confidence)</span>
          </label>
        </div>
      </div>

      {/* Complaints Triage Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider">
              <tr>
                <th className="py-3.5 px-4">Ticket</th>
                <th className="py-3.5 px-4">Student</th>
                <th className="py-3.5 px-4">Problem Description</th>
                <th className="py-3.5 px-4">Department</th>
                <th className="py-3.5 px-4">AI Conf.</th>
                <th className="py-3.5 px-4">Urgency</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {complaints.length > 0 ? (
                complaints.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 font-extrabold text-slate-900 whitespace-nowrap">
                      <button
                        onClick={() => onTrackTicket(c.ticket_id)}
                        className="text-sky-600 hover:underline cursor-pointer"
                      >
                        {c.ticket_id}
                      </button>
                    </td>
                    <td className="py-3 px-4 text-slate-700 whitespace-nowrap">
                      <div className="font-semibold">{c.student_name}</div>
                      <div className="text-[11px] text-slate-600">{c.date?.split(' ')[0]}</div>
                    </td>
                    <td className="py-3 px-4 max-w-xs text-slate-800">
                      <p className="line-clamp-2">{c.complaint}</p>
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 text-slate-700">
                        {c.department}
                      </span>
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span className={`font-bold ${
                        c.confidence >= 60 ? 'text-emerald-600' :
                        c.confidence >= 40 ? 'text-amber-600' : 'text-rose-600'
                      }`}>
                        {c.confidence}%
                      </span>
                      {c.review_required && (
                        <span className="block text-[10px] text-amber-700 font-semibold">Review Req.</span>
                      )}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                        c.urgency === 'Urgent' ? 'bg-rose-100 text-rose-800' :
                        c.urgency === 'High' ? 'bg-orange-100 text-orange-800' :
                        c.urgency === 'Medium' ? 'bg-blue-50 text-blue-700' :
                        'bg-slate-100 text-slate-700'
                      }`}>
                        {c.urgency}
                      </span>
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${
                        c.status === 'Resolved' ? 'bg-emerald-100 text-emerald-800' :
                        c.status === 'In Progress' ? 'bg-indigo-100 text-indigo-800' :
                        c.status === 'Under Review' ? 'bg-blue-100 text-blue-800' :
                        c.status === 'Rejected' ? 'bg-rose-100 text-rose-800' :
                        'bg-amber-100 text-amber-800'
                      }`}>
                        {c.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <button
                        onClick={() => handleOpenEdit(c)}
                        className="px-3 py-1.5 rounded-lg bg-sky-50 hover:bg-sky-100 text-sky-700 font-bold text-xs inline-flex items-center space-x-1 cursor-pointer transition-colors"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>Update</span>
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-600">
                    {isLoading ? 'Loading complaints...' : 'No complaints match the selected filters.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit / Triage Modal */}
      {editingComplaint && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-6 relative">
            <button
              onClick={() => setEditingComplaint(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-lg font-bold text-slate-900">
              Update Ticket {editingComplaint.ticket_id}
            </h3>
            <p className="text-xs text-slate-600 mt-0.5">
              Triage AI routing, change resolution status, and add technician notes.
            </p>

            <div className="my-4 p-3 bg-slate-50 rounded-xl text-xs text-slate-700 border border-slate-100">
              <span className="font-bold text-slate-800 block mb-1">Issue:</span>
              <p className="line-clamp-3">{editingComplaint.complaint}</p>
            </div>

            {saveSuccess && (
              <div className="mb-4 p-3 rounded-lg bg-emerald-50 text-emerald-800 text-xs font-semibold flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>{saveSuccess}</span>
              </div>
            )}

            <form onSubmit={handleSaveUpdate} className="space-y-4 text-xs">
              
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Status</label>
                  <select
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 font-semibold bg-white outline-none"
                  >
                    {STATUSES.map((st) => (
                      <option key={st} value={st}>{st}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Urgency</label>
                  <select
                    value={editUrgency}
                    onChange={(e) => setEditUrgency(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 font-semibold bg-white outline-none"
                  >
                    {URGENCIES.map((urg) => (
                      <option key={urg} value={urg}>{urg}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Reassign Department</label>
                <select
                  value={editDept}
                  onChange={(e) => setEditDept(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 font-semibold bg-white outline-none"
                >
                  {DEPARTMENTS.map((dept) => (
                    <option key={dept} value={dept}>{dept}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Assigned Technician / Staff</label>
                <input
                  type="text"
                  value={editAssignedTo}
                  onChange={(e) => setEditAssignedTo(e.target.value)}
                  placeholder="e.g. Electrician Team B / Technician John"
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Staff / Resolution Notes</label>
                <textarea
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  rows={3}
                  placeholder="e.g. Technician dispatched. Replaced damaged socket and verified wire insulation."
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 outline-none resize-none"
                />
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingComplaint(null)}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold transition-colors disabled:opacity-50"
                >
                  {isSaving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}
