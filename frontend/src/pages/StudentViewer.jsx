import React, { useState, useEffect } from 'react';
import { 
  Calendar, 
  MapPin, 
  Clock, 
  Search, 
  Building2, 
  Bell, 
  Users, 
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { getBookings, getFacilities, getSocket } from '../services/api';

export default function StudentViewer() {
  const [events, setEvents] = useState([]);
  const [facilities, setFacilities] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState('ALL');

  const loadData = () => {
    getBookings('status=CONFIRMED').then(data => {
      setEvents(data.bookings || []);
    });
    getFacilities().then(data => {
      setFacilities(data.facilities || []);
    });
  };

  useEffect(() => {
    loadData();
    const socket = getSocket();
    socket.on('booking:created', loadData);
    socket.on('booking:statusChanged', loadData);
    socket.on('facility:statusChanged', loadData);
    return () => {
      socket.off('booking:created');
      socket.off('booking:statusChanged');
      socket.off('facility:statusChanged');
    };
  }, []);

  const filteredFacilities = facilities.filter(f => {
    const matchSearch = f.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                        f.building.toLowerCase().includes(searchQuery.toLowerCase());
    const matchType = selectedType === 'ALL' || f.type === selectedType;
    return matchSearch && matchType;
  });

  return (
    <div className="space-y-6">
      
      {/* Banner */}
      <div className="p-6 rounded-2xl glass-panel border border-slate-800 flex items-center justify-between">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-2xl font-extrabold text-white">Campus Live Portal & Schedule</h1>
            <span className="text-xs px-2.5 py-1 rounded-full bg-slate-500/10 text-slate-300 font-semibold border border-slate-500/20">
              Student Viewer
            </span>
          </div>
          <p className="text-sm text-slate-400 mt-1">
            Real-time campus venues, ongoing academic sessions, public workshops, and live relocation notices.
          </p>
        </div>
      </div>

      {/* Featured Section: Today's Events (Exact spec from user prompt!) */}
      <div className="p-6 rounded-2xl glass-panel border border-sky-500/30 bg-gradient-to-r from-sky-950/20 via-slate-900 to-slate-900 space-y-4">
        <div className="flex items-center space-x-2 border-b border-slate-800 pb-3">
          <Calendar className="h-5 w-5 text-sky-400" />
          <h2 className="text-lg font-bold text-white tracking-wide">Today's Events</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          
          <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 hover:border-sky-500/40 transition">
            <div className="flex items-center justify-between text-xs text-sky-400 font-semibold mb-1">
              <span className="flex items-center space-x-1">
                <Clock className="h-3.5 w-3.5" />
                <span>10:00 AM - 12:00 PM</span>
              </span>
              <span className="px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-300 text-[10px]">Academic</span>
            </div>
            <h3 className="font-bold text-white text-base">AI & Data Science Workshop</h3>
            <div className="flex items-center space-x-1.5 text-xs text-slate-300 mt-2">
              <MapPin className="h-3.5 w-3.5 text-rose-400" />
              <span>Venue: <strong>Seminar Hall-A (Central Academic)</strong></span>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 hover:border-purple-500/40 transition">
            <div className="flex items-center justify-between text-xs text-purple-400 font-semibold mb-1">
              <span className="flex items-center space-x-1">
                <Clock className="h-3.5 w-3.5" />
                <span>2:00 PM - 5:00 PM</span>
              </span>
              <span className="px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 text-[10px]">Club Event</span>
            </div>
            <h3 className="font-bold text-white text-base">Hackathon 2026 Orientation</h3>
            <div className="flex items-center space-x-1.5 text-xs text-slate-300 mt-2">
              <MapPin className="h-3.5 w-3.5 text-rose-400" />
              <span>Venue: <strong>Main Grand Auditorium</strong></span>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 hover:border-emerald-500/40 transition">
            <div className="flex items-center justify-between text-xs text-emerald-400 font-semibold mb-1">
              <span className="flex items-center space-x-1">
                <Clock className="h-3.5 w-3.5" />
                <span>4:00 PM - 6:00 PM</span>
              </span>
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px]">Sports League</span>
            </div>
            <h3 className="font-bold text-white text-base">Inter-Dept Football Practice</h3>
            <div className="flex items-center space-x-1.5 text-xs text-slate-300 mt-2">
              <MapPin className="h-3.5 w-3.5 text-rose-400" />
              <span>Venue: <strong>Main Athletics Football Ground</strong></span>
            </div>
          </div>

        </div>
      </div>

      {/* Searchable Campus Facilities & Live Availability */}
      <div className="p-6 rounded-2xl glass-panel border border-slate-800 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-bold text-white">Campus Facility Availability Explorer</h2>
            <p className="text-xs text-slate-400">Search rooms, study spaces, computer labs, and arenas</p>
          </div>

          <div className="flex items-center space-x-3">
            <div className="relative">
              <Search className="h-4 w-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search room or building..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-9 pr-4 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-slate-200 focus:outline-none focus:border-sky-500"
              />
            </div>

            <select
              value={selectedType}
              onChange={e => setSelectedType(e.target.value)}
              className="px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-slate-200 focus:outline-none focus:border-sky-500"
            >
              <option value="ALL">All Categories</option>
              <option value="classroom">Classrooms</option>
              <option value="computer_lab">Computer Labs</option>
              <option value="seminar_hall">Seminar Halls</option>
              <option value="auditorium">Auditoriums</option>
              <option value="sports_facility">Sports Arenas</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
          {filteredFacilities.map(f => {
            const isMaint = f.status === 'MAINTENANCE';
            return (
              <div 
                key={f.id}
                className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 hover:border-slate-700 transition"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-bold text-slate-200 text-sm">{f.name}</h3>
                    <p className="text-xs text-slate-400">{f.building} · Floor {f.floor}</p>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase border ${
                    isMaint 
                      ? 'bg-rose-500/20 text-rose-300 border-rose-500/30' 
                      : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                  }`}>
                    {f.status}
                  </span>
                </div>

                <div className="mt-3 flex items-center justify-between text-xs text-slate-400 border-t border-slate-800/80 pt-2.5">
                  <span>Capacity: <strong className="text-slate-200">{f.capacity}</strong></span>
                  <span className="capitalize">{f.type.replace('_', ' ')}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
}
