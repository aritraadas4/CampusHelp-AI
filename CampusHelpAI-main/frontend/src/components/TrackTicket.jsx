import React, { useState, useEffect } from 'react';
import { 
  Search, Clock, CheckCircle2, AlertCircle, ShieldAlert, 
  MapPin, Calendar, Building, FileText, ArrowRight, ExternalLink 
} from 'lucide-react';
import { api } from '../api';

const STATUS_STEPS = ['Pending', 'Under Review', 'In Progress', 'Resolved'];

export default function TrackTicket({ initialTicketId }) {
  const [ticketInput, setTicketInput] = useState(initialTicketId || '');
  const [isLoading, setIsLoading] = useState(false);
  const [ticket, setTicket] = useState(null);
  const [error, setError] = useState('');

  // If initialTicketId passed, automatically load it
  useEffect(() => {
    if (initialTicketId) {
      setTicketInput(initialTicketId);
      handleSearch(initialTicketId);
    }
  }, [initialTicketId]);

  const handleSearch = async (queryId) => {
    const idToSearch = (queryId || ticketInput).trim();
    if (!idToSearch) {
      setError('Please enter a ticket ID.');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const data = await api.trackComplaint(idToSearch);
      setTicket(data);
    } catch (err) {
      setTicket(null);
      setError(err.message || `No complaint found for ticket "${idToSearch}".`);
    } finally {
      setIsLoading(false);
    }
  };

  const getStepStatus = (stepName) => {
    if (!ticket) return 'upcoming';
    if (ticket.status === 'Rejected') return stepName === 'Pending' ? 'current' : 'upcoming';

    const currentIndex = STATUS_STEPS.indexOf(ticket.status);
    const stepIndex = STATUS_STEPS.indexOf(stepName);

    if (stepIndex < currentIndex) return 'completed';
    if (stepIndex === currentIndex) return 'current';
    return 'upcoming';
  };

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6">
      <div className="text-center max-w-2xl mx-auto mb-8">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
          Track Complaint Ticket
        </h1>
        <p className="text-slate-600 mt-1">
          Enter your unique tracking ID (e.g. <span className="font-semibold text-slate-700">CMP-1001</span>) to check the real-time resolution status.
        </p>

        {/* Search Bar */}
        <form 
          onSubmit={(e) => { e.preventDefault(); handleSearch(); }}
          className="mt-6 flex items-center max-w-lg mx-auto shadow-sm rounded-2xl bg-white border border-slate-300 p-1.5 focus-within:ring-2 focus-within:ring-sky-500 focus-within:border-sky-500 transition-all"
        >
          <div className="pl-3 text-slate-400">
            <Search className="w-5 h-5" />
          </div>
          <input
            type="text"
            value={ticketInput}
            onChange={(e) => setTicketInput(e.target.value)}
            placeholder="Enter Ticket ID (e.g. CMP-1001)..."
            className="w-full px-3 py-2 text-sm text-slate-900 outline-none bg-transparent font-medium"
          />
          <button
            type="submit"
            disabled={isLoading}
            className="px-5 py-2.5 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-bold transition-colors disabled:opacity-50 shrink-0 cursor-pointer"
          >
            {isLoading ? 'Searching...' : 'Track Ticket'}
          </button>
        </form>

        {/* Quick sample ticket buttons */}
        <div className="mt-3 flex items-center justify-center space-x-2 text-xs text-slate-600">
          <span>Try sample tickets:</span>
          {['CMP-1001', 'CMP-1003', 'CMP-1006'].map((sample) => (
            <button
              key={sample}
              type="button"
              onClick={() => { setTicketInput(sample); handleSearch(sample); }}
              className="px-2 py-0.5 rounded bg-slate-200/70 hover:bg-slate-300 text-slate-700 font-semibold transition-colors"
            >
              {sample}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="max-w-2xl mx-auto p-4 rounded-xl bg-rose-50 border border-rose-200 flex items-center space-x-3 text-rose-700 text-sm">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {ticket && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          
          {/* Header Banner */}
          <div className="p-6 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-xl font-black text-slate-900 tracking-tight">{ticket.ticket_id}</span>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                  ticket.status === 'Resolved' ? 'bg-emerald-100 text-emerald-800' :
                  ticket.status === 'In Progress' ? 'bg-indigo-100 text-indigo-800' :
                  ticket.status === 'Under Review' ? 'bg-blue-100 text-blue-800' :
                  ticket.status === 'Rejected' ? 'bg-rose-100 text-rose-800' :
                  'bg-amber-100 text-amber-800'
                }`}>
                  {ticket.status}
                </span>
                <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                  ticket.urgency === 'Urgent' ? 'bg-rose-100 text-rose-800' :
                  ticket.urgency === 'High' ? 'bg-orange-100 text-orange-800' :
                  ticket.urgency === 'Medium' ? 'bg-blue-50 text-blue-700' :
                  'bg-slate-100 text-slate-700'
                }`}>
                  {ticket.urgency} Urgency
                </span>
              </div>
              <p className="text-xs text-slate-600 mt-1 flex items-center space-x-2">
                <Calendar className="w-3.5 h-3.5" />
                <span>Submitted: {ticket.date}</span>
                {ticket.location && (
                  <>
                    <span>•</span>
                    <MapPin className="w-3.5 h-3.5" />
                    <span>{ticket.location}</span>
                  </>
                )}
              </p>
            </div>

            <div className="text-left sm:text-right">
              <span className="text-xs text-slate-600 block">Assigned Department</span>
              <span className="text-sm font-bold text-slate-800 flex items-center sm:justify-end space-x-1 mt-0.5">
                <Building className="w-4 h-4 text-sky-600" />
                <span>{ticket.department}</span>
              </span>
            </div>
          </div>

          {/* Stepper Status Timeline */}
          {ticket.status !== 'Rejected' ? (
            <div className="p-6 border-b border-slate-100 bg-white">
              <div className="flex items-center justify-between max-w-2xl mx-auto relative">
                {/* Connecting Line */}
                <div className="absolute left-6 right-6 top-1/2 -translate-y-1/2 h-0.5 bg-slate-200 -z-0" />

                {STATUS_STEPS.map((step, idx) => {
                  const state = getStepStatus(step);
                  return (
                    <div key={step} className="flex flex-col items-center relative z-10">
                      <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs transition-all ${
                        state === 'completed'
                          ? 'bg-emerald-500 text-white shadow-sm'
                          : state === 'current'
                          ? 'bg-sky-600 text-white ring-4 ring-sky-100 shadow-sm'
                          : 'bg-white border-2 border-slate-300 text-slate-400'
                      }`}>
                        {state === 'completed' ? <CheckCircle2 className="w-5 h-5" /> : idx + 1}
                      </div>
                      <span className={`text-xs mt-2 font-semibold ${
                        state === 'current' ? 'text-sky-700 font-bold' :
                        state === 'completed' ? 'text-slate-800' : 'text-slate-600'
                      }`}>
                        {step}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="p-4 bg-rose-50 border-b border-rose-100 text-center text-rose-800 text-sm font-medium">
              This complaint ticket was marked as Rejected. Please see administration remarks below.
            </div>
          )}

          {/* Ticket Content Details */}
          <div className="p-6 space-y-6">
            
            {/* Complaint Text */}
            <div>
              <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">Reported Issue</span>
              <p className="mt-1 text-slate-900 bg-slate-50 p-4 rounded-xl border border-slate-100 text-sm leading-relaxed whitespace-pre-wrap">
                {ticket.complaint}
              </p>
            </div>

            {/* AI Diagnostics details */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-xs text-slate-600 block">AI Category</span>
                <span className="font-bold text-slate-800 text-sm mt-0.5 block">{ticket.category}</span>
              </div>
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-xs text-slate-600 block">Model Confidence</span>
                <span className="font-bold text-slate-800 text-sm mt-0.5 block">{ticket.confidence}%</span>
              </div>
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-xs text-slate-600 block">Routing Verification</span>
                <span className="font-bold text-sm mt-0.5 flex items-center space-x-1">
                  {ticket.review_required ? (
                    <span className="text-amber-600 flex items-center">
                      <ShieldAlert className="w-4 h-4 mr-1" /> Human Review
                    </span>
                  ) : (
                    <span className="text-emerald-600 flex items-center">
                      <CheckCircle2 className="w-4 h-4 mr-1" /> Automated
                    </span>
                  )}
                </span>
              </div>
            </div>

            {/* Administration / Staff Resolution Notes */}
            {ticket.admin_notes && (
              <div className="p-4 rounded-xl bg-sky-50 border border-sky-100">
                <span className="text-xs font-bold text-sky-900 uppercase tracking-wider block">Staff / Resolution Remarks</span>
                <p className="text-sm text-sky-950 mt-1">{ticket.admin_notes}</p>
                {ticket.assigned_to && (
                  <span className="text-xs text-sky-700 mt-2 block">Assigned Technician: {ticket.assigned_to}</span>
                )}
              </div>
            )}

            {/* Evidence attachment (if present) */}
            {ticket.attachment_url && (
              <div>
                <span className="text-xs font-bold text-slate-600 uppercase tracking-wider block mb-2">Attached Evidence</span>
                <a
                  href={ticket.attachment_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center space-x-2 px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold transition-colors"
                >
                  <FileText className="w-4 h-4 text-sky-600" />
                  <span>View Uploaded File</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            )}

          </div>
        </div>
      )}
    </div>
  );
}
