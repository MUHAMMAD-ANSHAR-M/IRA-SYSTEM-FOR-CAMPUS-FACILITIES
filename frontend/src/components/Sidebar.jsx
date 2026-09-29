import React from 'react';
import { 
  LayoutDashboard, 
  Calendar, 
  Wrench, 
  GraduationCap, 
  Users, 
  Eye, 
  Zap, 
  Layers, 
  BarChart3,
  Building,
  CheckCircle2
} from 'lucide-react';

export default function Sidebar({ activeTab, onSelectTab, currentRole }) {
  const navItems = [
    { id: 'admin', label: 'Admin Command Center', icon: LayoutDashboard, role: 'ADMIN', badge: 'KPIs & ML' },
    { id: 'faculty', label: 'Faculty Smart Allocation', icon: Calendar, role: 'FACULTY', badge: 'Auto-Assign' },
    { id: 'coordinator', label: 'Department Timetable', icon: GraduationCap, role: 'COORDINATOR', badge: 'Approvals' },
    { id: 'facility_manager', label: 'Maintenance & Cascades', icon: Wrench, role: 'FACILITY_MANAGER', badge: 'Outage Sim' },
    { id: 'club', label: 'Club Event Requests', icon: Users, role: 'CLUB_ORGANIZER', badge: 'Workshops' },
    { id: 'student', label: "Student Schedule & Finder", icon: Eye, role: 'STUDENT', badge: "Today's Events" },
    { id: 'concurrency', label: '50-Request Concurrency Test', icon: Zap, role: 'ALL', highlight: true, badge: 'Proof' },
  ];

  return (
    <aside className="w-64 glass-panel border-r border-slate-800/80 p-4 flex flex-col justify-between hidden md:flex shrink-0 min-h-[calc(100vh-61px)]">
      <div className="space-y-6">
        
        {/* Role contextual label */}
        <div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 px-3">
            Navigation Views
          </span>
          
          <nav className="mt-2 space-y-1.5">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              const isRelevantToRole = item.role === 'ALL' || item.role === currentRole;

              return (
                <button
                  key={item.id}
                  onClick={() => onSelectTab(item.id)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition group ${
                    isActive
                      ? 'bg-gradient-to-r from-sky-600 to-indigo-600 text-white shadow-lg shadow-sky-500/20'
                      : isRelevantToRole
                        ? 'text-slate-200 hover:bg-slate-800/70 hover:text-white'
                        : 'text-slate-400 hover:bg-slate-800/40 hover:text-slate-200'
                  }`}
                >
                  <div className="flex items-center space-x-2.5">
                    <Icon className={`h-4 w-4 ${isActive ? 'text-white' : item.highlight ? 'text-amber-400' : 'text-slate-400 group-hover:text-sky-400'}`} />
                    <span>{item.label}</span>
                  </div>

                  {item.badge && (
                    <span className={`text-[10px] px-2 py-0.5 rounded-md font-bold uppercase ${
                      isActive 
                        ? 'bg-black/30 text-white' 
                        : item.highlight
                          ? 'bg-amber-500/20 text-amber-300'
                          : 'bg-slate-800 text-slate-400'
                    }`}>
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Pitch Statement Card */}
        <div className="p-3.5 rounded-xl bg-gradient-to-br from-indigo-950/40 via-slate-900 to-slate-900 border border-indigo-500/20 text-[11px] space-y-1.5">
          <div className="font-bold text-indigo-300 flex items-center space-x-1.5">
            <CheckCircle2 className="h-3.5 w-3.5 text-indigo-400" />
            <span>Guaranteed Zero Conflicts</span>
          </div>
          <p className="text-slate-400 text-[10px] leading-relaxed">
            Deterministic rule engine guarantees legality and prevents double bookings; XGBoost & K-Means optimize utilization.
          </p>
        </div>

      </div>

      {/* Footer Info */}
      <div className="pt-4 border-t border-slate-800/80 text-[10px] text-slate-500 space-y-1">
        <div className="flex justify-between">
          <span>Backend: Node.js + Express</span>
          <span className="text-emerald-400 font-bold">ONLINE</span>
        </div>
        <div className="flex justify-between">
          <span>AI Microservice: FastAPI</span>
          <span className="text-emerald-400 font-bold">ONLINE</span>
        </div>
        <div className="flex justify-between">
          <span>DB: ACID Multi-Layer Lock</span>
          <span className="text-sky-400 font-bold">ENFORCED</span>
        </div>
      </div>
    </aside>
  );
}
