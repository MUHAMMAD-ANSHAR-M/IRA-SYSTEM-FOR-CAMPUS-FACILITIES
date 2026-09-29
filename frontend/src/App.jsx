import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';
import AdminDashboard from './pages/AdminDashboard';
import FacultyDashboard from './pages/FacultyDashboard';
import CoordinatorDashboard from './pages/CoordinatorDashboard';
import FacilityManagerDashboard from './pages/FacilityManagerDashboard';
import ClubDashboard from './pages/ClubDashboard';
import StudentViewer from './pages/StudentViewer';
import ConcurrencyTester from './pages/ConcurrencyTester';

export default function App() {
  const [currentUser, setCurrentUser] = useState({
    id: 'usr-admin',
    name: 'Dr. Sarah Jenkins',
    email: 'admin@campus.edu',
    role: 'ADMIN',
    department: 'Campus Administration'
  });

  const [currentRole, setCurrentRole] = useState('ADMIN');
  const [activeTab, setActiveTab] = useState('admin');

  // Handle switching role via top dropdown
  const handleSwitchRoleView = (role) => {
    setCurrentRole(role);
    if (role === 'ADMIN') setActiveTab('admin');
    else if (role === 'FACULTY') setActiveTab('faculty');
    else if (role === 'COORDINATOR') setActiveTab('coordinator');
    else if (role === 'FACILITY_MANAGER') setActiveTab('facility_manager');
    else if (role === 'CLUB_ORGANIZER') setActiveTab('club');
    else if (role === 'STUDENT') setActiveTab('student');
  };

  const handleSwitchUser = (user) => {
    setCurrentUser(user);
    localStorage.setItem('ira_demo_user', JSON.stringify(user));
  };

  const handleSelectTab = (tabId) => {
    setActiveTab(tabId);
    if (tabId === 'admin') setCurrentRole('ADMIN');
    else if (tabId === 'faculty') setCurrentRole('FACULTY');
    else if (tabId === 'coordinator') setCurrentRole('COORDINATOR');
    else if (tabId === 'facility_manager') setCurrentRole('FACILITY_MANAGER');
    else if (tabId === 'club') setCurrentRole('CLUB_ORGANIZER');
    else if (tabId === 'student') setCurrentRole('STUDENT');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      <Navbar 
        currentUser={currentUser}
        onSwitchUser={handleSwitchUser}
        currentRole={currentRole}
        onSwitchRoleView={handleSwitchRoleView}
      />

      <div className="flex flex-1">
        <Sidebar 
          activeTab={activeTab}
          onSelectTab={handleSelectTab}
          currentRole={currentRole}
        />

        <main className="flex-1 p-6 max-w-7xl mx-auto w-full overflow-y-auto">
          {activeTab === 'admin' && (
            <AdminDashboard onNavigateToConcurrency={() => setActiveTab('concurrency')} />
          )}

          {activeTab === 'faculty' && (
            <FacultyDashboard currentUser={currentUser} />
          )}

          {activeTab === 'coordinator' && (
            <CoordinatorDashboard currentUser={currentUser} />
          )}

          {activeTab === 'facility_manager' && (
            <FacilityManagerDashboard />
          )}

          {activeTab === 'club' && (
            <ClubDashboard currentUser={currentUser} />
          )}

          {activeTab === 'student' && (
            <StudentViewer />
          )}

          {activeTab === 'concurrency' && (
            <ConcurrencyTester />
          )}
        </main>
      </div>
    </div>
  );
}
