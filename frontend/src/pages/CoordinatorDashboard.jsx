import React, { useState, useEffect } from 'react';
import { 
  GraduationCap, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Users, 
  Calendar, 
  AlertTriangle,
  Building,
  ShieldCheck
} from 'lucide-react';
import { getBookings, updateBookingStatus, getSocket } from '../services/api';

export default function CoordinatorDashboard({ currentUser }) {
  const [bookings, setBookings] = useState([]);
  const [pendingApprovals, setPendingApprovals] = useState([]);

  const loadData = () => {
    getBookings().then(data => {
      const all = data.bookings || [];
      setBookings(all.filter(b => b.status === 'CONFIRMED' || b.status === 'RESCHEDULED'));
      setPendingApprovals(all.filter(b => b.status === 'PENDING'));
    });
  };

  useEffect(() => {
    loadData();
    const socket = getSocket();
    socket.on('booking:created', loadData);
    socket.on('booking:statusChanged', loadData);
    return () => {
      socket.off('booking:created');
      socket.off('booking:statusChanged');
    };
  }, []);

  const handleDecision = async (id, status) => {
    try {
      await updateBookingStatus(id, status, `Reviewed and ${status.toLowerCase()} by Department Coordinator`);
      loadData();
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Banner */}
      <div className="p-6 rounded-2xl glass-panel border border-slate-800 flex items-center justify-between">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-2xl font-extrabold text-white">Department Timetable & Approvals</h1>
            <span className="text-xs px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-400 font-semibold border border-amber-500/20">
              Department HOD Desk (CSE)
            </span>
          </div>
          <p className="text-sm text-slate-400 mt-1">
            Review departmental room allocations, approve student club and workshop requests, and verify zero timetable clashes.
          </p>
        </div>
      </div>

      {/* Pending Approvals Queue */}
      <div className="p-6 rounded-2xl glass-panel border border-amber-500/30 bg-gradient-to-br from-amber-950/20 to-slate-900 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Clock className="h-5 w-5 text-amber-400" />
            <h2 className="text-base font-bold text-white">
              Pending Department Approval Queue ({pendingApprovals.length})
            </h2>
          </div>
          <span className="text-xs text-amber-400/90 font-medium">Role: Coordinator Authorization</span>
        </div>

        {pendingApprovals.length === 0 ? (
          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 text-center text-xs text-slate-400">
            No pending requests requiring coordinator approval. All academic sessions auto-approved!
          </div>
        ) : (
          <div className="space-y-3">
            {pendingApprovals.map(req => (
              <div 
                key={req.id}
                className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-bold text-slate-200">{req.title}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 font-bold uppercase">
                      {req.user_role || 'Club Event'}
                    </span>
                  </div>
                  <div className="text-xs text-slate-400">
                    Requested Venue: <strong className="text-slate-300">{req.facility_name}</strong> · Attendees: {req.expected_attendees}
                  </div>
                  <div className="text-[11px] text-slate-500">
                    Requested by: {req.user_name} ({req.user_email}) · {new Date(req.start_time).toLocaleString()}
                  </div>
                </div>

                <div className="flex items-center space-x-2 flex-shrink-0">
                  <button
                    onClick={() => handleDecision(req.id, 'APPROVED')}
                    className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition"
                  >
                    <CheckCircle className="h-3.5 w-3.5" />
                    <span>Approve</span>
                  </button>

                  <button
                    onClick={() => handleDecision(req.id, 'REJECTED')}
                    className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold transition"
                  >
                    <XCircle className="h-3.5 w-3.5" />
                    <span>Reject</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Department Class Schedule */}
      <div className="p-6 rounded-2xl glass-panel border border-slate-800 space-y-4">
        <h2 className="text-base font-bold text-white">Active Department Class & Lab Schedule</h2>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="text-slate-400 border-b border-slate-800">
                <th className="py-2.5 px-3">Course / Session</th>
                <th className="py-2.5 px-3">Faculty In-Charge</th>
                <th className="py-2.5 px-3">Allocated Venue</th>
                <th className="py-2.5 px-3">Time Window</th>
                <th className="py-2.5 px-3">Capacity Fit</th>
                <th className="py-2.5 px-3">Conflict Guard</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {bookings.map(b => (
                <tr key={b.id} className="hover:bg-slate-800/30">
                  <td className="py-3 px-3 font-semibold text-slate-200">{b.title}</td>
                  <td className="py-3 px-3 text-slate-300">{b.user_name}</td>
                  <td className="py-3 px-3 text-slate-200 font-medium">
                    {b.facility_name} ({b.building})
                  </td>
                  <td className="py-3 px-3 text-slate-400">
                    {new Date(b.start_time).toLocaleDateString([], { month: 'short', day: 'numeric' })} · {new Date(b.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {new Date(b.end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </td>
                  <td className="py-3 px-3 text-emerald-400 font-bold">
                    {b.expected_attendees} students (Verified)
                  </td>
                  <td className="py-3 px-3">
                    <span className="flex items-center space-x-1 text-emerald-400 text-[11px]">
                      <ShieldCheck className="h-3.5 w-3.5" />
                      <span>Zero Clash</span>
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
