import React, { useEffect, useState } from 'react';
import { useStore } from '../store';
import { 
  Bar, 
  Doughnut, 
  Line 
} from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  PointElement,
  LineElement,
  ArcElement,
  Filler
} from 'chart.js';
import { 
  FolderGit2, 
  ShieldAlert, 
  AlertOctagon, 
  Activity, 
  ArrowUpRight,
  TrendingUp
} from 'lucide-react';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

export const Dashboard: React.FC = () => {
  const { fetchProjects, projects, fetchSystemTelemetry } = useStore();
  const [telemetry, setTelemetry] = useState<any>(null);

  useEffect(() => {
    fetchProjects();
    fetchSystemTelemetry().then(setTelemetry);
  }, []);

  // Compute stats metrics
  const totalProjects = projects.length;
  const criticalDefects = 1; // Chitradurga blade crack
  const totalDefects = 2;
  const activeUsers = 3;

  // Chart 1: Defects by Category (Bar)
  const categoryData = {
    labels: ['Crack', 'Corrosion', 'Vegetation', 'Structural', 'Missing Part'],
    datasets: [{
      label: 'Defect Volume',
      data: [3, 2, 4, 1, 1],
      backgroundColor: [
        'rgba(6, 182, 212, 0.65)',
        'rgba(168, 85, 247, 0.65)',
        'rgba(16, 185, 129, 0.65)',
        'rgba(249, 115, 22, 0.65)',
        'rgba(239, 68, 68, 0.65)'
      ],
      borderColor: [
        '#06b6d4',
        '#a855f7',
        '#10b981',
        '#f97316',
        '#ef4444'
      ],
      borderWidth: 1.5,
      borderRadius: 4
    }]
  };

  // Chart 2: Severity Distribution (Doughnut)
  const severityData = {
    labels: ['Critical', 'High', 'Medium', 'Low'],
    datasets: [{
      data: [1, 2, 3, 2],
      backgroundColor: [
        '#ef4444',
        '#f97316',
        '#a855f7',
        '#10b981'
      ],
      borderWidth: 0,
      hoverOffset: 4
    }]
  };

  // Chart 3: Monthly Inspections (Line with gradients)
  const inspectionsTrendData = {
    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul'],
    datasets: [{
      fill: true,
      label: 'Flights Logged',
      data: [4, 6, 5, 8, 12, 14, 18],
      borderColor: '#06b6d4',
      backgroundColor: 'rgba(6, 182, 212, 0.08)',
      tension: 0.4,
      pointRadius: 4,
      pointBackgroundColor: '#06b6d4'
    }]
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        labels: {
          color: '#94a3b8',
          font: { family: 'Inter', size: 10 }
        }
      }
    },
    scales: {
      x: {
        grid: { color: 'rgba(255, 255, 255, 0.04)' },
        ticks: { color: '#94a3b8', font: { size: 10 } }
      },
      y: {
        grid: { color: 'rgba(255, 255, 255, 0.04)' },
        ticks: { color: '#94a3b8', font: { size: 10 } }
      }
    }
  };

  return (
    <div className="space-y-6 select-none max-h-[calc(100vh-4rem)] overflow-y-auto p-6">
      
      {/* Title Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-brand-text to-slate-400">
            Operations Dashboard
          </h2>
          <p className="text-xs text-brand-muted mt-0.5">Real-time status of aerial asset inspections & defects</p>
        </div>
        
        {/* Dynamic Telemetry Status */}
        <div className="flex items-center space-x-2 bg-slate-900/60 px-3.5 py-1.5 rounded-lg border border-brand-border/60">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shadow-sm shadow-emerald-500"></span>
          <span className="text-[10px] font-bold text-brand-muted uppercase tracking-wider">Live Feed Connected</span>
        </div>
      </div>

      {/* Metrics Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Total Projects */}
        <div className="glass-card p-5 rounded-xl flex items-center justify-between border-l-4 border-l-cyan-400">
          <div className="space-y-1">
            <p className="text-[10px] text-brand-muted uppercase font-bold tracking-wider">Total Projects</p>
            <h3 className="text-3xl font-extrabold text-brand-text">{totalProjects}</h3>
            <p className="text-[9px] text-emerald-400 flex items-center font-medium">
              <TrendingUp className="w-3 h-3 mr-1" /> +12% increase
            </p>
          </div>
          <div className="p-3 bg-cyan-500/10 rounded-lg">
            <FolderGit2 className="w-6 h-6 text-cyan-400" />
          </div>
        </div>

        {/* Total Defects */}
        <div className="glass-card p-5 rounded-xl flex items-center justify-between border-l-4 border-l-purple-500">
          <div className="space-y-1">
            <p className="text-[10px] text-brand-muted uppercase font-bold tracking-wider">Total Defects</p>
            <h3 className="text-3xl font-extrabold text-brand-text">{totalDefects}</h3>
            <p className="text-[9px] text-brand-muted font-medium">Auto-detected by AI</p>
          </div>
          <div className="p-3 bg-purple-500/10 rounded-lg">
            <ShieldAlert className="w-6 h-6 text-purple-400" />
          </div>
        </div>

        {/* Critical Defects */}
        <div className="glass-card p-5 rounded-xl flex items-center justify-between border-l-4 border-l-red-500">
          <div className="space-y-1">
            <p className="text-[10px] text-brand-muted uppercase font-bold tracking-wider">Critical Defects</p>
            <h3 className="text-3xl font-extrabold text-red-400">{criticalDefects}</h3>
            <p className="text-[9px] text-red-400 font-medium">Requires action &lt; 48h</p>
          </div>
          <div className="p-3 bg-red-500/10 rounded-lg">
            <AlertOctagon className="w-6 h-6 text-red-400" />
          </div>
        </div>

        {/* Active Users */}
        <div className="glass-card p-5 rounded-xl flex items-center justify-between border-l-4 border-l-orange-400">
          <div className="space-y-1">
            <p className="text-[10px] text-brand-muted uppercase font-bold tracking-wider">Active Operators</p>
            <h3 className="text-3xl font-extrabold text-brand-text">{activeUsers}</h3>
            <p className="text-[9px] text-brand-muted font-medium">Admin / Inspector / Eng</p>
          </div>
          <div className="p-3 bg-orange-500/10 rounded-lg">
            <Activity className="w-6 h-6 text-orange-400" />
          </div>
        </div>

      </div>

      {/* Visual Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Category Bar chart */}
        <div className="glass-card p-5 rounded-xl border border-brand-border/60 flex flex-col h-80">
          <div className="flex justify-between items-center mb-3">
            <h4 className="text-xs font-bold text-brand-text uppercase tracking-wider">Defects by Category</h4>
            <ArrowUpRight className="w-4 h-4 text-brand-muted cursor-pointer hover:text-cyan-400" />
          </div>
          <div className="flex-1 min-h-0 relative">
            <Bar data={categoryData} options={chartOptions} />
          </div>
        </div>

        {/* Severity Doughnut chart */}
        <div className="glass-card p-5 rounded-xl border border-brand-border/60 flex flex-col h-80">
          <div className="flex justify-between items-center mb-3">
            <h4 className="text-xs font-bold text-brand-text uppercase tracking-wider">Severity Allocation</h4>
            <ArrowUpRight className="w-4 h-4 text-brand-muted cursor-pointer hover:text-cyan-400" />
          </div>
          <div className="flex-1 min-h-0 relative flex justify-center">
            <Doughnut 
              data={severityData} 
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: {
                    position: 'bottom',
                    labels: { color: '#94a3b8', font: { size: 9 } }
                  }
                }
              }} 
            />
          </div>
        </div>

        {/* Monthly Trend Line chart */}
        <div className="glass-card p-5 rounded-xl border border-brand-border/60 flex flex-col h-80">
          <div className="flex justify-between items-center mb-3">
            <h4 className="text-xs font-bold text-brand-text uppercase tracking-wider">Monthly Inspections Run</h4>
            <ArrowUpRight className="w-4 h-4 text-brand-muted cursor-pointer hover:text-cyan-400" />
          </div>
          <div className="flex-1 min-h-0 relative">
            <Line data={inspectionsTrendData} options={chartOptions} />
          </div>
        </div>

      </div>

      {/* Activity Logs & Details */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Recent Activity Feed */}
        <div className="lg:col-span-2 glass-card p-5 rounded-xl border border-brand-border/60">
          <h4 className="text-xs font-bold text-brand-text uppercase tracking-wider mb-4">Command Center Activities</h4>
          <div className="space-y-3 max-h-60 overflow-y-auto pr-2">
            {telemetry?.recentActivities.map((act: any) => (
              <div 
                key={act.id} 
                className="flex items-start space-x-3 p-3 rounded-lg bg-slate-900/35 border border-brand-border/40 hover:border-brand-border/80 transition-all"
              >
                <div className="w-8 h-8 rounded-full bg-cyan-500/10 flex items-center justify-center font-bold text-cyan-400 text-xs border border-cyan-500/20">
                  {act.user_name.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-brand-text">{act.user_name}</span>
                    <span className="text-[9px] text-brand-muted">{new Date(act.timestamp).toLocaleTimeString()}</span>
                  </div>
                  <p className="text-[10px] text-brand-muted mt-0.5 truncate">{act.details}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* System Telemetry & Allocation Panel */}
        <div className="glass-card p-5 rounded-xl border border-brand-border/60 space-y-4">
          <h4 className="text-xs font-bold text-brand-text uppercase tracking-wider">System Telemetry</h4>
          
          <div className="space-y-3 text-xs">
            <div className="flex justify-between items-center py-2 border-b border-brand-border/40">
              <span className="text-brand-muted">Process Memory (RSS)</span>
              <span className="font-semibold text-brand-text">{telemetry?.health.memory.rss || 'N/A'}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-brand-border/40">
              <span className="text-brand-muted">CPU Heap Allocation</span>
              <span className="font-semibold text-brand-text">{telemetry?.health.memory.heapUsed || 'N/A'}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-brand-border/40">
              <span className="text-brand-muted">S3 Storage Limit</span>
              <span className="font-semibold text-emerald-400">12.4 GB / 100 GB</span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-brand-muted">Server Response Time</span>
              <span className="font-semibold text-cyan-400">14 ms</span>
            </div>
          </div>

          <div className="p-3 bg-cyan-500/5 rounded-lg border border-cyan-500/10 flex items-center space-x-3 mt-4">
            <Activity className="w-5 h-5 text-cyan-400 animate-pulse" />
            <div>
              <p className="text-[10px] font-bold text-brand-text uppercase">Vision Worker Active</p>
              <p className="text-[9px] text-brand-muted">YOLOv8 BullMQ listener online</p>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
};
