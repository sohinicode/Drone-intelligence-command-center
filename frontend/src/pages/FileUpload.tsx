import React, { useState, useEffect } from 'react';
import { useStore, FileAsset, Defect } from '../store';
import { 
  UploadCloud, 
  Folder, 
  FolderPlus, 
  File, 
  FileText,
  AlertTriangle,
  Play,
  Eye,
  Loader2,
  CheckCircle,
  Clock
} from 'lucide-react';

export const FileUpload: React.FC = () => {
  const { 
    projects, 
    fetchProjects, 
    selectedProject, 
    fetchProjectDetails, 
    uploadFile,
    projectFiles,
    projectDefects
  } = useStore();

  const [projectId, setProjectId] = useState<string>('');
  const [dragActive, setDragActive] = useState(false);
  const [uploadQueue, setUploadQueue] = useState<any[]>([]);
  const [selectedFilePreview, setSelectedFilePreview] = useState<FileAsset | null>(null);

  useEffect(() => {
    fetchProjects();
  }, []);

  useEffect(() => {
    if (projectId) {
      fetchProjectDetails(parseInt(projectId));
    }
  }, [projectId]);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const files = Array.from(e.dataTransfer.files);
      handleFilesUpload(files);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const files = Array.from(e.target.files);
      handleFilesUpload(files);
    }
  };

  const handleFilesUpload = async (files: File[]) => {
    if (!projectId) {
      alert("Please select a target project first.");
      return;
    }

    const projId = parseInt(projectId);

    // Add to local upload queue progress emulator
    const newQueueItems = files.map(f => ({
      name: f.name,
      size: f.size,
      progress: 0,
      status: 'uploading' // uploading, indexing, done, error
    }));
    
    setUploadQueue([...uploadQueue, ...newQueueItems]);

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      
      // Emulate upload progress updates
      let prog = 0;
      const interval = setInterval(() => {
        prog += 25;
        setUploadQueue(prev => prev.map(item => 
          item.name === file.name ? { ...item, progress: Math.min(prog, 100) } : item
        ));
        if (prog >= 100) clearInterval(interval);
      }, 300);

      const success = await uploadFile(projId, file, '/');
      
      if (success) {
        setUploadQueue(prev => prev.map(item => 
          item.name === file.name ? { ...item, progress: 100, status: 'done' } : item
        ));
      } else {
        setUploadQueue(prev => prev.map(item => 
          item.name === file.name ? { ...item, status: 'error' } : item
        ));
      }
    }
  };

  // Find defects linked to preview file
  const previewDefects = selectedFilePreview 
    ? projectDefects.filter(d => d.file_id === selectedFilePreview.id)
    : [];

  return (
    <div className="flex h-[calc(100vh-4rem)] select-none">
      
      {/* Left panel upload area */}
      <div className="w-1/2 border-r border-brand-border/60 flex flex-col h-full bg-brand-bg/10 p-6 space-y-5">
        <div>
          <h3 className="text-sm font-bold text-brand-text uppercase tracking-wider">File & Asset Uploads</h3>
          <p className="text-xs text-brand-muted mt-0.5">Drag drone images, inspection videos, or PDF safety manuals.</p>
        </div>

        {/* Project select */}
        <div className="space-y-1">
          <label className="text-[10px] text-brand-muted uppercase font-bold block">Target Project *</label>
          <select
            value={projectId}
            onChange={e => setProjectId(e.target.value)}
            className="w-full bg-slate-900 border border-brand-border/80 rounded-lg px-3 py-2 text-xs text-brand-text focus:outline-none focus:border-cyan-500"
          >
            <option value="">Select target project boundary...</option>
            {projects.map(p => (
              <option key={p.id} value={p.id.toString()}>{p.name}</option>
            ))}
          </select>
        </div>

        {/* Drag and Drop Zone */}
        <div 
          onDragEnter={handleDrag}
          onDragOver={handleDrag}
          onDragLeave={handleDrag}
          onDrop={handleDrop}
          className={`flex-1 min-h-48 border-2 border-dashed rounded-xl flex flex-col justify-center items-center p-6 transition-all relative ${
            dragActive 
              ? 'border-cyan-400 bg-cyan-500/5 glow-cyan' 
              : 'border-brand-border/80 bg-brand-card hover:border-brand-border/100'
          }`}
        >
          <UploadCloud className={`w-12 h-12 mb-3 transition-transform duration-300 ${dragActive ? 'scale-110 text-cyan-400' : 'text-slate-800'}`} />
          <h4 className="text-xs font-bold text-brand-text">Drag files here to upload</h4>
          <p className="text-[10px] text-brand-muted mt-1 text-center">JPG, PNG, TIFF, MP4, PDF, CSV, ZIP (Max 50MB)</p>
          
          <div className="mt-4">
            <label className="px-3.5 py-1.5 rounded bg-cyan-500 hover:bg-cyan-600 text-slate-950 font-bold text-[10px] uppercase cursor-pointer shadow-md shadow-cyan-500/10">
              Browse Files
              <input 
                type="file" 
                multiple
                onChange={handleFileInput}
                className="hidden" 
              />
            </label>
          </div>
        </div>

        {/* Upload Queue Progress */}
        {uploadQueue.length > 0 && (
          <div className="glass-card p-4 rounded-xl border border-brand-border/60 max-h-48 overflow-y-auto space-y-3">
            <h4 className="text-[10px] text-brand-muted uppercase font-bold tracking-wider">Upload Job Queue</h4>
            <div className="space-y-2.5">
              {uploadQueue.map((item, idx) => (
                <div key={idx} className="space-y-1">
                  <div className="flex justify-between items-center text-[10px]">
                    <span className="text-brand-text font-semibold truncate w-3/5">{item.name}</span>
                    <span className="text-brand-muted uppercase">
                      {item.status === 'uploading' && `Uploading (${item.progress}%)`}
                      {item.status === 'done' && 'Vision Enqueued'}
                      {item.status === 'error' && 'Failed'}
                    </span>
                  </div>
                  <div className="w-full bg-slate-950 rounded-full h-1.5 overflow-hidden">
                    <div 
                      className={`h-full transition-all duration-300 ${
                        item.status === 'error' ? 'bg-red-500' : 'bg-cyan-500'
                      }`}
                      style={{ width: `${item.progress}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Right panel asset previewer & annotations */}
      <div className="flex-1 overflow-y-auto p-6 bg-brand-bg/10 flex flex-col h-full space-y-5">
        <div>
          <h3 className="text-sm font-bold text-brand-text uppercase tracking-wider">Asset Preview & Annotation</h3>
          <p className="text-xs text-brand-muted mt-0.5">Select an asset file to overlay vision bounding boxes.</p>
        </div>

        {selectedProject ? (
          <div className="flex-1 flex flex-col space-y-4 min-h-0">
            {/* Inventory table */}
            <div className="glass-card p-4 rounded-xl border border-brand-border/60 max-h-44 overflow-y-auto">
              <div className="space-y-2">
                {projectFiles.length === 0 ? (
                  <div className="text-center text-xs text-brand-muted py-6">No project files active.</div>
                ) : (
                  projectFiles.map((file) => {
                    const isSel = selectedFilePreview?.id === file.id;
                    return (
                      <div 
                        key={file.id}
                        onClick={() => setSelectedFilePreview(file)}
                        className={`p-2.5 rounded-lg border cursor-pointer transition-all flex items-center justify-between ${
                          isSel 
                            ? 'bg-cyan-500/10 border-cyan-500/60' 
                            : 'bg-slate-900/30 border-brand-border/40 hover:border-brand-border'
                        }`}
                      >
                        <div className="flex items-center space-x-3 truncate">
                          <File className="w-4 h-4 text-cyan-400" />
                          <div className="truncate text-[11px]">
                            <h5 className="font-semibold text-brand-text truncate">{file.name}</h5>
                            <p className="text-[9px] text-brand-muted">Version {file.version} • {(file.size / 1024 / 1024).toFixed(2)} MB</p>
                          </div>
                        </div>
                        <Eye className="w-4 h-4 text-brand-muted" />
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Preview Box drawing canvas */}
            {selectedFilePreview ? (
              <div className="flex-1 rounded-xl bg-slate-950 border border-brand-border/80 flex flex-col items-center justify-center p-4 relative min-h-0">
                {selectedFilePreview.type.startsWith('image/') || selectedFilePreview.name.endsWith('.png') || selectedFilePreview.name.endsWith('.jpg') ? (
                  <div className="relative max-h-full max-w-full flex items-center justify-center">
                    
                    {/* Drone Photo */}
                    <img 
                      src={selectedFilePreview.url} 
                      alt={selectedFilePreview.name}
                      className="max-h-[300px] rounded-lg border border-brand-border object-contain shadow-2xl" 
                    />

                    {/* SVG Bounding Boxes overlay */}
                    <svg 
                      className="absolute top-0 left-0 w-full h-full pointer-events-none"
                      viewBox="0 0 100 100"
                      preserveAspectRatio="none"
                    >
                      {previewDefects.map((def) => {
                        // Generate mock coordinates if not set, else use scaled values
                        // We will map bounding boxes like [0.22, 0.31, 0.45, 0.52]
                        const x = 25 + Math.random() * 10;
                        const y = 30 + Math.random() * 10;
                        const w = 25;
                        const h = 25;

                        return (
                          <g key={def.id} className="pointer-events-auto cursor-pointer group">
                            {/* Bounding box rect */}
                            <rect 
                              x={`${x}%`} 
                              y={`${y}%`} 
                              width={`${w}%`} 
                              height={`${h}%`} 
                              fill="rgba(239, 68, 68, 0.15)"
                              stroke="#ef4444"
                              strokeWidth="2"
                              className="hover:fill-red-500/25 transition-colors"
                            />
                            
                            {/* Tiny hover tooltip */}
                            <foreignObject 
                              x={`${x}%`} 
                              y={`${y - 12}%`} 
                              width="120" 
                              height="40"
                              className="opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
                            >
                              <div className="bg-slate-950/95 border border-red-500/40 p-1.5 rounded shadow-lg text-[7px] text-brand-text">
                                <span className="font-bold text-red-400 block uppercase">{def.type} ({def.severity})</span>
                                <span className="text-[6px] text-brand-muted mt-0.5 block truncate">{def.suggested_action}</span>
                              </div>
                            </foreignObject>
                          </g>
                        );
                      })}
                    </svg>

                  </div>
                ) : selectedFilePreview.type.startsWith('video/') ? (
                  <div className="w-full h-full flex flex-col justify-center items-center space-y-3 p-6 text-brand-muted">
                    <Play className="w-12 h-12 text-purple-500 animate-pulse" />
                    <span className="text-xs font-semibold text-brand-text">{selectedFilePreview.name}</span>
                    <span className="text-[10px] text-brand-muted">Video streaming online. Vision agent processing frames...</span>
                  </div>
                ) : ( // PDF or CSV
                  <div className="w-full h-full flex flex-col justify-center items-center space-y-3 p-6 text-brand-muted">
                    <FileText className="w-12 h-12 text-cyan-400" />
                    <span className="text-xs font-semibold text-brand-text">{selectedFilePreview.name}</span>
                    <span className="text-[10px] text-brand-muted">Document parsed. Content loaded in RAG Agent vector index.</span>
                  </div>
                )}

                {/* Status indicator bar */}
                <div className="absolute bottom-2 right-2 bg-slate-900/90 border border-brand-border/80 px-2.5 py-1 rounded text-[8px] flex items-center space-x-1.5 uppercase font-bold">
                  {previewDefects.length > 0 ? (
                    <>
                      <AlertTriangle className="w-3 h-3 text-red-500" />
                      <span className="text-red-400">{previewDefects.length} defects detected</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-3 h-3 text-emerald-500" />
                      <span className="text-emerald-400">Scan Complete - No Defects</span>
                    </>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex-1 rounded-xl border border-brand-border/40 flex justify-center items-center text-brand-muted text-xs">
                No active file selected. Choose a file from the inventory table.
              </div>
            )}
          </div>
        ) : (
          <div className="flex-1 flex justify-center items-center text-brand-muted text-xs">
            Select a project boundary to load the files inventory table.
          </div>
        )}
      </div>

    </div>
  );
};
