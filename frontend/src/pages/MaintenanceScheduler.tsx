import React, { useState } from 'react';
import { useStore } from '../store';
import { 
  CalendarDays, 
  Clock, 
  User, 
  Plus, 
  CheckCircle,
  FilePlus,
  AlertCircle
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface ScheduleTask {
  id: number;
  title: string;
  project: string;
  date: string;
  time: string;
  assignee: string;
  type: 'Flight Inspection' | 'Blade Repair' | 'Anti-Corrosion Coating' | 'Vegetation Trim';
  priority: 'Low' | 'Medium' | 'High' | 'Critical';
  completed: boolean;
}

export const MaintenanceScheduler: React.FC = () => {
  const { projects } = useStore();
  const [showAddModal, setShowAddModal] = useState(false);

  // Mock list of scheduled items
  const [tasks, setTasks] = useState<ScheduleTask[]>([
    {
      id: 1,
      title: 'Blade Epoxy Infusion (Hub 2B)',
      project: 'Wind Farm Turbine Inspection',
      date: '2026-07-03',
      time: '08:30 AM',
      assignee: 'Technician team alpha',
      type: 'Blade Repair',
      priority: 'Critical',
      completed: false
    },
    {
      id: 2,
      title: 'Solar Panel Zone A Quarterly Scan',
      project: 'Giga Solar Asset Zone A',
      date: '2026-07-08',
      time: '10:00 AM',
      assignee: 'Inspector User',
      type: 'Flight Inspection',
      priority: 'High',
      completed: false
    },
    {
      id: 3,
      title: 'Conductor Clearance Vegetation Pruning',
      project: 'Giga Solar Asset Zone A',
      date: '2026-07-12',
      time: '01:00 PM',
      assignee: 'Ground clearance crew',
      type: 'Vegetation Trim',
      priority: 'Medium',
      completed: true
    }
  ]);

  // Form states
  const [title, setTitle] = useState('');
  const [projectSelect, setProjectSelect] = useState('');
  const [date, setDate] = useState('2026-07-05');
  const [time, setTime] = useState('09:00 AM');
  const [assignee, setAssignee] = useState('');
  const [type, setType] = useState<'Flight Inspection' | 'Blade Repair' | 'Anti-Corrosion Coating' | 'Vegetation Trim'>('Flight Inspection');
  const [priority, setPriority] = useState<'Low' | 'Medium' | 'High' | 'Critical'>('Medium');

  const handleCreateTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !assignee.trim()) return;

    const newTask: ScheduleTask = {
      id: Date.now(),
      title,
      project: projectSelect || 'General Maintenance',
      date,
      time,
      assignee,
      type,
      priority,
      completed: false
    };

    setTasks([newTask, ...tasks]);
    setShowAddModal(false);
    setTitle('');
    setAssignee('');
    confetti({ particleCount: 50, spread: 45 });
  };

  const handleToggleComplete = (id: number) => {
    setTasks(tasks.map(t => t.id === id ? { ...t, completed: !t.completed } : t));
  };

  const getPriorityColor = (p: string) => {
    switch (p) {
      case 'Critical': return 'bg-red-500/10 text-red-400 border border-red-500/20';
      case 'High': return 'bg-orange-500/10 text-orange-400 border border-orange-500/20';
      case 'Medium': return 'bg-purple-500/10 text-purple-400 border border-purple-500/20';
      default: return 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20';
    }
  };

  // Build simulated calendar day squares for July 2026
  const calendarDays = Array.from({ length: 31 }, (_, i) => i + 1);

  return (
    <div className="flex h-[calc(100vh-4rem)] p-6 space-x-6 select-none overflow-hidden">
      
      {/* Left calendar layout grid */}
      <div className="flex-1 flex flex-col h-full space-y-4">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold text-brand-text">Work Orders & Scheduler</h2>
            <p className="text-xs text-brand-muted mt-0.5">Schedule drone surveillance missions and maintenance repairs.</p>
          </div>

          <button
            onClick={() => setShowAddModal(true)}
            className="px-3.5 py-2 bg-cyan-500 hover:bg-cyan-600 text-slate-950 font-bold rounded-lg flex items-center space-x-1.5 text-xs shadow-lg shadow-cyan-500/15"
          >
            <Plus className="w-4 h-4" />
            <span>Create Task</span>
          </button>
        </div>

        {/* Calendar visual widget */}
        <div className="flex-1 glass-card border border-brand-border/60 rounded-xl p-5 flex flex-col min-h-0">
          <div className="flex justify-between items-center border-b border-brand-border/40 pb-3">
            <h3 className="text-sm font-bold text-brand-text">July 2026</h3>
            <span className="text-[10px] text-brand-muted uppercase font-bold tracking-wider">Universal Time Zone</span>
          </div>

          {/* Weekday headers */}
          <div className="grid grid-cols-7 gap-2 mt-4 text-center text-[10px] text-brand-muted uppercase font-bold">
            <div>Sun</div><div>Mon</div><div>Tue</div><div>Wed</div><div>Thu</div><div>Fri</div><div>Sat</div>
          </div>

          {/* Days Grid */}
          <div className="flex-1 grid grid-cols-7 gap-2 mt-2 text-xs min-h-0 overflow-y-auto">
            {/* Pad days (July 2026 starts on Wednesday, so 3 empty cells) */}
            {Array.from({ length: 3 }).map((_, idx) => (
              <div key={`pad-${idx}`} className="bg-slate-900/10 rounded-lg border border-transparent"></div>
            ))}
            
            {calendarDays.map((day) => {
              const dateString = `2026-07-${day < 10 ? '0' + day : day}`;
              const dayTasks = tasks.filter(t => t.date === dateString);

              return (
                <div 
                  key={day} 
                  className={`p-2 rounded-lg border flex flex-col justify-between items-start min-h-16 ${
                    dayTasks.length > 0
                      ? 'bg-cyan-500/5 border-cyan-500/35 hover:border-cyan-400'
                      : 'bg-brand-card/40 border-brand-border/40 hover:border-brand-border'
                  }`}
                >
                  <span className="font-bold text-brand-text">{day}</span>
                  {dayTasks.length > 0 && (
                    <div className="space-y-1 w-full">
                      {dayTasks.map(t => (
                        <div 
                          key={t.id} 
                          className={`text-[8px] px-1 rounded truncate leading-normal ${
                            t.completed 
                              ? 'bg-slate-800 text-brand-muted line-through' 
                              : t.priority === 'Critical' 
                              ? 'bg-red-500/25 text-red-300' 
                              : 'bg-cyan-500/25 text-cyan-300'
                          }`}
                          title={t.title}
                        >
                          {t.title}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Right task list control panels */}
      <div className="w-80 border-l border-brand-border/60 flex flex-col h-full bg-brand-bg/20 p-6 space-y-4">
        <div>
          <h4 className="text-xs font-bold text-brand-text uppercase tracking-wider">Task Briefs</h4>
          <p className="text-[10px] text-brand-muted mt-0.5">Assigned work orders check-sheets</p>
        </div>

        <div className="flex-1 overflow-y-auto space-y-3 pr-1">
          {tasks.map((task) => (
            <div 
              key={task.id}
              className={`p-4 rounded-xl border space-y-3 transition-all ${
                task.completed 
                  ? 'bg-slate-900/30 border-brand-border/30 opacity-70' 
                  : 'bg-brand-card border-brand-border/60 hover:border-brand-border'
              }`}
            >
              <div className="flex justify-between items-start">
                <div className="flex items-center space-x-1.5">
                  <button 
                    onClick={() => handleToggleComplete(task.id)}
                    className="p-0.5 rounded-full border border-brand-border/80 text-brand-muted hover:text-emerald-400 transition-colors"
                  >
                    <CheckCircle className={`w-3.5 h-3.5 ${task.completed ? 'text-emerald-400 fill-emerald-500/10' : 'text-slate-700'}`} />
                  </button>
                  <h5 className={`text-xs font-bold text-brand-text truncate w-36 ${task.completed ? 'line-through text-brand-muted' : ''}`}>
                    {task.title}
                  </h5>
                </div>
                <span className={`text-[7px] font-bold px-1.5 py-0.5 rounded uppercase ${getPriorityColor(task.priority)}`}>
                  {task.priority}
                </span>
              </div>

              <p className="text-[9px] text-brand-muted truncate leading-relaxed">
                Project: {task.project}
              </p>

              <div className="flex items-center justify-between text-[8px] text-brand-muted border-t border-brand-border/30 pt-2.5">
                <span className="flex items-center"><Clock className="w-2.5 h-2.5 mr-1 text-cyan-400" /> {task.date} • {task.time}</span>
                <span className="flex items-center"><User className="w-2.5 h-2.5 mr-1 text-purple-400" /> {task.assignee.split(' ')[0]}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Add Task Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-950/75 backdrop-blur-sm flex justify-center items-center z-50 animate-fade-in">
          <div className="w-[450px] glass-panel-heavy p-6 rounded-xl border border-brand-border shadow-2xl">
            <h3 className="text-base font-bold text-brand-text border-b border-brand-border/60 pb-3 uppercase tracking-wider">Schedule Work Order</h3>
            
            <form onSubmit={handleCreateTask} className="space-y-4 mt-4 text-xs">
              <div className="space-y-1">
                <label className="text-brand-muted block">Task Title *</label>
                <input 
                  type="text" 
                  required
                  value={title} 
                  onChange={e => setTitle(e.target.value)}
                  placeholder="e.g. Substation Thermal Scan" 
                  className="w-full bg-slate-900 border border-brand-border rounded px-3 py-2 text-brand-text focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-brand-muted block">Select Boundary Project</label>
                <select
                  value={projectSelect}
                  onChange={e => setProjectSelect(e.target.value)}
                  className="w-full bg-slate-900 border border-brand-border rounded px-3 py-2 text-brand-text focus:outline-none focus:border-cyan-500"
                >
                  <option value="">General Maintenance</option>
                  {projects.map(p => (
                    <option key={p.id} value={p.name}>{p.name}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-brand-muted block">Date *</label>
                  <input 
                    type="date" 
                    required
                    value={date} 
                    onChange={e => setDate(e.target.value)}
                    className="w-full bg-slate-900 border border-brand-border rounded px-3 py-2 text-brand-text focus:outline-none focus:border-cyan-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-brand-muted block">Start Time</label>
                  <input 
                    type="text" 
                    value={time} 
                    onChange={e => setTime(e.target.value)}
                    placeholder="e.g. 09:30 AM" 
                    className="w-full bg-slate-900 border border-brand-border rounded px-3 py-2 text-brand-text focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-brand-muted block">Task Category</label>
                  <select 
                    value={type} 
                    onChange={e => setType(e.target.value as any)}
                    className="w-full bg-slate-900 border border-brand-border rounded px-3 py-2 text-brand-text focus:outline-none focus:border-cyan-500"
                  >
                    <option value="Flight Inspection">Flight Inspection</option>
                    <option value="Blade Repair">Blade Repair</option>
                    <option value="Anti-Corrosion Coating">Anti-Corrosion Coating</option>
                    <option value="Vegetation Trim">Vegetation Trim</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-brand-muted block">Priority Scale</label>
                  <select 
                    value={priority} 
                    onChange={e => setPriority(e.target.value as any)}
                    className="w-full bg-slate-900 border border-brand-border rounded px-3 py-2 text-brand-text focus:outline-none focus:border-cyan-500"
                  >
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                    <option value="Critical">Critical</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-brand-muted block">Assign Inspector / Crew *</label>
                <input 
                  type="text" 
                  required
                  value={assignee} 
                  onChange={e => setAssignee(e.target.value)}
                  placeholder="e.g. Technician team beta" 
                  className="w-full bg-slate-900 border border-brand-border rounded px-3 py-2 text-brand-text focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-3 border-t border-brand-border/40">
                <button 
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 border border-brand-border rounded font-semibold text-brand-text hover:bg-slate-900"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="px-4 py-2 bg-cyan-500 hover:bg-cyan-600 rounded font-semibold text-slate-950"
                >
                  Schedule Task
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
