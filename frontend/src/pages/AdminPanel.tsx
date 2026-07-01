import React, { useState, useEffect } from 'react';
import { useStore } from '../store';
import { 
  Users, 
  Terminal, 
  Sliders, 
  HardDrive, 
  Cpu, 
  Lock, 
  Save, 
  Database,
  Trash2,
  RefreshCw,
  Server
} from 'lucide-react';

export const AdminPanel: React.FC = () => {
  const { 
    systemLogs, 
    fetchLogs, 
    fetchSystemTelemetry,
    activeRoleView
  } = useStore();

  const [telemetry, setTelemetry] = useState<any>(null);
  const [usersList, setUsersList] = useState<any[]>([]);
  const [confidenceThreshold, setConfidenceThreshold] = useState(85);
  const [openaiKey, setOpenaiKey] = useState('sk-proj-••••••••••••••••••••');
  const [activeSubTab, setActiveSubTab] = useState<'users' | 'ai' | 'logs' | 'hardware'>('users');

  const refreshTelemetry = () => {
    fetchSystemTelemetry().then(data => {
      setTelemetry(data);
      if (data && data.metrics) {
        // Mock user list populated from stats
        setUsersList([
          { id: 1, name: 'Admin User', email: 'admin@dicc.com', role: 'Admin', status: 'Active' },
          { id: 2, name: 'Inspector User', email: 'inspector@dicc.com', role: 'Inspector', status: 'Active' },
          { id: 3, name: 'Engineer User', email: 'engineer@dicc.com', role: 'Engineer', status: 'Active' }
        ]);
      }
    });
    fetchLogs();
  };

  useEffect(() => {
    refreshTelemetry();
  }, []);

  const handleRoleChange = (id: number, newRole: string) => {
    setUsersList(prev => prev.map(u => u.id === id ? { ...u, role: newRole } : u));
  };

  const handleSaveAIConfig = (e: React.FormEvent) => {
    e.preventDefault();
    alert("AI configurations saved successfully.");
  };

  if (activeRoleView !== 'Admin') {
    return (
      <div className="h-[calc(100vh-4rem)] flex flex-col justify-center items-center text-brand-muted space-y-3 p-6">
        <Lock className="w-12 h-12 text-red-500 animate-bounce" />
        <h3 className="text-base font-bold text-brand-text">Access Denied</h3>
        <p className="text-xs text-brand-muted text-center max-w-sm">
          You are currently viewing in {activeRoleView} mode. Use the Role Switcher dropdown in the top header to select "Admin" to view this page.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-h-[calc(100vh-4rem)] overflow-y-auto p-6 select-none">
      
      {/* Title */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-brand-text to-slate-400">
            System Admin Panel
          </h2>
          <p className="text-xs text-brand-muted mt-0.5">Manage permissions, calibrate AI parameters, and inspect runtime health</p>
        </div>
        <button
          onClick={refreshTelemetry}
          className="p-2 rounded-lg border border-brand-border bg-slate-900/60 hover:bg-slate-900 hover:text-cyan-400 transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-brand-border/60 text-xs font-semibold">
        <button
          onClick={() => setActiveSubTab('users')}
          className={`px-5 py-3 border-b-2 transition-all flex items-center space-x-2 ${
            activeSubTab === 'users' ? 'border-cyan-400 text-cyan-400' : 'border-transparent text-brand-muted hover:text-brand-text'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>User Accounts</span>
        </button>

        <button
          onClick={() => setActiveSubTab('ai')}
          className={`px-5 py-3 border-b-2 transition-all flex items-center space-x-2 ${
            activeSubTab === 'ai' ? 'border-cyan-400 text-cyan-400' : 'border-transparent text-brand-muted hover:text-brand-text'
          }`}
        >
          <Sliders className="w-4 h-4" />
          <span>AI Settings</span>
        </button>

        <button
          onClick={() => setActiveSubTab('logs')}
          className={`px-5 py-3 border-b-2 transition-all flex items-center space-x-2 ${
            activeSubTab === 'logs' ? 'border-cyan-400 text-cyan-400' : 'border-transparent text-brand-muted hover:text-brand-text'
          }`}
        >
          <Terminal className="w-4 h-4" />
          <span>System Logs</span>
        </button>

        <button
          onClick={() => setActiveSubTab('hardware')}
          className={`px-5 py-3 border-b-2 transition-all flex items-center space-x-2 ${
            activeSubTab === 'hardware' ? 'border-cyan-400 text-cyan-400' : 'border-transparent text-brand-muted hover:text-brand-text'
          }`}
        >
          <Server className="w-4 h-4" />
          <span>Infrastructure</span>
        </button>
      </div>

      {/* Tab Panels */}
      <div className="min-h-[400px]">
        {activeSubTab === 'users' && (
          <div className="glass-card rounded-xl border border-brand-border/60 overflow-hidden">
            <div className="p-5 border-b border-brand-border bg-slate-900/10">
              <h4 className="text-xs font-bold text-brand-text uppercase tracking-wider">User Directory</h4>
            </div>
            
            <div className="overflow-x-auto text-xs">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-brand-border bg-slate-950/40 text-brand-muted uppercase text-[10px] tracking-wider">
                    <th className="p-4">Name</th>
                    <th className="p-4">Email</th>
                    <th className="p-4">Role / Scope</th>
                    <th className="p-4">Status</th>
                    <th className="p-4 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-brand-border/30">
                  {usersList.map((user) => (
                    <tr key={user.id} className="hover:bg-slate-900/15 transition-colors">
                      <td className="p-4 font-bold text-brand-text">{user.name}</td>
                      <td className="p-4 text-brand-muted">{user.email}</td>
                      <td className="p-4">
                        <select
                          value={user.role}
                          onChange={e => handleRoleChange(user.id, e.target.value)}
                          className="bg-slate-950 border border-brand-border rounded px-2 py-1 text-brand-text text-xs focus:outline-none focus:border-cyan-500"
                        >
                          <option value="Admin">Admin</option>
                          <option value="Inspector">Inspector</option>
                          <option value="Engineer">Engineer</option>
                        </select>
                      </td>
                      <td className="p-4">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] bg-emerald-500/15 text-emerald-400">
                          {user.status}
                        </span>
                      </td>
                      <td className="p-4 text-center">
                        <button 
                          className="p-1 rounded text-brand-muted hover:text-red-400 hover:bg-red-500/10"
                          title="Delete User"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeSubTab === 'ai' && (
          <div className="glass-card rounded-xl border border-brand-border/60 p-6 max-w-xl">
            <h4 className="text-xs font-bold text-brand-text uppercase tracking-wider mb-5">AI Inference Configuration</h4>
            
            <form onSubmit={handleSaveAIConfig} className="space-y-5 text-xs">
              <div className="space-y-1.5">
                <label className="text-brand-muted block">YOLOv8 Detection Confidence Threshold ({confidenceThreshold}%)</label>
                <div className="flex items-center space-x-4">
                  <input
                    type="range"
                    min="10"
                    max="95"
                    value={confidenceThreshold}
                    onChange={e => setConfidenceThreshold(parseInt(e.target.value))}
                    className="flex-1 accent-cyan-400 bg-slate-950 border border-brand-border/60 rounded h-2"
                  />
                  <span className="font-bold text-brand-text w-8 text-right">{confidenceThreshold}%</span>
                </div>
                <p className="text-[10px] text-brand-muted">Defects detected with lower confidence levels will be filtered from view.</p>
              </div>

              <div className="space-y-1">
                <label className="text-brand-muted block">OpenAI API Key (Required for live RAG pipeline)</label>
                <input
                  type="password"
                  value={openaiKey}
                  onChange={e => setOpenaiKey(e.target.value)}
                  className="w-full bg-slate-900 border border-brand-border rounded px-3 py-2 text-brand-text focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-brand-muted block">LLM Chat Model</label>
                  <select className="w-full bg-slate-900 border border-brand-border rounded px-3 py-2 text-brand-text focus:outline-none focus:border-cyan-500">
                    <option value="gpt-4o">gpt-4o (Default)</option>
                    <option value="gpt-4-turbo">gpt-4-turbo</option>
                    <option value="gpt-3.5-turbo">gpt-3.5-turbo</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-brand-muted block">Embedding Model</label>
                  <select className="w-full bg-slate-900 border border-brand-border rounded px-3 py-2 text-brand-text focus:outline-none focus:border-cyan-500">
                    <option value="text-embedding-3-small">text-embedding-3-small</option>
                    <option value="text-embedding-3-large">text-embedding-3-large</option>
                  </select>
                </div>
              </div>

              <div className="pt-3 border-t border-brand-border/40">
                <button
                  type="submit"
                  className="px-4 py-2 bg-cyan-500 hover:bg-cyan-600 rounded font-semibold text-slate-950 flex items-center space-x-1.5"
                >
                  <Save className="w-4 h-4" />
                  <span>Save Configuration</span>
                </button>
              </div>
            </form>
          </div>
        )}

        {activeSubTab === 'logs' && (
          <div className="glass-card rounded-xl border border-brand-border/60 overflow-hidden flex flex-col h-[450px]">
            <div className="p-4 border-b border-brand-border bg-slate-900/10 flex justify-between items-center">
              <h4 className="text-xs font-bold text-brand-text uppercase tracking-wider">Winston Live Logger Console</h4>
              <span className="text-[9px] text-brand-muted">Polling combined.log files</span>
            </div>
            
            {/* Terminal logs console */}
            <div className="flex-1 bg-slate-950 p-4 font-mono text-[10px] text-slate-300 overflow-y-auto space-y-1">
              {systemLogs.length === 0 ? (
                <div className="text-brand-muted text-center py-10">No system logs parsed. Click reload.</div>
              ) : (
                systemLogs.map((log, idx) => (
                  <div key={idx} className="leading-relaxed hover:bg-slate-900/40">
                    <span className="text-brand-muted">[{new Date(log.timestamp).toLocaleTimeString()}]</span>{' '}
                    <span className={log.level === 'error' ? 'text-red-400 font-bold' : log.level === 'warn' ? 'text-orange-400' : 'text-cyan-400'}>
                      {log.level?.toUpperCase() || 'INFO'}:
                    </span>{' '}
                    <span>{log.message}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {activeSubTab === 'hardware' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
            {/* Hardware charts */}
            <div className="glass-card p-5 rounded-xl border border-brand-border/60 space-y-4">
              <div className="flex justify-between items-center border-b border-brand-border/40 pb-2">
                <h4 className="font-bold text-brand-text uppercase tracking-wider flex items-center">
                  <Cpu className="w-4 h-4 text-cyan-400 mr-2" /> Server System Utilization
                </h4>
                <span className="text-[10px] text-emerald-400 font-semibold bg-emerald-500/10 px-2 py-0.5 rounded">Optimal</span>
              </div>

              <div className="space-y-4 pt-2">
                <div className="space-y-1.5">
                  <div className="flex justify-between text-[10px]">
                    <span className="text-brand-muted">V8 Process Heap Util</span>
                    <span className="text-brand-text font-bold">{telemetry?.health.memory.heapUsed} / {telemetry?.health.memory.heapTotal}</span>
                  </div>
                  <div className="w-full bg-slate-950 rounded-full h-2 overflow-hidden">
                    <div className="h-full bg-cyan-400" style={{ width: '45%' }} />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between text-[10px]">
                    <span className="text-brand-muted">Vinston CPU core load (Worker threads)</span>
                    <span className="text-brand-text font-bold">12%</span>
                  </div>
                  <div className="w-full bg-slate-950 rounded-full h-2 overflow-hidden">
                    <div className="h-full bg-purple-400" style={{ width: '12%' }} />
                  </div>
                </div>
              </div>
            </div>

            {/* Storage capacity */}
            <div className="glass-card p-5 rounded-xl border border-brand-border/60 space-y-4">
              <div className="flex justify-between items-center border-b border-brand-border/40 pb-2">
                <h4 className="font-bold text-brand-text uppercase tracking-wider flex items-center">
                  <HardDrive className="w-4 h-4 text-purple-400 mr-2" /> Databases & Storage Indexes
                </h4>
                <span className="text-[10px] text-emerald-400 font-semibold bg-emerald-500/10 px-2 py-0.5 rounded">Connected</span>
              </div>

              <div className="space-y-3 text-xs pt-1">
                <div className="flex justify-between items-center py-2 border-b border-brand-border/30">
                  <span className="text-brand-muted">AWS S3 Assets Space</span>
                  <span className="font-semibold text-brand-text">12.4 GB / 100 GB</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-brand-border/30">
                  <span className="text-brand-muted">PostgreSQL Tables Allocation</span>
                  <span className="font-semibold text-brand-text">32.8 MB</span>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="text-brand-muted">MongoDB Documents Allocation</span>
                  <span className="font-semibold text-brand-text">5.4 MB</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

    </div>
  );
};
