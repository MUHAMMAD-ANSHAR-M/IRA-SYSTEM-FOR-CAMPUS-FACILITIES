import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  Cpu, 
  Wifi, 
  Bell, 
  Users, 
  ChevronDown, 
  CheckCircle2, 
  AlertTriangle,
  Zap
} from 'lucide-react';
import { getSocket, getDemoUsers } from '../services/api';

export default function Navbar({ currentUser, onSwitchUser, currentRole, onSwitchRoleView }) {
  const [demoAccounts, setDemoAccounts] = useState([]);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [wsConnected, setWsConnected] = useState(false);
  const [notifications, setNotifications] = useState([
    { id: 1, title: 'AI Demand Forecast Ready', time: '2m ago', type: 'info' },
    { id: 2, title: 'Zero Double-Booking Guard Active', time: 'Active', type: 'success' }
  ]);
  const [notifOpen, setNotifOpen] = useState(false);

  useEffect(() => {
    getDemoUsers().then(data => {
      if (data && data.demoAccounts) {
        setDemoAccounts(data.demoAccounts);
      }
    }).catch(() => {});

    const socket = getSocket();
    socket.on('connect', () => setWsConnected(true));
    socket.on('disconnect', () => setWsConnected(false));
    setWsConnected(socket.connected);

    socket.on('booking:created', (data) => {
      setNotifications(prev => [
        { id: Date.now(), title: `New Booking: ${data.booking?.title || 'Session'}`, time: 'Just now', type: 'info' },
        ...prev.slice(0, 7)
      ]);
    });

    socket.on('facility:statusChanged', (data) => {
      setNotifications(prev => [
        { id: Date.now(), title: `Facility Status: ${data.facilityName} is ${data.newStatus}`, time: 'Just now', type: 'warning' },
        ...prev.slice(0, 7)
      ]);
    });

    return () => {
      socket.off('connect');
      socket.off('disconnect');
      socket.off('booking:created');
      socket.off('facility:statusChanged');
    };
  }, []);

  const roles = [
    { role: 'ADMIN', label: 'Administrator (Super Admin)', color: 'bg-rose-500/20 text-rose-300 border-rose-500/30' },
    { role: 'FACULTY', label: 'Faculty Member', color: 'bg-sky-500/20 text-sky-300 border-sky-500/30' },
    { role: 'COORDINATOR', label: 'Department HOD / Coordinator', color: 'bg-amber-500/20 text-amber-300 border-amber-500/30' },
    { role: 'FACILITY_MANAGER', label: 'Facility / Maintenance Manager', color: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' },
    { role: 'CLUB_ORGANIZER', label: 'Student Club Representative', color: 'bg-purple-500/20 text-purple-300 border-purple-500/30' },
    { role: 'STUDENT', label: 'Student (Viewer)', color: 'bg-slate-500/20 text-slate-300 border-slate-500/30' }
  ];

  const currentRoleObj = roles.find(r => r.role === currentRole) || roles[0];

  return (
    <header className="sticky top-0 z-50 glass-panel border-b border-slate-800/80 px-6 py-3.5">
      <div className="flex items-center justify-between">
        
        {/* Logo & System Brand */}
        <div className="flex items-center space-x-3.5">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-cyan-600 via-sky-500 to-indigo-500 flex items-center justify-center shadow-lg shadow-sky-500/20">
            <Building2 className="h-5 w-5 text-white" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-xl font-bold tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent">
                IRA
              </span>
              <span className="text-xs px-2 py-0.5 rounded-full font-semibold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                v2.6 Intelligent
              </span>
            </div>
            <p className="text-xs text-slate-400 font-medium">Smart Campus Resource Optimizer</p>
          </div>
        </div>

        {/* Center Live Badges */}
        <div className="hidden lg:flex items-center space-x-3">
          <div className="flex items-center space-x-2 px-3 py-1.5 rounded-lg bg-slate-900/80 border border-slate-800 text-xs">
            <span className={`h-2 w-2 rounded-full ${wsConnected ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'}`}></span>
            <span className="text-slate-300 font-medium">
              {wsConnected ? 'Real-Time Sync Online' : 'Connecting WebSocket...'}
            </span>
          </div>

          <div className="flex items-center space-x-2 px-3 py-1.5 rounded-lg bg-indigo-950/40 border border-indigo-500/30 text-xs text-indigo-300">
            <Cpu className="h-3.5 w-3.5 text-indigo-400" />
            <span className="font-medium">AI Microservice: Active</span>
          </div>

          <div className="flex items-center space-x-2 px-3 py-1.5 rounded-lg bg-emerald-950/40 border border-emerald-500/30 text-xs text-emerald-300">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
            <span className="font-medium">Zero Double-Booking Guard: Enforced</span>
          </div>
        </div>

        {/* Right: Role Switcher & User Profile */}
        <div className="flex items-center space-x-4">
          
          {/* Notifications Bell */}
          <div className="relative">
            <button 
              onClick={() => setNotifOpen(!notifOpen)}
              className="p-2 rounded-lg bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60 text-slate-300 transition relative"
            >
              <Bell className="h-4 w-4" />
              {notifications.length > 0 && (
                <span className="absolute -top-1 -right-1 h-4 w-4 bg-sky-500 text-white rounded-full text-[10px] flex items-center justify-center font-bold">
                  {notifications.length}
                </span>
              )}
            </button>

            {notifOpen && (
              <div className="absolute right-0 mt-2 w-80 rounded-xl glass-panel shadow-2xl p-3 border border-slate-700/80 z-50">
                <div className="flex items-center justify-between pb-2 border-b border-slate-800 text-xs font-semibold text-slate-300">
                  <span>Live Campus Stream</span>
                  <span className="text-[10px] text-sky-400">{notifications.length} events</span>
                </div>
                <div className="divide-y divide-slate-800/60 max-h-64 overflow-y-auto mt-2">
                  {notifications.map(n => (
                    <div key={n.id} className="py-2 text-xs">
                      <div className="text-slate-200 font-medium">{n.title}</div>
                      <div className="text-[10px] text-slate-400 mt-0.5">{n.time}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* 1-Click Role Switcher Dropdown */}
          <div className="relative">
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className={`flex items-center space-x-2 px-3 py-1.5 rounded-xl border text-xs font-medium transition ${currentRoleObj.color}`}
            >
              <Users className="h-3.5 w-3.5" />
              <span>Role: <strong className="font-bold">{currentRole}</strong></span>
              <ChevronDown className="h-3.5 w-3.5 opacity-80" />
            </button>

            {dropdownOpen && (
              <div className="absolute right-0 mt-2 w-72 rounded-2xl glass-panel shadow-2xl p-2 border border-slate-700/80 z-50">
                <div className="px-3 py-2 text-[11px] font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-800">
                  Switch Active Role (Demo Mode)
                </div>
                <div className="py-1 space-y-1">
                  {roles.map(r => (
                    <button
                      key={r.role}
                      onClick={() => {
                        onSwitchRoleView(r.role);
                        // Also match corresponding demo user
                        const matchUser = demoAccounts.find(u => u.role === r.role);
                        if (matchUser) onSwitchUser(matchUser);
                        setDropdownOpen(false);
                      }}
                      className={`w-full text-left px-3 py-2 rounded-lg text-xs flex items-center justify-between transition ${
                        currentRole === r.role 
                          ? 'bg-sky-500/20 text-sky-200 font-semibold' 
                          : 'text-slate-300 hover:bg-slate-800/60'
                      }`}
                    >
                      <span>{r.label}</span>
                      {currentRole === r.role && <CheckCircle2 className="h-3.5 w-3.5 text-sky-400" />}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* User Avatar */}
          <div className="flex items-center space-x-2 pl-2 border-l border-slate-800">
            <div className="h-8 w-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-xs font-bold text-sky-400">
              {currentUser?.name ? currentUser.name.charAt(0) : 'U'}
            </div>
            <div className="hidden md:block text-left text-xs">
              <div className="font-semibold text-slate-200 truncate max-w-[120px]">
                {currentUser?.name || 'Campus User'}
              </div>
              <div className="text-[10px] text-slate-400">
                {currentUser?.department || currentRole}
              </div>
            </div>
          </div>

        </div>

      </div>
    </header>
  );
}
