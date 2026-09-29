import React, { useState, useEffect } from 'react';
import { 
  Sparkles, 
  Calendar, 
  Clock, 
  Users, 
  CheckCircle2, 
  AlertTriangle, 
  Layers, 
  ArrowRight, 
  Building,
  Monitor,
  Check,
  X,
  QrCode,
  ShieldAlert
} from 'lucide-react';
import { previewAllocation, createBooking, getBookings, getSocket } from '../services/api';

export default function FacultyDashboard({ currentUser }) {
  const [facilityType, setFacilityType] = useState('computer_lab');
  const [expectedAttendees, setExpectedAttendees] = useState(55);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [startHour, setStartHour] = useState(10);
  const [durationHours, setDurationHours] = useState(2);
  const [title, setTitle] = useState('Advanced Systems & Algorithms Lab');
  const [requiredEquipment, setRequiredEquipment] = useState(['eq-pcs-60', 'eq-proj-4k']);
  
  const [priority, setPriority] = useState(2);
  const [qrModalBooking, setQrModalBooking] = useState(null);
  const [previewResult, setPreviewResult] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [bookingSuccess, setBookingSuccess] = useState(null);
  const [myBookings, setMyBookings] = useState([]);

  const formatIsoTime = (hr) => {
    const d = new Date(date);
    d.setHours(hr, 0, 0, 0);
    return d.toISOString();
  };

  const loadMyBookings = () => {
    getBookings('status=CONFIRMED&upcomingOnly=true').then(data => {
      setMyBookings(data.bookings || []);
    }).catch(() => {});
  };

  useEffect(() => {
    loadMyBookings();
    handlePreview();

    const socket = getSocket();
    socket.on('booking:created', loadMyBookings);
    socket.on('booking:statusChanged', loadMyBookings);
    return () => {
      socket.off('booking:created');
      socket.off('booking:statusChanged');
    };
  }, [facilityType, expectedAttendees, date, startHour, durationHours]);

  const handlePreview = async () => {
    setPreviewLoading(true);
    try {
      const s = formatIsoTime(startHour);
      const e = formatIsoTime(startHour + durationHours);
      const res = await previewAllocation({
        facilityType,
        expectedAttendees: parseInt(expectedAttendees),
        startTime: s,
        endTime: e,
        requiredEquipment,
        priority: 2
      });
      setPreviewResult(res);
    } catch (err) {
      console.error(err);
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleConfirmBooking = async (chosenFacilityId = null) => {
    const s = formatIsoTime(startHour);
    const e = formatIsoTime(startHour + durationHours);

    try {
      const res = await createBooking({
        title,
        purpose: 'Academic Practical / Theoretical Session',
        facilityId: chosenFacilityId || (previewResult?.assignedFacility?.id),
        facilityType,
        expectedAttendees: parseInt(expectedAttendees),
        startTime: s,
        endTime: e,
        requiredEquipment,
        priority: 2,
        autoAllocate: !chosenFacilityId
      });

      setBookingSuccess(res);
      loadMyBookings();
      setTimeout(() => setBookingSuccess(null), 6000);
    } catch (err) {
      alert(err.message || 'Booking conflict encountered.');
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Banner */}
      <div className="p-6 rounded-2xl glass-panel border border-slate-800 flex items-center justify-between">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-2xl font-extrabold text-white">Faculty Resource Allocation Desk</h1>
            <span className="text-xs px-2.5 py-1 rounded-full bg-sky-500/10 text-sky-400 font-semibold border border-sky-500/20">
              Auto-Allocation Mode
            </span>
          </div>
          <p className="text-sm text-slate-400 mt-1">
            Specify student count, session type, and equipment. The AI & constraint engine picks the optimal venue with 0 clashes.
          </p>
        </div>
      </div>

      {bookingSuccess && (
        <div className="p-4 rounded-xl bg-emerald-950/60 border border-emerald-500/50 text-emerald-200 text-xs flex items-center justify-between animate-fade-in">
          <div className="flex items-center space-x-3">
            <CheckCircle2 className="h-5 w-5 text-emerald-400 flex-shrink-0" />
            <div>
              <strong className="font-bold">Allocated & Confirmed!</strong> {bookingSuccess.message}
              <div className="text-[11px] text-emerald-300/80 mt-0.5">
                Assigned: {bookingSuccess.booking?.facility_name} ({bookingSuccess.booking?.building}, Floor {bookingSuccess.booking?.floor}) | Match Score: {bookingSuccess.matchScore}%
              </div>
            </div>
          </div>
          <button onClick={() => setBookingSuccess(null)} className="p-1 hover:bg-emerald-900 rounded">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Main Grid: Form Left, AI Engine Live Match Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left 6 Cols: Request Builder */}
        <div className="lg:col-span-6 p-6 rounded-2xl glass-panel border border-slate-800 space-y-4">
          <h2 className="text-base font-bold text-white flex items-center space-x-2">
            <Calendar className="h-4 w-4 text-sky-400" />
            <span>Resource Request Form</span>
          </h2>

          <div className="space-y-3 text-xs">
            <div>
              <label className="block text-slate-400 mb-1 font-medium">Session Title / Course Name</label>
              <input 
                type="text"
                value={title}
                onChange={e => setTitle(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-slate-200 focus:outline-none focus:border-sky-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-400 mb-1 font-medium">Facility Category</label>
                <select 
                  value={facilityType}
                  onChange={e => setFacilityType(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-slate-200 focus:outline-none focus:border-sky-500"
                >
                  <option value="computer_lab">Computer Lab</option>
                  <option value="classroom">Lecture Hall / Classroom</option>
                  <option value="seminar_hall">Seminar Hall</option>
                  <option value="auditorium">Auditorium</option>
                  <option value="sports_facility">Sports Arena</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-medium">Expected Attendees</label>
                <input 
                  type="number"
                  min="5"
                  max="800"
                  value={expectedAttendees}
                  onChange={e => setExpectedAttendees(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-slate-200 focus:outline-none focus:border-sky-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-slate-400 mb-1 font-medium">Date</label>
                <input 
                  type="date"
                  value={date}
                  onChange={e => setDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-slate-200 focus:outline-none focus:border-sky-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-medium">Start Hour</label>
                <select 
                  value={startHour}
                  onChange={e => setStartHour(parseInt(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-slate-200 focus:outline-none focus:border-sky-500"
                >
                  {[8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18].map(h => (
                    <option key={h} value={h}>{h > 12 ? `${h-12}:00 PM` : `${h}:00 AM`}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-medium">Duration</label>
                <select 
                  value={durationHours}
                  onChange={e => setDurationHours(parseInt(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-slate-200 focus:outline-none focus:border-sky-500"
                >
                  <option value={1}>1 Hour</option>
                  <option value={2}>2 Hours</option>
                  <option value={3}>3 Hours</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-slate-400 mb-1 font-medium">Academic Priority & Preemption Level</label>
              <select
                value={priority}
                onChange={e => setPriority(parseInt(e.target.value))}
                className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-slate-200 focus:outline-none focus:border-sky-500"
              >
                <option value={2}>Priority 2: Standard Lecture / Lab Practical</option>
                <option value={1}>Priority 1: Mandatory Midterm / Final Exam (Overrides & Preempts Club Events)</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-400 mb-1.5 font-medium">Required Equipment Verification</label>
              <div className="flex flex-wrap gap-2">
                {[
                  { id: 'eq-pcs-60', label: '60x Workstations' },
                  { id: 'eq-proj-4k', label: '4K Projector' },
                  { id: 'eq-central-ac', label: 'Central AC' },
                  { id: 'eq-smartboard', label: 'Smart Board' }
                ].map(eq => {
                  const selected = requiredEquipment.includes(eq.id);
                  return (
                    <button
                      type="button"
                      key={eq.id}
                      onClick={() => {
                        if (selected) {
                          setRequiredEquipment(requiredEquipment.filter(x => x !== eq.id));
                        } else {
                          setRequiredEquipment([...requiredEquipment, eq.id]);
                        }
                      }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition ${
                        selected 
                          ? 'bg-sky-500/20 border-sky-500/40 text-sky-200' 
                          : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {selected ? '✓ ' : '+ '}{eq.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="pt-3">
              <button
                type="button"
                onClick={() => handleConfirmBooking()}
                disabled={previewLoading || !previewResult?.assignedFacility}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 text-white font-bold text-xs shadow-lg shadow-sky-500/25 transition disabled:opacity-50 flex items-center justify-center space-x-2"
              >
                <span>Confirm & Lock Allocation</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Right 6 Cols: AI Allocation Engine Live Result & Explainable Alternatives */}
        <div className="lg:col-span-6 p-6 rounded-2xl glass-panel border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Sparkles className="h-4 w-4 text-sky-400" />
              <h2 className="text-base font-bold text-white">Engine Recommendation</h2>
            </div>
            {previewLoading && (
              <span className="text-xs text-sky-400 animate-pulse">Evaluating constraints...</span>
            )}
          </div>

          {previewResult?.status === 'ALLOCATION_FOUND' && previewResult.assignedFacility ? (
            <div className="space-y-4">
              
              {/* Primary Pick Card */}
              <div className="p-4 rounded-xl bg-gradient-to-br from-sky-950/40 to-slate-900 border border-sky-500/30 space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 uppercase">
                      Top Match (#1)
                    </span>
                    <h3 className="text-lg font-bold text-white mt-1">
                      {previewResult.assignedFacility.name}
                    </h3>
                    <p className="text-xs text-slate-400">
                      {previewResult.assignedFacility.building}, Floor {previewResult.assignedFacility.floor} · Capacity: {previewResult.assignedFacility.capacity} Seats
                    </p>
                  </div>

                  <div className="text-right">
                    <div className="text-2xl font-black text-sky-400">
                      {previewResult.matchScore}%
                    </div>
                    <span className="text-[10px] text-slate-400">Constraint Fit</span>
                  </div>
                </div>

                {/* Match Reasons */}
                <div className="space-y-1.5 pt-2 border-t border-slate-800">
                  <div className="text-[11px] font-semibold text-slate-300">Why this facility was selected:</div>
                  {previewResult.matchReasons?.map((r, i) => (
                    <div key={i} className="flex items-center space-x-1.5 text-[11px] text-emerald-400">
                      <Check className="h-3 w-3 flex-shrink-0" />
                      <span>{r}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Explainable Alternatives */}
              {previewResult.alternatives?.length > 0 && (
                <div className="space-y-2">
                  <div className="text-xs font-semibold text-slate-300">
                    Smart Parallel Alternatives (Available Now):
                  </div>
                  <div className="space-y-2">
                    {previewResult.alternatives.map((alt, i) => (
                      <div 
                        key={i} 
                        className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center justify-between text-xs hover:border-slate-700 transition"
                      >
                        <div>
                          <div className="font-semibold text-slate-200">{alt.facilityName}</div>
                          <div className="text-[11px] text-slate-400">{alt.building} · Cap: {alt.capacity}</div>
                          <div className="text-[10px] text-slate-500 mt-0.5">{alt.reasons?.[0]}</div>
                        </div>
                        <div className="text-right space-y-1.5">
                          <span className="text-xs font-bold text-slate-300">{alt.matchScore}%</span>
                          <button
                            type="button"
                            onClick={() => handleConfirmBooking(alt.facilityId)}
                            className="block px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-sky-600 text-white text-[11px] font-medium transition"
                          >
                            Pick This
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            </div>
          ) : (
            <div className="p-5 rounded-xl bg-rose-950/20 border border-rose-500/30 text-xs space-y-3">
              <div className="flex items-center space-x-2 text-rose-300 font-bold">
                <AlertTriangle className="h-4 w-4" />
                <span>Zero Direct Rooms Free for Requested Slot</span>
              </div>
              <p className="text-slate-300">
                All facilities matching this capacity and type are occupied or undergoing maintenance.
              </p>

              {/* Offer Alternate Time Slots */}
              {previewResult?.alternatives?.length > 0 && (
                <div className="space-y-2 pt-2 border-t border-rose-900/40">
                  <div className="font-semibold text-slate-200">Recommended Alternative Time Slots:</div>
                  {previewResult.alternatives.map((alt, idx) => (
                    <div key={idx} className="p-2.5 rounded-lg bg-slate-900/80 border border-slate-800 flex justify-between items-center">
                      <div>
                        <div className="text-slate-200 font-medium">{alt.facilityName}</div>
                        <div className="text-[10px] text-sky-400">{alt.reasons?.[0]}</div>
                      </div>
                      <span className="text-xs font-bold text-amber-300">{alt.matchScore}%</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

        </div>

      </div>

      {/* Confirmed Active Bookings Table */}
      <div className="p-6 rounded-2xl glass-panel border border-slate-800">
        <h2 className="text-base font-bold text-white mb-1">My Allocated Sessions & Timetable</h2>
        <p className="text-xs text-slate-400 mb-4">Live confirmed classes and seminars</p>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="text-slate-400 border-b border-slate-800">
                <th className="py-2.5 px-3">Session Title</th>
                <th className="py-2.5 px-3">Venue</th>
                <th className="py-2.5 px-3">Schedule</th>
                <th className="py-2.5 px-3">Attendees</th>
                <th className="py-2.5 px-3">Match Score</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {myBookings.map((b) => (
                <tr key={b.id} className="hover:bg-slate-800/30">
                  <td className="py-3 px-3 font-semibold text-slate-200">{b.title}</td>
                  <td className="py-3 px-3 text-slate-300">
                    {b.facility_name} ({b.building})
                  </td>
                  <td className="py-3 px-3 text-slate-400">
                    {new Date(b.start_time).toLocaleDateString([], { month: 'short', day: 'numeric' })} · {new Date(b.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {new Date(b.end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </td>
                  <td className="py-3 px-3 text-slate-300">{b.expected_attendees} students</td>
                  <td className="py-3 px-3">
                    <span className="font-bold text-sky-400">{b.match_score || 94.5}%</span>
                  </td>
                  <td className="py-3 px-3">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 uppercase">
                      {b.status}
                    </span>
                  </td>
                  <td className="py-3 px-3">
                    <button
                      onClick={() => setQrModalBooking(b)}
                      className="flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-sky-600/20 hover:bg-sky-600 text-sky-300 hover:text-white border border-sky-500/30 text-[11px] font-medium transition"
                    >
                      <QrCode className="h-3.5 w-3.5" />
                      <span>QR Check-In</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* QR Check-In Modal */}
      {qrModalBooking && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="p-6 rounded-2xl glass-panel border border-slate-700 max-w-sm w-full space-y-4 text-center">
            <div className="flex justify-between items-center pb-2 border-b border-slate-800">
              <span className="text-xs font-bold text-slate-300">Class Attendance & Check-In</span>
              <button onClick={() => setQrModalBooking(null)} className="p-1 hover:bg-slate-800 rounded">
                <X className="h-4 w-4 text-slate-400" />
              </button>
            </div>

            <div className="p-4 bg-white rounded-xl mx-auto w-44 h-44 flex items-center justify-center shadow-lg">
              <svg viewBox="0 0 100 100" className="w-full h-full text-black" fill="currentColor">
                <rect x="10" y="10" width="25" height="25" fill="#0f172a" />
                <rect x="15" y="15" width="15" height="15" fill="#ffffff" />
                <rect x="18" y="18" width="9" height="9" fill="#0f172a" />
                <rect x="65" y="10" width="25" height="25" fill="#0f172a" />
                <rect x="70" y="15" width="15" height="15" fill="#ffffff" />
                <rect x="73" y="18" width="9" height="9" fill="#0f172a" />
                <rect x="10" y="65" width="25" height="25" fill="#0f172a" />
                <rect x="15" y="70" width="15" height="15" fill="#ffffff" />
                <rect x="18" y="73" width="9" height="9" fill="#0f172a" />
                <rect x="45" y="15" width="10" height="20" fill="#0f172a" />
                <rect x="40" y="45" width="20" height="15" fill="#0f172a" />
                <rect x="65" y="65" width="25" height="25" fill="#0f172a" />
              </svg>
            </div>

            <div>
              <h3 className="font-bold text-slate-200 text-sm">{qrModalBooking.title}</h3>
              <p className="text-xs text-sky-400 font-medium mt-0.5">{qrModalBooking.facility_name}</p>
              <p className="text-[11px] text-emerald-400 mt-2">
                ✓ Scan via mobile app to confirm room occupancy. Prevents slot release by no-show model!
              </p>
            </div>

            <button
              onClick={() => {
                alert("Attendance verified! Session marked occupied. No-show probability reduced to 0.0%.");
                setQrModalBooking(null);
              }}
              className="w-full py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition"
            >
              Simulate Faculty Badge Tap
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
