import React, { useState, useEffect } from 'react';
import { useStore } from './store';
import { Sidebar } from './components/Sidebar';
import { Topbar } from './components/Topbar';
import { Dashboard } from './pages/Dashboard';
import { Projects } from './pages/Projects';
import { Geospatial } from './pages/Geospatial';
import { FileUpload } from './pages/FileUpload';
import { AIChat } from './pages/AIChat';
import { AdminPanel } from './pages/AdminPanel';
import { FlightSimulator } from './pages/FlightSimulator';
import { MaintenanceScheduler } from './pages/MaintenanceScheduler';
import { 
  KeyRound, 
  Mail, 
  Gamepad2, 
  AlertOctagon, 
  X,
  Database
} from 'lucide-react';
import confetti from 'canvas-confetti';

const App: React.FC = () => {
  const { 
    isAuthenticated, 
    login, 
    register, 
    activeTab, 
    token,
    user,
    fetchNotifications
  } = useStore();

  // Auth toggle
  const [isLoginView, setIsLoginView] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState('Engineer');
  const [authError, setAuthError] = useState('');

  // WebSocket Live alerts
  const [wsAlert, setWsAlert] = useState<{ title: string; message: string } | null>(null);

  // Initialize WebSockets
  useEffect(() => {
    if (!isAuthenticated || !token) return;

    let ws: globalThis.WebSocket | null = null;
    let reconnectTimeout: any;

    const connectWS = () => {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.hostname}:5000`;
      
      console.log(`Connecting to WebSocket: ${wsUrl}`);
      ws = new WebSocket(wsUrl);

      ws.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          
          if (payload.type === 'AI_ANALYSIS_COMPLETE') {
            const data = payload.data;
            
            // Trigger in-app HUD notification toast
            setWsAlert({
              title: `AI SCAN COMPLETE`,
              message: `YOLOv8 completed scanning ${data.fileName}. Found ${data.defectsDetected} defects.`
            });

            // Play warning sound
            try {
              const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
              const osc = audioCtx.createOscillator();
              const gain = audioCtx.createGain();
              osc.connect(gain);
              gain.connect(audioCtx.destination);
              osc.frequency.setValueAtTime(500, audioCtx.currentTime);
              osc.frequency.exponentialRampToValueAtTime(300, audioCtx.currentTime + 0.3);
              gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
              gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);
              osc.start();
              osc.stop(audioCtx.currentTime + 0.3);
            } catch {}

            // Trigger success splash
            confetti({ particleCount: 40, spread: 50 });
            
            // Reload alerts count
            fetchNotifications();
          }
        } catch (err) {
          console.error('Error parsing WS message', err);
        }
      };

      ws.onclose = () => {
        console.warn('WS disconnected. Reconnecting in 5s...');
        reconnectTimeout = setTimeout(connectWS, 5000);
      };

      ws.onerror = () => {
        ws?.close();
      };
    };

    connectWS();

    return () => {
      if (ws) ws.close();
      clearTimeout(reconnectTimeout);
    };
  }, [isAuthenticated, token]);

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');

    if (isLoginView) {
      const success = await login(email, password);
      if (success) {
        confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
      } else {
        setAuthError('Authentication failed. Check your credentials.');
      }
    } else {
      const success = await register(name, email, password, role);
      if (success) {
        setIsLoginView(true);
        setEmail('');
        setPassword('');
        alert('Registration complete. You can now login.');
      } else {
        setAuthError('Registration failed. Email might be registered.');
      }
    }
  };

  const handleQuickLogin = async (mockEmail: string) => {
    setEmail(mockEmail);
    setPassword('password123');
    const success = await login(mockEmail, 'password123');
    if (success) {
      confetti({ particleCount: 80, spread: 60 });
    }
  };

  // Auth Guard view
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#060a13] flex justify-center items-center p-6 relative overflow-hidden font-sans select-none">
        
        {/* Decorative backgrounds */}
        <div className="absolute top-[-20%] left-[-20%] w-[60%] h-[60%] rounded-full bg-cyan-500/10 blur-[120px] pointer-events-none"></div>
        <div className="absolute bottom-[-20%] right-[-20%] w-[60%] h-[60%] rounded-full bg-purple-500/10 blur-[120px] pointer-events-none"></div>

        <div className="w-[450px] glass-panel p-8 rounded-2xl border border-brand-border/80 shadow-2xl relative z-10 space-y-6">
          
          {/* Logo */}
          <div className="text-center space-y-2">
            <div className="inline-flex p-3 bg-gradient-to-tr from-cyan-500 to-purple-600 rounded-xl shadow-lg shadow-cyan-500/15 mb-2">
              <Gamepad2 className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-purple-400 tracking-wider">
              DRONE INTELLIGENCE
            </h1>
            <p className="text-xs text-brand-muted font-semibold uppercase tracking-widest">Command Center Dashboard</p>
          </div>

          <form onSubmit={handleAuthSubmit} className="space-y-4 text-xs">
            {!isLoginView && (
              <div className="space-y-1">
                <label className="text-brand-muted block">Operator Name</label>
                <input 
                  type="text" 
                  required
                  value={name} 
                  onChange={e => setName(e.target.value)}
                  placeholder="e.g. John Doe"
                  className="w-full bg-slate-900 border border-brand-border/60 rounded-lg px-3.5 py-2.5 text-brand-text placeholder-brand-muted focus:outline-none focus:border-cyan-500"
                />
              </div>
            )}

            <div className="space-y-1">
              <label className="text-brand-muted block">Email Address</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-brand-muted absolute left-3 top-1/2 -translate-y-1/2" />
                <input 
                  type="email" 
                  required
                  value={email} 
                  onChange={e => setEmail(e.target.value)}
                  placeholder="name@company.com"
                  className="w-full bg-slate-900 border border-brand-border/60 rounded-lg pl-10 pr-4 py-2.5 text-brand-text placeholder-brand-muted focus:outline-none focus:border-cyan-500"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-brand-muted block">Password</label>
              <div className="relative">
                <KeyRound className="w-4 h-4 text-brand-muted absolute left-3 top-1/2 -translate-y-1/2" />
                <input 
                  type="password" 
                  required
                  value={password} 
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-slate-900 border border-brand-border/60 rounded-lg pl-10 pr-4 py-2.5 text-brand-text placeholder-brand-muted focus:outline-none focus:border-cyan-500"
                />
              </div>
            </div>

            {!isLoginView && (
              <div className="space-y-1">
                <label className="text-brand-muted block">Operator Role</label>
                <select
                  value={role}
                  onChange={e => setRole(e.target.value)}
                  className="w-full bg-slate-900 border border-brand-border/60 rounded-lg px-3.5 py-2.5 text-brand-text focus:outline-none focus:border-cyan-500"
                >
                  <option value="Admin">Admin (Full Control)</option>
                  <option value="Inspector">Inspector (Uploads & Flight)</option>
                  <option value="Engineer">Engineer (Analysis & Q&A)</option>
                </select>
              </div>
            )}

            {authError && (
              <p className="text-[10px] text-red-400 font-semibold text-center">{authError}</p>
            )}

            <button 
              type="submit"
              className="w-full py-2.5 bg-gradient-to-r from-cyan-500 to-purple-600 rounded-lg text-xs font-bold text-white shadow-lg shadow-cyan-500/10 hover:brightness-110 transition-all uppercase tracking-wider"
            >
              {isLoginView ? 'Access Command Center' : 'Create Operator Account'}
            </button>
          </form>

          {/* Toggle View */}
          <div className="text-center text-[10px]">
            <button 
              onClick={() => setIsLoginView(!isLoginView)}
              className="text-brand-muted hover:text-cyan-400 font-semibold"
            >
              {isLoginView ? "Need an account? Register operator" : "Already registered? Login"}
            </button>
          </div>

          {/* Quick Demo Access (RBAC testing shortcut) */}
          <div className="border-t border-brand-border/40 pt-4 space-y-2">
            <p className="text-[9px] uppercase font-bold text-brand-muted text-center tracking-widest">Demo Quick Access Pass</p>
            <div className="grid grid-cols-3 gap-2 text-[9px] font-semibold text-brand-text">
              <button 
                onClick={() => handleQuickLogin('admin@dicc.com')}
                className="py-1.5 rounded bg-cyan-500/10 border border-cyan-500/35 hover:bg-cyan-500/20 text-cyan-400"
              >
                Admin
              </button>
              <button 
                onClick={() => handleQuickLogin('inspector@dicc.com')}
                className="py-1.5 rounded bg-purple-500/10 border border-purple-500/35 hover:bg-purple-500/20 text-purple-400"
              >
                Inspector
              </button>
              <button 
                onClick={() => handleQuickLogin('engineer@dicc.com')}
                className="py-1.5 rounded bg-slate-800 border border-brand-border/80 hover:bg-slate-700"
              >
                Engineer
              </button>
            </div>
          </div>

        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#060a13] flex text-brand-text font-sans overflow-hidden">
      
      {/* Sidebar Navigation */}
      <Sidebar />

      {/* Main content grid */}
      <div className="flex-1 flex flex-col min-w-0 bg-[#060a13]">
        {/* Topbar headers */}
        <Topbar />

        {/* Dynamic page switches */}
        <main className="flex-1 min-h-0 bg-[#060a13]/30">
          {activeTab === 'dashboard' && <Dashboard />}
          {activeTab === 'projects' && <Projects />}
          {activeTab === 'map' && <Geospatial />}
          {activeTab === 'upload' && <FileUpload />}
          {activeTab === 'chat' && <AIChat />}
          {activeTab === 'admin' && <AdminPanel />}
          {activeTab === 'simulator' && <FlightSimulator />}
          {activeTab === 'scheduler' && <MaintenanceScheduler />}
        </main>
      </div>

      {/* Real-time WS Defect Notification Toast */}
      {wsAlert && (
        <div className="fixed bottom-6 right-6 w-96 glass-panel-heavy p-4 rounded-xl border border-red-500/40 shadow-2xl z-50 flex items-start space-x-3.5 animate-slide-up">
          <div className="p-2 bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg animate-pulse">
            <AlertOctagon className="w-6 h-6" />
          </div>
          <div className="flex-1 min-w-0 text-xs">
            <h4 className="font-extrabold text-red-400 uppercase tracking-wide">{wsAlert.title}</h4>
            <p className="text-brand-muted mt-1 leading-relaxed">{wsAlert.message}</p>
          </div>
          <button 
            onClick={() => setWsAlert(null)}
            className="p-1 rounded hover:bg-slate-800 text-brand-muted hover:text-brand-text transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

    </div>
  );
};

export default App;
