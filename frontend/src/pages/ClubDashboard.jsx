import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Calendar, 
  Clock, 
  Send, 
  CheckCircle2, 
  Clock3, 
  Sparkles,
  Building2,
  XCircle
} from 'lucide-react';
import { previewAllocation, createBooking, getBookings, getSocket } from '../services/api';

export default function ClubDashboard({ currentUser }) {
  const [title, setTitle] = useState('Google Developer Student Club - Flutter & AI Workshop');
  const [facilityType, setFacilityType] = useState('seminar_hall');
  const [expectedAttendees, setExpectedAttendees] = useState(120);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [startHour, setStartHour] = useState(14);
  const [durationHours, setDurationHours] = useState(3);
  const [submissions, setSubmissions] = useState([]);
  const [submittedNotice, setSubmittedNotice] = useState(null);

  const formatIso = (hr) => {
    const d = new Date(date);
    d.setHours(hr, 0, 0, 0);
    return d.toISOString();
  };

  const loadSubmissions = () => {
    getBookings('userId=usr-club-rep').then(data => {
      setSubmissions(data.bookings || []);
    });
  };

  useEffect(() => {
    loadSubmissions();
    const socket = getSocket();
    socket.on('booking:created', loadSubmissions);
    socket.on('booking:statusChanged', loadSubmissions);
    return () => {
      socket.off('booking:created');
      socket.off('booking:statusChanged');
    };
  }, []);

  const handleSubmitRequest = async () => {
    try {
      const res = await createBooking({
        title,
        purpose: 'Club Workshop & Technical Hackathon',
        facilityType,
        expectedAttendees: parseInt(expectedAttendees),
        startTime: formatIso(startHour),
        endTime: formatIso(startHour + durationHours),
        priority: 4,
        autoAllocate: true
      });

      setSubmittedNotice(res);
      loadSubmissions();
      setTimeout(() => setSubmittedNotice(null), 6000);
    } catch (err) {
      alert(err.message || 'Error submitting event request');
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Banner */}
      <div className="p-6 rounded-2xl glass-panel border border-slate-800 flex items-center justify-between">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-2xl font-extrabold text-white">Student Club Event Booking Portal</h1>
            <span className="text-xs px-2.5 py-1 rounded-full bg-purple-500/10 text-purple-400 font-semibold border border-purple-500/20">
              Club Lead Desk
            </span>
          </div>
          <p className="text-sm text-slate-400 mt-1">
            Request seminar halls, auditoriums, and sports facilities for collegiate workshops, competitions, and fests.
          </p>
        </div>
      </div>

      {submittedNotice && (
        <div className="p-4 rounded-xl bg-purple-950/60 border border-purple-500/50 text-purple-200 text-xs flex items-center justify-between animate-fade-in">
          <div className="flex items-center space-x-3">
            <CheckCircle2 className="h-5 w-5 text-purple-400 flex-shrink-0" />
            <div>
              <strong className="font-bold">Request Submitted!</strong> {submittedNotice.message}
              <div className="text-[11px] text-purple-300/80 mt-0.5">
                Suggested Venue: {submittedNotice.booking?.facility_name} · Routing to Department Coordinator for approval.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Event Request Form */}
        <div className="lg:col-span-6 p-6 rounded-2xl glass-panel border border-slate-800 space-y-4">
          <h2 className="text-base font-bold text-white flex items-center space-x-2">
            <Sparkles className="h-4 w-4 text-purple-400" />
            <span>Event Venue Application (Workflow B)</span>
          </h2>

          <div className="space-y-3 text-xs">
            <div>
              <label className="block text-slate-400 mb-1 font-medium">Event Title</label>
              <input
                type="text"
                value={title}
                onChange={e => setTitle(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-slate-200 focus:outline-none focus:border-purple-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-400 mb-1 font-medium">Facility Requested</label>
                <select
                  value={facilityType}
                  onChange={e => setFacilityType(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-slate-200 focus:outline-none focus:border-purple-500"
                >
                  <option value="seminar_hall">Seminar Hall (100 - 250 seats)</option>
                  <option value="auditorium">Grand Auditorium (350 - 850 seats)</option>
                  <option value="sports_facility">Sports Arena / Football Ground</option>
                  <option value="computer_lab">Computer Lab (Hackathons)</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-medium">Expected Participants</label>
                <input
                  type="number"
                  min="20"
                  max="800"
                  value={expectedAttendees}
                  onChange={e => setExpectedAttendees(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-slate-200 focus:outline-none focus:border-purple-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-slate-400 mb-1 font-medium">Event Date</label>
                <input
                  type="date"
                  value={date}
                  onChange={e => setDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-slate-200 focus:outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-medium">Start Hour</label>
                <select
                  value={startHour}
                  onChange={e => setStartHour(parseInt(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-slate-200 focus:outline-none focus:border-purple-500"
                >
                  {[9, 10, 11, 12, 13, 14, 15, 16, 17, 18].map(h => (
                    <option key={h} value={h}>{h > 12 ? `${h-12}:00 PM` : `${h}:00 AM`}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-medium">Duration</label>
                <select
                  value={durationHours}
                  onChange={e => setDurationHours(parseInt(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-slate-200 focus:outline-none focus:border-purple-500"
                >
                  <option value={2}>2 Hours</option>
                  <option value={3}>3 Hours</option>
                  <option value={4}>4 Hours</option>
                </select>
              </div>
            </div>

            <button
              onClick={handleSubmitRequest}
              className="w-full mt-2 py-3 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs shadow-lg shadow-purple-500/25 transition flex items-center justify-center space-x-2"
            >
              <Send className="h-4 w-4" />
              <span>Submit Event Application for Approval</span>
            </button>
          </div>
        </div>

        {/* My Event Applications Status Tracker */}
        <div className="lg:col-span-6 p-6 rounded-2xl glass-panel border border-slate-800 space-y-4">
          <h2 className="text-base font-bold text-white flex items-center space-x-2">
            <Clock3 className="h-4 w-4 text-purple-400" />
            <span>Club Applications Tracker</span>
          </h2>

          <div className="space-y-3">
            {submissions.map(sub => {
              const isApproved = sub.status === 'APPROVED' || sub.status === 'CONFIRMED';
              const isPending = sub.status === 'PENDING';
              return (
                <div 
                  key={sub.id}
                  className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-between text-xs"
                >
                  <div className="space-y-1">
                    <div className="font-bold text-slate-200">{sub.title}</div>
                    <div className="text-[11px] text-slate-400">
                      Venue: <strong className="text-slate-300">{sub.facility_name}</strong> · Attendees: {sub.expected_attendees}
                    </div>
                    <div className="text-[10px] text-slate-500">
                      {new Date(sub.start_time).toLocaleString()}
                    </div>
                  </div>

                  <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase border ${
                    isApproved 
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' 
                      : isPending 
                        ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                        : 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                  }`}>
                    {sub.status}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

      </div>

    </div>
  );
}
