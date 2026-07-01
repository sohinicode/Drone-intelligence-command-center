import React, { useEffect, useState } from 'react';
import { useStore, Project } from '../store';
import { 
  Plus, 
  MapPin, 
  Layers, 
  AlertCircle, 
  UserPlus, 
  FileText, 
  FileSpreadsheet, 
  Loader2,
  Trash2,
  ChevronRight,
  ClipboardList
} from 'lucide-react';
import confetti from 'canvas-confetti';

export const Projects: React.FC = () => {
  const { 
    projects, 
    fetchProjects, 
    selectedProject, 
    fetchProjectDetails, 
    createProject, 
    deleteProject,
    projectFiles,
    projectDefects,
    projectReports,
    generateReport,
    activeRoleView
  } = useStore();

  const [showAddModal, setShowAddModal] = useState(false);
  const [loadingReport, setLoadingReport] = useState<string | null>(null);
  
  // New project form state
  const [name, setName] = useState('');
  const [company, setCompany] = useState('');
  const [location, setLocation] = useState('');
  const [lat, setLat] = useState('12.9716');
  const [lon, setLon] = useState('77.5946');
  const [type, setType] = useState('Thermal Solar');
  const [priority, setPriority] = useState<'Low' | 'Medium' | 'High' | 'Critical'>('Medium');
  const [desc, setDesc] = useState('');

  useEffect(() => {
    fetchProjects();
  }, []);

  const handleSelectProject = (id: number) => {
    fetchProjectDetails(id);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const success = await createProject({
      name,
      company_name: company,
      location,
      latitude: parseFloat(lat),
      longitude: parseFloat(lon),
      inspection_type: type,
      priority,
      description: desc,
      assigned_members: [2]
    });
    if (success) {
      setShowAddModal(false);
      setName('');
      setCompany('');
      setLocation('');
      setDesc('');
      confetti({ particleCount: 80, spread: 60 });
    }
  };

  const handleExport = async (format: 'pdf' | 'csv' | 'excel') => {
    if (!selectedProject) return;
    setLoadingReport(format);
    const downloadUrl = await generateReport(selectedProject.id, format);
    setLoadingReport(null);
    if (downloadUrl) {
      // Trigger browser download
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.setAttribute('download', `${selectedProject.name.replace(/\s+/g, '_')}_Report.${format === 'excel' ? 'xls' : format}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    }
  };

  const canEdit = activeRoleView === 'Admin' || activeRoleView === 'Inspector';
  const isAdmin = activeRoleView === 'Admin';

  return (
    <div className="flex h-[calc(100vh-4rem)] select-none">
      
      {/* Left List of Projects */}
      <div className="w-1/3 border-r border-brand-border/60 flex flex-col h-full bg-brand-bg/20">
        <div className="p-5 border-b border-brand-border flex justify-between items-center bg-slate-900/10">
          <div>
            <h3 className="text-sm font-bold text-brand-text uppercase tracking-wider">Asset Projects</h3>
            <p className="text-[10px] text-brand-muted mt-0.5">{projects.length} registers active</p>
          </div>
          {canEdit && (
            <button 
              onClick={() => setShowAddModal(true)}
              className="p-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-600 text-slate-950 font-bold flex items-center space-x-1 text-xs shadow-md shadow-cyan-500/25 transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add</span>
            </button>
          )}
        </div>

        {/* Project scrollable grid list */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {projects.length === 0 ? (
            <div className="p-8 text-center text-xs text-brand-muted">No projects registered.</div>
          ) : (
            projects.map((proj) => {
              const isSel = selectedProject?.id === proj.id;
              return (
                <div 
                  key={proj.id}
                  onClick={() => handleSelectProject(proj.id)}
                  className={`p-4 rounded-xl border cursor-pointer transition-all duration-300 ${
                    isSel 
                      ? 'bg-gradient-to-tr from-cyan-500/15 to-purple-600/5 border-cyan-500/60 shadow-lg shadow-cyan-500/5' 
                      : 'bg-brand-card border-brand-border/60 hover:border-brand-border/100 hover:bg-slate-900/20'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <h4 className="text-xs font-bold text-brand-text truncate w-4/5">{proj.name}</h4>
                    <span className={`text-[8px] font-bold px-2 py-0.5 rounded uppercase ${
                      proj.priority === 'Critical' ? 'bg-red-500/20 text-red-400 border border-red-500/30' :
                      proj.priority === 'High' ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30' :
                      'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                    }`}>
                      {proj.priority}
                    </span>
                  </div>
                  <p className="text-[10px] text-brand-muted mt-1 truncate">{proj.company_name}</p>
                  
                  <div className="flex items-center space-x-3 text-[10px] text-brand-muted mt-3 border-t border-brand-border/30 pt-2">
                    <span className="flex items-center"><MapPin className="w-3 h-3 mr-1 text-cyan-400" /> {proj.location.split(' ')[0]}</span>
                    <span className="flex items-center"><Layers className="w-3 h-3 mr-1 text-purple-400" /> {proj.inspection_type}</span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Right Selected Project Details */}
      <div className="flex-1 overflow-y-auto p-6 bg-brand-bg/10">
        {selectedProject ? (
          <div className="space-y-6">
            
            {/* Header info */}
            <div className="flex justify-between items-start border-b border-brand-border/60 pb-6">
              <div className="space-y-1">
                <div className="flex items-center space-x-2">
                  <h2 className="text-xl font-bold text-brand-text">{selectedProject.name}</h2>
                  <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full capitalize ${
                    selectedProject.status === 'Completed' ? 'bg-emerald-500/20 text-emerald-400' :
                    selectedProject.status === 'In_Progress' ? 'bg-cyan-500/20 text-cyan-400' :
                    'bg-slate-500/20 text-slate-400'
                  }`}>
                    {selectedProject.status.replace('_', ' ')}
                  </span>
                </div>
                <p className="text-xs text-brand-muted">{selectedProject.company_name} • {selectedProject.location}</p>
              </div>

              {/* Action buttons (Reports compilation) */}
              <div className="flex items-center space-x-2">
                <button
                  disabled={loadingReport !== null}
                  onClick={() => handleExport('pdf')}
                  className="px-3 py-1.5 rounded-lg border border-brand-border/80 hover:border-cyan-500/50 bg-slate-900/40 text-xs font-semibold text-brand-text flex items-center space-x-1.5 hover:text-cyan-400 transition-colors disabled:opacity-50"
                >
                  {loadingReport === 'pdf' ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <FileText className="w-3.5 h-3.5 text-cyan-400" />
                  )}
                  <span>PDF Digest</span>
                </button>

                <button
                  disabled={loadingReport !== null}
                  onClick={() => handleExport('excel')}
                  className="px-3 py-1.5 rounded-lg border border-brand-border/80 hover:border-emerald-500/50 bg-slate-900/40 text-xs font-semibold text-brand-text flex items-center space-x-1.5 hover:text-emerald-400 transition-colors disabled:opacity-50"
                >
                  {loadingReport === 'excel' ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-500" />
                  )}
                  <span>Excel Sheet</span>
                </button>

                {isAdmin && (
                  <button
                    onClick={async () => {
                      if(confirm('Are you sure you want to delete this project?')) {
                        await deleteProject(selectedProject.id);
                        useStore.setState({ selectedProject: null });
                      }
                    }}
                    className="p-1.5 rounded-lg border border-red-500/30 text-brand-muted hover:bg-red-500/10 hover:text-red-400 transition-all"
                    title="Delete Project"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Description card */}
            <div className="glass-card p-5 rounded-xl border border-brand-border/60">
              <h4 className="text-xs font-bold text-brand-text uppercase tracking-wider mb-2">Project Briefing</h4>
              <p className="text-xs text-brand-muted leading-relaxed">{selectedProject.description || 'No project briefing provided.'}</p>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-5 pt-4 border-t border-brand-border/30 text-xs">
                <div>
                  <span className="text-brand-muted block">Inspection Type</span>
                  <span className="font-semibold text-brand-text mt-0.5 block">{selectedProject.inspection_type}</span>
                </div>
                <div>
                  <span className="text-brand-muted block">Coordinates</span>
                  <span className="font-semibold text-brand-text mt-0.5 block">{selectedProject.latitude.toFixed(4)}, {selectedProject.longitude.toFixed(4)}</span>
                </div>
                <div>
                  <span className="text-brand-muted block">Priority Scale</span>
                  <span className="font-semibold text-brand-text mt-0.5 block">{selectedProject.priority}</span>
                </div>
                <div>
                  <span className="text-brand-muted block">Files Uploaded</span>
                  <span className="font-semibold text-brand-text mt-0.5 block">{projectFiles.length} assets</span>
                </div>
              </div>
            </div>

            {/* Sub-grid files, defects, reports */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              
              {/* AI Defects detected */}
              <div className="glass-card p-5 rounded-xl border border-brand-border/60">
                <h4 className="text-xs font-bold text-brand-text uppercase tracking-wider mb-3">AI Detected Defects ({projectDefects.length})</h4>
                <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
                  {projectDefects.length === 0 ? (
                    <div className="text-center text-xs text-brand-muted py-6">No defects detected by AI.</div>
                  ) : (
                    projectDefects.map((def) => (
                      <div 
                        key={def.id}
                        className="p-3 bg-slate-900/30 rounded-lg border border-brand-border/60 flex items-start space-x-3"
                      >
                        <div className="p-1.5 bg-red-500/10 rounded border border-red-500/20 text-red-400">
                          <AlertCircle className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-center">
                            <span className="text-xs font-bold text-brand-text uppercase">{def.type}</span>
                            <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded capitalize ${
                              def.severity === 'Critical' ? 'bg-red-500/20 text-red-400' :
                              def.severity === 'High' ? 'bg-orange-500/20 text-orange-400' :
                              'bg-cyan-500/20 text-cyan-400'
                            }`}>{def.severity}</span>
                          </div>
                          <p className="text-[10px] text-brand-muted mt-1 leading-normal">{def.suggested_action}</p>
                          <p className="text-[8px] text-brand-muted/75 mt-2">Confidence: {(def.confidence * 100).toFixed(0)}% • GPS: ({def.gps_latitude?.toFixed(4)}, {def.gps_longitude?.toFixed(4)})</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Uploaded Files inventory */}
              <div className="glass-card p-5 rounded-xl border border-brand-border/60">
                <h4 className="text-xs font-bold text-brand-text uppercase tracking-wider mb-3">Inspection Assets ({projectFiles.length})</h4>
                <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
                  {projectFiles.length === 0 ? (
                    <div className="text-center text-xs text-brand-muted py-6">No files uploaded yet. Go to Upload.</div>
                  ) : (
                    projectFiles.map((file) => (
                      <div 
                        key={file.id}
                        className="p-3 bg-slate-900/30 border border-brand-border/40 rounded-lg flex items-center justify-between"
                      >
                        <div className="flex items-center space-x-3 truncate">
                          <div className="p-2 bg-slate-800 rounded font-bold text-xs text-brand-muted">
                            {file.name.split('.').pop()?.toUpperCase() || 'FILE'}
                          </div>
                          <div className="truncate">
                            <h5 className="text-xs font-semibold text-brand-text truncate">{file.name}</h5>
                            <p className="text-[9px] text-brand-muted">Version {file.version} • {(file.size / 1024 / 1024).toFixed(2)} MB</p>
                          </div>
                        </div>
                        <a 
                          href={file.url}
                          target="_blank"
                          rel="noreferrer"
                          className="p-1 rounded text-cyan-400 hover:bg-cyan-500/10"
                        >
                          <ChevronRight className="w-5 h-5" />
                        </a>
                      </div>
                    ))
                  )}
                </div>
              </div>

            </div>

            {/* Generated Reports Archive */}
            <div className="glass-card p-5 rounded-xl border border-brand-border/60">
              <h4 className="text-xs font-bold text-brand-text uppercase tracking-wider mb-3">Compiled Reports ({projectReports.length})</h4>
              <div className="space-y-2">
                {projectReports.length === 0 ? (
                  <div className="text-center text-xs text-brand-muted py-4">No reports compiled yet. Use PDF/Excel buttons to generate.</div>
                ) : (
                  projectReports.map((rep) => (
                    <div 
                      key={rep.id}
                      className="p-3 bg-slate-900/20 border border-brand-border/40 hover:border-brand-border/80 rounded-lg flex items-center justify-between"
                    >
                      <div className="flex items-center space-x-3">
                        <ClipboardList className="w-5 h-5 text-cyan-400" />
                        <div>
                          <h5 className="text-xs font-semibold text-brand-text">{rep.name}</h5>
                          <p className="text-[10px] text-brand-muted mt-0.5">{rep.summary}</p>
                        </div>
                      </div>
                      <a 
                        href={rep.pdf_url} 
                        download
                        className="px-2.5 py-1 rounded bg-slate-800 text-[10px] font-bold text-brand-text hover:bg-slate-700"
                      >
                        Download
                      </a>
                    </div>
                  ))
                )}
              </div>
            </div>

          </div>
        ) : (
          <div className="h-full flex flex-col justify-center items-center text-brand-muted space-y-2">
            <ClipboardList className="w-12 h-12 text-slate-800 animate-pulse" />
            <h3 className="text-sm font-semibold">Select an asset project to load DICC details</h3>
            <p className="text-xs text-brand-muted">Assigned members, detected defects, and files will show here.</p>
          </div>
        )}
      </div>

      {/* Add Project Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-950/75 backdrop-blur-sm flex justify-center items-center z-50 animate-fade-in">
          <div className="w-[500px] glass-panel-heavy p-6 rounded-xl border border-brand-border shadow-2xl relative">
            <h3 className="text-base font-bold text-brand-text border-b border-brand-border/60 pb-3 uppercase tracking-wider">Create Asset Project</h3>
            
            <form onSubmit={handleCreate} className="space-y-4 mt-4 text-xs">
              <div className="space-y-1">
                <label className="text-brand-muted block">Project Name *</label>
                <input 
                  type="text" 
                  required
                  value={name} 
                  onChange={e => setName(e.target.value)}
                  placeholder="e.g. Chitradurga Wind Turbine G4" 
                  className="w-full bg-slate-900 border border-brand-border rounded px-3 py-2 text-brand-text focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-brand-muted block">Company Name *</label>
                  <input 
                    type="text" 
                    required
                    value={company} 
                    onChange={e => setCompany(e.target.value)}
                    placeholder="e.g. AeroWind Corp" 
                    className="w-full bg-slate-900 border border-brand-border rounded px-3 py-2 text-brand-text focus:outline-none focus:border-cyan-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-brand-muted block">Location Location *</label>
                  <input 
                    type="text" 
                    required
                    value={location} 
                    onChange={e => setLocation(e.target.value)}
                    placeholder="e.g. Karnataka, India" 
                    className="w-full bg-slate-900 border border-brand-border rounded px-3 py-2 text-brand-text focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-brand-muted block">GPS Latitude *</label>
                  <input 
                    type="number" 
                    step="0.000001"
                    required
                    value={lat} 
                    onChange={e => setLat(e.target.value)}
                    className="w-full bg-slate-900 border border-brand-border rounded px-3 py-2 text-brand-text focus:outline-none focus:border-cyan-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-brand-muted block">GPS Longitude *</label>
                  <input 
                    type="number" 
                    step="0.000001"
                    required
                    value={lon} 
                    onChange={e => setLon(e.target.value)}
                    className="w-full bg-slate-900 border border-brand-border rounded px-3 py-2 text-brand-text focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-brand-muted block">Inspection Type</label>
                  <select 
                    value={type} 
                    onChange={e => setType(e.target.value)}
                    className="w-full bg-slate-900 border border-brand-border rounded px-3 py-2 text-brand-text focus:outline-none focus:border-cyan-500"
                  >
                    <option value="Thermal Solar">Thermal Solar</option>
                    <option value="Wind Blade Structural">Wind Blade Structural</option>
                    <option value="Power Line Corridors">Power Line Corridors</option>
                    <option value="Concrete Infrastructure">Concrete Infrastructure</option>
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
                <label className="text-brand-muted block">Brief Description</label>
                <textarea 
                  value={desc} 
                  onChange={e => setDesc(e.target.value)}
                  placeholder="Details about mission objective, target assets, flight paths..." 
                  rows={3}
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
                  Register Project
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
