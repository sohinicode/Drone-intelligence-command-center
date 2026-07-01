import React, { useState, useEffect } from 'react';
import { useStore } from '../store';
import { 
  Search, 
  Bell, 
  Settings, 
  UserCheck, 
  Activity, 
  Database,
  CheckCircle,
  AlertTriangle
} from 'lucide-react';

export const Topbar: React.FC = () => {
  const { 
    user, 
    activeRoleView, 
    setRoleView, 
    notifications, 
    fetchNotifications, 
    markNotificationsRead,
    projects
  } = useStore();

  const [showNotifications, setShowNotifications] = useState(false);
  const [showRoleSelector, setShowRoleSelector] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 10000); // Poll notifications
    return () => clearInterval(interval);
  }, []);

  const safeNotifications = Array.isArray(notifications) ? notifications : [];
  const safeProjects = Array.isArray(projects) ? projects : [];

  // Handle global search across projects
  useEffect(() => {
    if (searchQuery.trim().length > 1) {
      const query = searchQuery.toLowerCase();
      const matched = safeProjects.filter(p => 
        p.name.toLowerCase().includes(query) ||
        p.company_name.toLowerCase().includes(query) ||
        p.location.toLowerCase().includes(query) ||
        p.inspection_type.toLowerCase().includes(query)
      );
      setSearchResults(matched.slice(0, 5));
    } else {
      setSearchResults([]);
    }
  }, [searchQuery, safeProjects]);

  const unreadCount = safeNotifications.filter(n => !n.is_read).length;

  const handleRoleChange = (role: 'Admin' | 'Inspector' | 'Engineer') => {
    setRoleView(role);
    setShowRoleSelector(false);
  };

  return (
    <header className="h-16 glass-panel border-b border-brand-border flex items-center justify-between px-6 z-10 relative">
      {/* Global Search Bar */}
      <div className="w-96 relative">
        <div className="relative">
          <Search className="w-4 h-4 text-brand-muted absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Global search projects, locations, defects..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-900/60 border border-brand-border/80 rounded-lg pl-10 pr-4 py-2 text-xs text-brand-text placeholder-brand-muted focus:outline-none focus:border-cyan-500/80 focus:ring-1 focus:ring-cyan-500/20 transition-all"
          />
        </div>

        {/* Search Results Dropdown */}
        {searchResults.length > 0 && (
          <div className="absolute top-12 left-0 w-full glass-panel-heavy rounded-lg p-2 shadow-2xl border border-brand-border animate-fade-in z-20">
            <h4 className="text-[10px] text-brand-muted uppercase font-bold px-2 py-1 tracking-wider border-b border-brand-border/40">Projects Matched</h4>
            <div className="mt-1 space-y-1">
              {searchResults.map((proj) => (
                <div 
                  key={proj.id}
                  className="px-2 py-1.5 rounded hover:bg-slate-800/60 cursor-pointer transition-colors"
                >
                  <p className="text-xs font-semibold text-brand-text truncate">{proj.name}</p>
                  <p className="text-[10px] text-cyan-400 truncate">{proj.location} • {proj.priority}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Control Widgets */}
      <div className="flex items-center space-x-6">
        
        {/* System Health Indicators */}
        <div className="hidden lg:flex items-center space-x-4 border-r border-brand-border/60 pr-6 text-[10px]">
          <div className="flex items-center space-x-1.5" title="Relational DB Status">
            <Database className="w-3.5 h-3.5 text-cyan-400" />
            <span className="text-brand-muted">Postgres:</span>
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-sm shadow-emerald-500"></span>
          </div>
          <div className="flex items-center space-x-1.5" title="NoSQL DB Status">
            <Activity className="w-3.5 h-3.5 text-purple-400" />
            <span className="text-brand-muted">MongoDB:</span>
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-sm shadow-emerald-500"></span>
          </div>
        </div>

        {/* Role switch visual control (RBAC Demo Utility) */}
        <div className="relative">
          <button
            onClick={() => setShowRoleSelector(!showRoleSelector)}
            className="flex items-center space-x-2 px-3 py-1.5 rounded-lg border border-brand-border/60 bg-slate-800/30 text-xs font-semibold text-brand-text hover:bg-slate-800/60 transition-colors"
          >
            <UserCheck className="w-3.5 h-3.5 text-cyan-400" />
            <span>Role: <strong className="text-cyan-400 font-bold">{activeRoleView}</strong></span>
          </button>

          {showRoleSelector && (
            <div className="absolute right-0 top-10 w-44 glass-panel-heavy border border-brand-border rounded-lg p-1.5 shadow-2xl z-20">
              <p className="text-[9px] uppercase font-bold text-brand-muted px-2 py-1 border-b border-brand-border/40 tracking-wider">Demo Role Switcher</p>
              <div className="mt-1.5 space-y-1">
                {(['Admin', 'Inspector', 'Engineer'] as const).map((role) => (
                  <button
                    key={role}
                    onClick={() => handleRoleChange(role)}
                    className={`w-full text-left px-2.5 py-1.5 rounded text-xs font-semibold transition-colors ${
                      activeRoleView === role 
                        ? 'bg-cyan-500/10 text-cyan-400' 
                        : 'text-brand-muted hover:bg-slate-800 hover:text-brand-text'
                    }`}
                  >
                    {role} {user?.role === role && ' (Self)'}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Notification Bell Dropdown */}
        <div className="relative">
          <button
            onClick={() => {
              setShowNotifications(!showNotifications);
              if (unreadCount > 0) markNotificationsRead();
            }}
            className="relative p-2 rounded-full bg-slate-900/40 border border-brand-border/80 text-brand-muted hover:text-brand-text hover:border-brand-border transition-all"
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-gradient-to-r from-red-500 to-orange-500 rounded-full flex items-center justify-center text-[9px] font-bold text-white shadow-md shadow-red-500/30">
                {unreadCount}
              </span>
            )}
          </button>

          {showNotifications && (
            <div className="absolute right-0 top-12 w-80 glass-panel-heavy border border-brand-border rounded-lg shadow-2xl z-20 overflow-hidden">
              <div className="px-4 py-3 border-b border-brand-border/40 flex justify-between items-center bg-slate-900/60">
                <span className="text-xs font-bold text-brand-text">Security & Inspection Alerts</span>
                <span className="text-[10px] text-brand-muted">Recent</span>
              </div>
              <div className="max-h-64 overflow-y-auto divide-y divide-brand-border/40">
                {safeNotifications.length === 0 ? (
                  <div className="p-4 text-center text-xs text-brand-muted">No system alerts active.</div>
                ) : (
                  safeNotifications.map((n) => (
                    <div key={n.id} className="p-3 hover:bg-slate-800/40 transition-colors">
                      <div className="flex items-center space-x-1.5">
                        {n.type === 'critical_defect' ? (
                          <AlertTriangle className="w-3.5 h-3.5 text-red-500 flex-shrink-0" />
                        ) : (
                          <CheckCircle className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                        )}
                        <span className="text-xs font-semibold text-brand-text truncate">{n.title}</span>
                      </div>
                      <p className="text-[10px] text-brand-muted mt-1 leading-normal">{n.message}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

      </div>
    </header>
  );
};
