import React, { useState, useEffect } from 'react';
import { 
  Sparkles, AlertTriangle, CheckCircle, ShieldAlert, Upload, 
  MapPin, User, Mail, Send, Check, ArrowRight, FileCheck 
} from 'lucide-react';
import { api } from '../api';

export default function SubmitComplaint({ user, onComplaintSubmitted, onTrackTicket }) {
  const [complaintText, setComplaintText] = useState('');
  const [studentName, setStudentName] = useState(user?.full_name || '');
  const [studentEmail, setStudentEmail] = useState(user?.email || '');
  const [location, setLocation] = useState('');
  const [urgencyOverride, setUrgencyOverride] = useState('');
  
  // AI Analysis state
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState(null);
  
  // File upload state
  const [file, setFile] = useState(null);
  const [filePreview, setFilePreview] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedUrl, setUploadedUrl] = useState('');

  // Submission state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [submittedTicket, setSubmittedTicket] = useState(null);

  // Sync user info when user changes
  useEffect(() => {
    if (user) {
      if (!studentName) setStudentName(user.full_name || '');
      if (!studentEmail) setStudentEmail(user.email || '');
    }
  }, [user]);

  // Debounced AI classification when user types complaint
  useEffect(() => {
    if (complaintText.trim().length < 8) {
      setAnalysis(null);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        setIsAnalyzing(true);
        const res = await api.analyzeComplaint(complaintText);
        setAnalysis(res);
      } catch (err) {
        // Silent fail for debounced preview
      } finally {
        setIsAnalyzing(false);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [complaintText]);

  // Handle file select
  const handleFileChange = (e) => {
    const selected = e.target.files[0];
    if (!selected) return;

    if (selected.size > 5 * 1024 * 1024) {
      setError('File size exceeds maximum allowed limit of 5 MB.');
      return;
    }
    setError('');
    setFile(selected);

    // Create image preview if image
    if (selected.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = () => setFilePreview(reader.result);
      reader.readAsDataURL(selected);
    } else {
      setFilePreview(null);
    }
  };

  // Submit Complaint
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!complaintText.trim()) {
      setError('Please provide a description of your issue.');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      let attachmentUrl = uploadedUrl;

      // Upload evidence file if selected
      if (file && !uploadedUrl) {
        setIsUploading(true);
        const uploadRes = await api.uploadFile(file);
        attachmentUrl = uploadRes.file_url;
        setUploadedUrl(attachmentUrl);
        setIsUploading(false);
      }

      const payload = {
        complaint: complaintText.trim(),
        student_name: studentName.trim() || 'Anonymous Student',
        student_email: studentEmail.trim(),
        location: location.trim() || 'Main Campus',
        urgency: urgencyOverride || (analysis ? analysis.suggested_urgency : 'Medium'),
        attachment_url: attachmentUrl,
      };

      const res = await api.submitComplaint(payload);
      setSubmittedTicket(res);
      if (onComplaintSubmitted) onComplaintSubmitted(res);
    } catch (err) {
      setError(err.message || 'Failed to submit complaint. Please try again.');
    } finally {
      setIsSubmitting(false);
      setIsUploading(false);
    }
  };

  // Reset form
  const handleReset = () => {
    setComplaintText('');
    setLocation('');
    setUrgencyOverride('');
    setAnalysis(null);
    setFile(null);
    setFilePreview(null);
    setUploadedUrl('');
    setSubmittedTicket(null);
    setError('');
  };

  // Render Success screen if submitted
  if (submittedTicket) {
    return (
      <div className="max-w-2xl mx-auto py-12 px-4 sm:px-6">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 text-center">
          <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-9 h-9" />
          </div>
          <h2 className="text-2xl font-extrabold text-slate-900">Complaint Registered!</h2>
          <p className="text-slate-600 mt-1">Your complaint has been processed and routed to the responsible department.</p>

          <div className="my-6 p-4 bg-slate-50 border border-slate-200 rounded-xl max-w-md mx-auto">
            <span className="text-xs uppercase tracking-wider font-semibold text-slate-600">Your Ticket Tracking ID</span>
            <div className="text-3xl font-black text-sky-700 mt-1 tracking-tight select-all">
              {submittedTicket.ticket_id}
            </div>
            <p className="text-xs text-slate-600 mt-1">Save this ticket ID to track updates in real-time.</p>
          </div>

          <div className="grid grid-cols-2 gap-3 text-left max-w-md mx-auto mb-6 text-sm">
            <div className="p-3 bg-slate-50 rounded-lg">
              <span className="text-xs text-slate-600 block">Category</span>
              <span className="font-semibold text-slate-800">{submittedTicket.category}</span>
            </div>
            <div className="p-3 bg-slate-50 rounded-lg">
              <span className="text-xs text-slate-600 block">Department</span>
              <span className="font-semibold text-slate-800">{submittedTicket.department}</span>
            </div>
            <div className="p-3 bg-slate-50 rounded-lg">
              <span className="text-xs text-slate-600 block">AI Confidence</span>
              <span className="font-semibold text-slate-800">{submittedTicket.confidence}%</span>
            </div>
            <div className="p-3 bg-slate-50 rounded-lg">
              <span className="text-xs text-slate-600 block">Urgency</span>
              <span className="font-semibold text-slate-800">{submittedTicket.urgency}</span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              onClick={() => onTrackTicket(submittedTicket.ticket_id)}
              className="w-full sm:w-auto px-6 py-2.5 bg-sky-600 hover:bg-sky-700 text-white font-semibold rounded-xl flex items-center justify-center space-x-2 shadow-sm transition-all"
            >
              <span>Track Live Status</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            <button
              onClick={handleReset}
              className="w-full sm:w-auto px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl transition-colors"
            >
              Submit Another Complaint
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6">
      <div className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
          Campus Complaint Registration
        </h1>
        <p className="text-slate-600 mt-1">
          Describe your problem below. Our AI classifier will automatically determine the category, assign the responsible department, and assess urgency.
        </p>
      </div>

      {error && (
        <div className="mb-6 p-4 rounded-xl bg-rose-50 border border-rose-200 flex items-start space-x-3 text-rose-700 text-sm">
          <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left 2 Cols: Complaint Form */}
        <div className="lg:col-span-2">
          <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-6">
            
            {/* Complaint Text Description */}
            <div>
              <label className="block text-sm font-bold text-slate-800 mb-2">
                Problem Description <span className="text-rose-500">*</span>
              </label>
              <textarea
                value={complaintText}
                onChange={(e) => setComplaintText(e.target.value)}
                rows={4}
                required
                placeholder="Example: The Wi-Fi connection in the library reading room keeps disconnecting, or electrical wire is exposed near classroom 204..."
                className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-sky-500 focus:border-sky-500 text-slate-900 placeholder:text-slate-400 text-sm outline-none transition-all resize-y"
              />
              <span className="text-xs text-slate-600 mt-1 block">
                Type at least 8 characters to trigger real-time AI category prediction.
              </span>
            </div>

            {/* Student Info Inputs */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center space-x-1">
                  <User className="w-3.5 h-3.5" />
                  <span>Student Name</span>
                </label>
                <input
                  type="text"
                  value={studentName}
                  onChange={(e) => setStudentName(e.target.value)}
                  placeholder="e.g. Rahul Sharma"
                  className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-sky-500 text-sm outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center space-x-1">
                  <Mail className="w-3.5 h-3.5" />
                  <span>Student Email</span>
                </label>
                <input
                  type="email"
                  value={studentEmail}
                  onChange={(e) => setStudentEmail(e.target.value)}
                  placeholder="e.g. rahul@campus.edu"
                  className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-sky-500 text-sm outline-none"
                />
              </div>
            </div>

            {/* Location & Urgency */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center space-x-1">
                  <MapPin className="w-3.5 h-3.5" />
                  <span>Specific Location / Room</span>
                </label>
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="e.g. Science Block 2nd Floor, Room 204"
                  className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-sky-500 text-sm outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center space-x-1">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>Urgency Level</span>
                </label>
                <select
                  value={urgencyOverride}
                  onChange={(e) => setUrgencyOverride(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-sky-500 text-sm outline-none bg-white"
                >
                  <option value="">AI Detected Urgency (Default)</option>
                  <option value="Low">Low - Minor / Routine</option>
                  <option value="Medium">Medium - Standard Issue</option>
                  <option value="High">High - Significant Disruption</option>
                  <option value="Urgent">Urgent - Emergency / Hazard</option>
                </select>
              </div>
            </div>

            {/* Evidence Photo / Document Upload */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center space-x-1">
                <Upload className="w-3.5 h-3.5" />
                <span>Attach Photo / Evidence (Optional, max 5MB)</span>
              </label>
              
              <div className="border-2 border-dashed border-slate-200 hover:border-sky-400 rounded-xl p-4 transition-colors">
                <input
                  type="file"
                  id="evidence-file"
                  onChange={handleFileChange}
                  accept=".jpg,.jpeg,.png,.webp,.pdf"
                  className="hidden"
                />
                
                {file ? (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      {filePreview ? (
                        <img src={filePreview} alt="Preview" className="w-12 h-12 object-cover rounded-lg border border-slate-200" />
                      ) : (
                        <div className="w-12 h-12 bg-sky-100 text-sky-700 rounded-lg flex items-center justify-center font-bold text-xs">
                          {file.name.split('.').pop().toUpperCase()}
                        </div>
                      )}
                      <div>
                        <p className="text-sm font-semibold text-slate-800 line-clamp-1">{file.name}</p>
                        <p className="text-xs text-slate-600">{(file.size / 1024).toFixed(1)} KB</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => { setFile(null); setFilePreview(null); }}
                      className="text-xs font-semibold text-rose-600 hover:text-rose-700 px-2 py-1"
                    >
                      Remove
                    </button>
                  </div>
                ) : (
                  <label htmlFor="evidence-file" className="flex flex-col items-center justify-center cursor-pointer py-2">
                    <Upload className="w-6 h-6 text-slate-400 mb-1" />
                    <span className="text-xs font-semibold text-sky-600">Click to upload photo or document</span>
                    <span className="text-[11px] text-slate-600 mt-0.5">JPG, PNG, WebP or PDF (up to 5MB)</span>
                  </label>
                )}
              </div>
            </div>

            {/* Submit Button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={isSubmitting || isUploading}
                className="w-full py-3.5 px-6 rounded-xl bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-700 hover:to-indigo-700 text-white font-bold text-sm shadow-md shadow-sky-500/20 disabled:opacity-50 flex items-center justify-center space-x-2 transition-all cursor-pointer"
              >
                {isSubmitting || isUploading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Processing Complaint...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>Submit Complaint to Campus Helpdesk</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Right Col: Live AI Analysis Card */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 sticky top-24">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center space-x-2">
                <Sparkles className="w-4 h-4 text-sky-600" />
                <h3 className="font-bold text-slate-800 text-sm">Live AI Prediction</h3>
              </div>
              {isAnalyzing && (
                <span className="text-[11px] font-semibold text-sky-600 flex items-center space-x-1">
                  <span className="w-2 h-2 rounded-full bg-sky-500 animate-ping inline-block" />
                  <span>Analyzing...</span>
                </span>
              )}
            </div>

            {analysis ? (
              <div className="mt-4 space-y-4">
                
                {/* Category & Department */}
                <div>
                  <span className="text-xs text-slate-600 block">Predicted Category</span>
                  <div className="font-extrabold text-slate-900 text-base mt-0.5">
                    {analysis.category}
                  </div>
                  <div className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-sky-50 text-sky-700 mt-1">
                    Department: {analysis.department}
                  </div>
                </div>

                {/* Confidence Bar */}
                <div>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-slate-600">Model Confidence</span>
                    <span className={`font-bold ${
                      analysis.confidence >= 60 ? 'text-emerald-600' :
                      analysis.confidence >= 40 ? 'text-amber-600' : 'text-rose-600'
                    }`}>
                      {analysis.confidence}%
                    </span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        analysis.confidence >= 60 ? 'bg-emerald-500' :
                        analysis.confidence >= 40 ? 'bg-amber-500' : 'bg-rose-500'
                      }`}
                      style={{ width: `${Math.min(100, analysis.confidence)}%` }}
                    />
                  </div>
                </div>

                {/* Review Required Flag */}
                {analysis.review_required ? (
                  <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 flex items-start space-x-2 text-xs text-amber-800">
                    <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold block">Requires Human Review</span>
                      <span className="text-amber-700">Confidence is below 40%. An administrator will manually verify routing.</span>
                    </div>
                  </div>
                ) : (
                  <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center space-x-2 text-xs text-emerald-800">
                    <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span className="font-medium">Automatically Verified Routing</span>
                  </div>
                )}

                {/* Separate Urgency Analysis */}
                <div className="pt-3 border-t border-slate-100">
                  <span className="text-xs text-slate-600 block">Assessed Urgency (Independent)</span>
                  <div className="flex items-center space-x-2 mt-1">
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-extrabold ${
                      analysis.suggested_urgency === 'Urgent' ? 'bg-rose-100 text-rose-800' :
                      analysis.suggested_urgency === 'High' ? 'bg-orange-100 text-orange-800' :
                      analysis.suggested_urgency === 'Medium' ? 'bg-blue-100 text-blue-800' :
                      'bg-slate-100 text-slate-700'
                    }`}>
                      {analysis.suggested_urgency}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-600 mt-1 italic">
                    {analysis.urgency_reason}
                  </p>
                </div>

              </div>
            ) : (
              <div className="py-8 text-center text-slate-400">
                <Sparkles className="w-8 h-8 mx-auto mb-2 opacity-40" />
                <p className="text-xs font-medium">Start typing your complaint description to see live AI classification.</p>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
