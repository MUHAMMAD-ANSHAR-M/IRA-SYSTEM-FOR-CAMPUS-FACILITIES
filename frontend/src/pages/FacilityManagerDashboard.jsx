import React, { useState, useEffect } from 'react';
import { 
  Wrench, 
  AlertTriangle, 
  CheckCircle2, 
  RefreshCw, 
  Building2, 
  Clock, 
  ShieldCheck, 
  ArrowRight,
  Zap,
  Activity
} from 'lucide-react';
import { getFacilities, updateFacilityStatus, getSocket } from '../services/api';

export default function FacilityManagerDashboard() {
  const [facilities, setFacilities] = useState([]);
  const [selectedFacilityId, setSelectedFacilityId] = useState('fac-lab-2');
  const [reason, setReason] = useState('Lab 2 4K Laser Projector and Central AC Failure');
  const [loading, setLoading] = useState(false);
  const [cascadeLog, setCascadeLog] = useState(null);

  const loadData = () => {
    getFacilities().then(data => {
      setFacilities(data.facilities || []);
    });
  };

  useEffect(() => {
    loadData();

    const socket = getSocket();
    socket.on('facility:statusChanged', loadData);
    socket.on('maintenance:cascade', (data) => {
      setCascadeLog(data);
    });

    return () => {
      socket.off('facility:statusChanged');
      socket.off('maintenance:cascade');
    };
  }, []);

  const handleSetMaintenance = async () => {
    setLoading(true);
    try {
      const res = await updateFacilityStatus(selectedFacilityId, {
        status: 'MAINTENANCE',
        reason
      });
      setCascadeLog(res.cascadeResult);
      loadData();
    } catch (err) {
      alert(err.message || 'Failed to update facility status');
    } finally {
      setLoading(false);
    }
  };

  const handleRestoreActive = async (facId) => {
    try {
      await updateFacilityStatus(facId, { status: 'ACTIVE' });
      loadData();
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Header Banner */}
      <div className="p-6 rounded-2xl glass-panel border border-slate-800 flex items-center justify-between">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-2xl font-extrabold text-white">Facility & Infrastructure Operations</h1>
            <span className="text-xs px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 font-semibold border border-emerald-500/20">
              Maintenance Desk
            </span>
          </div>
          <p className="text-sm text-slate-400 mt-1">
            Toggle maintenance status, trigger automated cascade re-allocations, and monitor physical campus assets.
          </p>
        </div>
      </div>

      {/* Workflow C Showcase Trigger Panel */}
      <div className="p-6 rounded-2xl glass-panel border border-amber-500/30 bg-gradient-to-r from-amber-950/20 via-slate-900 to-slate-900 space-y-4">
        <div className="flex items-center space-x-2.5">
          <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400">
            <Wrench className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white">
              Live Maintenance Outage & Cascade Re-Allocation Engine (Workflow C)
            </h2>
            <p className="text-xs text-slate-400">
              Simulates a hardware failure (e.g. Lab 2 Projector fails) and triggers live reallocation of all affected classes.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">Target Facility</label>
            <select
              value={selectedFacilityId}
              onChange={e => setSelectedFacilityId(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
            >
              {facilities.map(f => (
                <option key={f.id} value={f.id}>
                  {f.name} ({f.building}) - Status: {f.status}
                </option>
              ))}
            </select>
          </div>

          <div className="md:col-span-2">
            <label className="block text-xs font-medium text-slate-400 mb-1">Incident / Maintenance Reason</label>
            <div className="flex space-x-2">
              <input
                type="text"
                value={reason}
                onChange={e => setReason(e.target.value)}
                className="flex-1 px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
              />
              <button
                onClick={handleSetMaintenance}
                disabled={loading}
                className="px-5 py-2 rounded-xl bg-gradient-to-r from-amber-600 to-rose-600 hover:from-amber-500 hover:to-rose-500 text-white font-bold text-xs shadow-lg shadow-amber-500/20 transition flex items-center space-x-2 flex-shrink-0"
              >
                <Zap className="h-4 w-4" />
                <span>{loading ? 'Re-Allocating...' : 'Trigger Maintenance & Cascade'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Live Cascade Re-allocation Output Stream */}
        {cascadeLog && (
          <div className="mt-4 p-4 rounded-xl bg-slate-900/90 border border-emerald-500/40 space-y-3 animate-fade-in text-xs">
            <div className="flex items-center justify-between font-bold text-emerald-400 border-b border-slate-800 pb-2">
              <span className="flex items-center space-x-2">
                <CheckCircle2 className="h-4 w-4" />
                <span>Cascade Engine Execution Complete: {cascadeLog.facility} marked MAINTENANCE</span>
              </span>
              <span className="text-[11px] text-slate-300">
                Auto-Relocated: {cascadeLog.autoReallocatedCount || cascadeLog.reallocatedBookings?.length || 0} Sessions
              </span>
            </div>

            <div className="space-y-2">
              {(cascadeLog.reallocations || cascadeLog.reallocatedBookings || []).map((item, idx) => (
                <div key={idx} className="p-2.5 rounded-lg bg-emerald-950/20 border border-emerald-500/20 flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-slate-200">{item.title}</div>
                    <div className="text-[11px] text-slate-400 mt-0.5">
                      Relocated: <span className="line-through text-rose-400">{item.previousFacility}</span> <ArrowRight className="inline h-3 w-3 text-emerald-400" /> <span className="text-emerald-300 font-bold">{item.newFacility}</span>
                    </div>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold">
                    Zero Clash Guaranteed
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>

      {/* Facilities Status & Control Grid */}
      <div className="p-6 rounded-2xl glass-panel border border-slate-800 space-y-4">
        <h2 className="text-base font-bold text-white">Campus Facility Status Grid</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {facilities.map(fac => {
            const isMaint = fac.status === 'MAINTENANCE';
            return (
              <div 
                key={fac.id}
                className={`p-4 rounded-xl border transition ${
                  isMaint 
                    ? 'bg-rose-950/20 border-rose-500/40 shadow-lg shadow-rose-900/10' 
                    : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-bold text-slate-200 text-sm">{fac.name}</h3>
                    <p className="text-xs text-slate-400">{fac.building} · Floor {fac.floor}</p>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase border ${
                    isMaint 
                      ? 'bg-rose-500/20 text-rose-300 border-rose-500/30' 
                      : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                  }`}>
                    {fac.status}
                  </span>
                </div>

                <div className="mt-3 flex items-center justify-between text-xs text-slate-400 border-t border-slate-800/80 pt-2.5">
                  <span>Capacity: <strong className="text-slate-200">{fac.capacity}</strong></span>
                  <span>Type: <strong className="text-slate-200">{fac.type}</strong></span>
                </div>

                <div className="mt-3">
                  {isMaint ? (
                    <button
                      onClick={() => handleRestoreActive(fac.id)}
                      className="w-full py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition"
                    >
                      Restore to ACTIVE
                    </button>
                  ) : (
                    <button
                      onClick={() => {
                        setSelectedFacilityId(fac.id);
                        handleSetMaintenance();
                      }}
                      className="w-full py-1.5 rounded-lg bg-slate-800 hover:bg-rose-900/60 text-slate-300 hover:text-rose-200 text-xs font-semibold border border-slate-700 transition"
                    >
                      Mark Under Maintenance
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
}
