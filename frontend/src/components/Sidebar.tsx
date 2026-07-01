import React from 'react';
import { useStore } from '../store';
import { 
  LayoutDashboard, 
  FolderGit2, 
  Map, 
  UploadCloud, 
  MessageSquareCode, 
  ShieldAlert, 
  Gamepad2, 
  CalendarDays,
  LogOut,
  PlaneTakeoff
} from 'lucide-react';

export const Sidebar: React.FC = () => {
  const { activeTab, setActiveTab, activeRoleView, logout, user } = useStore();

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['Admin', 'Inspector', 'Engineer'] },
    { id: 'projects', label: 'Projects', icon: FolderGit2, roles: ['Admin', 'Inspector', 'Engineer'] },
    { id: 'map', label: 'Geospatial Map', icon: Map, roles: ['Admin', 'Inspector', 'Engineer'] },
    { id: 'upload', label: 'File Upload', icon: UploadCloud, roles: ['Admin', 'Inspector'] },
    { id: 'chat', label: 'AI RAG Chat', icon: MessageSquareCode, roles: ['Admin', 'Inspector', 'Engineer'] },
    { id: 'simulator', label: 'Flight Simulator', icon: PlaneTakeoff, roles: ['Admin', 'Inspector'] },
    { id: 'scheduler', label: 'Scheduler', icon: CalendarDays, roles: ['Admin', 'Inspector', 'Engineer'] },
    { id: 'admin', label: 'Admin Panel', icon: ShieldAlert, roles: ['Admin'] }
  ];

  // Filter menu items by active role view (RBAC in frontend)
  const visibleItems = menuItems.filter(item => item.roles.includes(activeRoleView));

  return (
    <aside className="w-64 glass-panel h-screen flex flex-col justify-between border-r border-brand-border select-none z-10">
      <div className="flex flex-col">
        {/* Logo */}
        <div className="p-6 flex items-center space-x-3 border-b border-brand-border">
          <div className="p-2 bg-gradient-to-tr from-cyan-500 to-purple-600 rounded-lg shadow-lg shadow-cyan-500/20">
            <Gamepad2 className="w-6 h-6 text-white animate-pulse" />
          </div>
          <div>
            <h1 className="text-lg font-bold bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-purple-400 tracking-wider">
              DICC
            </h1>
            <p className="text-[10px] text-brand-muted font-medium uppercase tracking-widest">Command Center</p>
          </div>
        </div>

        {/* Menu Navigation */}
        <nav className="p-4 space-y-1">
          {visibleItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id as any)}
                className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-sm font-semibold transition-all duration-200 ${
                  isActive 
                    ? 'bg-gradient-to-r from-cyan-500/20 to-purple-600/10 text-cyan-400 border-l-2 border-cyan-400 shadow-md shadow-cyan-500/5'
                    : 'text-brand-muted hover:bg-slate-800/40 hover:text-brand-text'
                }`}
              >
                <Icon className={`w-5 h-5 ${isActive ? 'text-cyan-400' : 'text-brand-muted group-hover:text-brand-text'}`} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* User Footer Profile card */}
      <div className="p-4 border-t border-brand-border">
        <div className="flex items-center space-x-3 p-3 rounded-lg bg-slate-900/40 border border-brand-border/60">
          <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-cyan-500 to-purple-600 flex items-center justify-center font-bold text-brand-text border border-brand-border shadow-md">
            {user?.name.charAt(0) || 'U'}
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="text-xs font-semibold text-brand-text truncate">{user?.name}</h4>
            <p className="text-[10px] text-brand-muted truncate capitalize">{activeRoleView} view</p>
          </div>
          <button 
            onClick={logout}
            className="p-1.5 rounded-lg text-brand-muted hover:bg-red-500/10 hover:text-red-400 transition-colors"
            title="Log Out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
};
