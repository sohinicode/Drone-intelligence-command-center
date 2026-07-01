import { create } from 'zustand';

// Type definitions
export interface User {
  id: number;
  name: string;
  email: string;
  role: 'Admin' | 'Inspector' | 'Engineer';
  verified: boolean;
  avatar_url?: string;
}

export interface Project {
  id: number;
  name: string;
  company_name: string;
  location: string;
  latitude: number;
  longitude: number;
  inspection_type: string;
  priority: 'Low' | 'Medium' | 'High' | 'Critical';
  description: string;
  status: 'Pending' | 'In_Progress' | 'Completed';
  assigned_members: number[];
  created_at: string;
}

export interface FileAsset {
  id: string;
  project_id: number;
  name: string;
  type: string;
  size: number;
  url: string;
  folder_path: string;
  version: number;
  uploaded_at: string;
}

export interface BoundingBox {
  x_min: number;
  y_min: number;
  x_max: number;
  y_max: number;
}

export interface Defect {
  id: number;
  project_id: number;
  file_id: string;
  type: 'crack' | 'missing_part' | 'vegetation' | 'structural' | 'corrosion';
  severity: 'Low' | 'Medium' | 'High' | 'Critical';
  confidence: number;
  suggested_action: string;
  gps_latitude: number;
  gps_longitude: number;
  status: 'Open' | 'Verifying' | 'Resolved';
  created_at: string;
}

export interface InspectionReport {
  id: number;
  project_id: number;
  name: string;
  summary: string;
  defect_count: number;
  risk_score: number;
  pdf_url: string;
  created_at: string;
}

export interface NotificationAlert {
  id: number;
  title: string;
  message: string;
  type: 'critical_defect' | 'report_generated' | 'project_assigned' | 'deadline';
  is_read: boolean;
  created_at: string;
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'ai' | 'system';
  message: string;
  sources?: string[];
  timestamp: string;
}

interface CommandCenterState {
  // Auth state
  token: string | null;
  user: User | null;
  isAuthenticated: boolean;
  
  // Dashboard & Projects state
  projects: Project[];
  selectedProject: Project | null;
  projectFiles: FileAsset[];
  projectDefects: Defect[];
  projectReports: InspectionReport[];
  notifications: NotificationAlert[];
  chatHistory: ChatMessage[];
  systemLogs: any[];

  // App settings
  activeTab: 'dashboard' | 'projects' | 'map' | 'upload' | 'chat' | 'admin' | 'simulator' | 'scheduler';
  activeRoleView: 'Admin' | 'Inspector' | 'Engineer';
  wsConnected: boolean;

  // Actions
  setToken: (token: string | null) => void;
  setUser: (user: User | null) => void;
  setActiveTab: (tab: 'dashboard' | 'projects' | 'map' | 'upload' | 'chat' | 'admin' | 'simulator' | 'scheduler') => void;
  setRoleView: (role: 'Admin' | 'Inspector' | 'Engineer') => void;
  
  // Async operations
  login: (email: string, password: string) => Promise<boolean>;
  register: (name: string, email: string, password: string, role: string) => Promise<boolean>;
  logout: () => void;
  
  fetchProjects: () => Promise<void>;
  fetchProjectDetails: (id: number) => Promise<void>;
  createProject: (projectData: Partial<Project>) => Promise<boolean>;
  updateProject: (id: number, projectData: Partial<Project>) => Promise<boolean>;
  deleteProject: (id: number) => Promise<boolean>;
  
  uploadFile: (projectId: number, file: File, folderPath?: string) => Promise<boolean>;
  generateReport: (projectId: number, format: 'pdf' | 'csv' | 'excel') => Promise<string | null>;
  queryChat: (question: string) => Promise<void>;
  fetchChatHistory: () => Promise<void>;
  fetchNotifications: () => Promise<void>;
  markNotificationsRead: () => Promise<void>;
  fetchSystemTelemetry: () => Promise<{ health: any; metrics: any; recentActivities: any[] } | null>;
  fetchLogs: () => Promise<void>;
}

// Mock initial local stores for offline-capability
const mockProjects: Project[] = [
  {
    id: 1,
    name: 'Giga Solar Asset Zone A',
    company_name: 'SolarCorp Inc',
    location: 'Bengaluru Outer Ring',
    latitude: 12.9716,
    longitude: 77.5946,
    inspection_type: 'Thermal Solar Inspection',
    priority: 'High',
    description: 'Autonomous flight over Zone A solar panels tracking hot spots and micro-cracks.',
    status: 'In_Progress',
    assigned_members: [2],
    created_at: new Date().toISOString()
  },
  {
    id: 2,
    name: 'Wind Farm Turbine Inspection',
    company_name: 'AeroWind Energy',
    location: 'Chitradurga Hills',
    latitude: 14.2251,
    longitude: 76.3986,
    inspection_type: 'Structural Blade Defect',
    priority: 'Critical',
    description: 'Blade inspection via drone photography for wind turbines. Crack detection required.',
    status: 'Pending',
    assigned_members: [2, 3],
    created_at: new Date().toISOString()
  }
];

const mockDefects: Defect[] = [
  {
    id: 1,
    project_id: 1,
    file_id: 'file_1',
    type: 'crack',
    severity: 'High',
    confidence: 0.92,
    suggested_action: 'Replace solar cell module in Row 4 Col 12',
    gps_latitude: 12.9720,
    gps_longitude: 77.5950,
    status: 'Open',
    created_at: new Date().toISOString()
  },
  {
    id: 2,
    project_id: 2,
    file_id: 'file_2',
    type: 'corrosion',
    severity: 'Critical',
    confidence: 0.88,
    suggested_action: 'Apply anti-corrosion coating to turbine base node 3B',
    gps_latitude: 14.2255,
    gps_longitude: 76.3990,
    status: 'Open',
    created_at: new Date().toISOString()
  }
];

export const useStore = create<CommandCenterState>((set, get) => ({
  token: localStorage.getItem('token'),
  user: JSON.parse(localStorage.getItem('user') || 'null'),
  isAuthenticated: !!localStorage.getItem('token'),
  
  projects: [],
  selectedProject: null,
  projectFiles: [],
  projectDefects: [],
  projectReports: [],
  notifications: [],
  chatHistory: [
    { id: '1', sender: 'ai', message: 'Hello! I am your RAG Drone AI Assistant. Ask me anything about defects, inspection files, or safety regulations.', timestamp: new Date().toISOString() }
  ],
  systemLogs: [],

  activeTab: 'dashboard',
  activeRoleView: 'Admin',
  wsConnected: false,

  setToken: (token) => {
    if (token) localStorage.setItem('token', token);
    else localStorage.removeItem('token');
    set({ token, isAuthenticated: !!token });
  },

  setUser: (user) => {
    if (user) {
      localStorage.setItem('user', JSON.stringify(user));
      set({ user, activeRoleView: user.role });
    } else {
      localStorage.removeItem('user');
      set({ user });
    }
  },

  setActiveTab: (activeTab) => set({ activeTab }),
  setRoleView: (activeRoleView) => set({ activeRoleView }),

  login: async (email, password) => {
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await response.json();
      
      if (!response.ok) throw new Error(data.error);

      get().setToken(data.accessToken);
      get().setUser(data.user);
      return true;
    } catch (err: any) {
      console.warn(`API Login failed: ${err.message}. Running in Mock Fallback Mode.`);
      
      // Standalone validation
      let role: 'Admin' | 'Inspector' | 'Engineer' = 'Engineer';
      if (email.includes('admin')) role = 'Admin';
      else if (email.includes('inspector')) role = 'Inspector';

      const mockUser: User = {
        id: email.includes('admin') ? 1 : email.includes('inspector') ? 2 : 3,
        name: email.includes('admin') ? 'Mock Admin' : email.includes('inspector') ? 'Mock Inspector' : 'Mock Engineer',
        email,
        role,
        verified: true,
        avatar_url: ''
      };

      get().setToken('mock_jwt_token_xyz');
      get().setUser(mockUser);
      return true;
    }
  },

  register: async (name, email, password, role) => {
    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password, role })
      });
      return response.ok;
    } catch (err) {
      console.warn('API Register failed. Local mock success.');
      return true;
    }
  },

  logout: () => {
    get().setToken(null);
    get().setUser(null);
    set({
      projects: [],
      selectedProject: null,
      projectFiles: [],
      projectDefects: [],
      projectReports: [],
      chatHistory: [
        { id: '1', sender: 'ai', message: 'Hello! I am your RAG Drone AI Assistant. Ask me anything about defects, inspection files, or safety regulations.', timestamp: new Date().toISOString() }
      ]
    });
  },

  fetchProjects: async () => {
    try {
      const res = await fetch('/api/projects', {
        headers: { 'Authorization': `Bearer ${get().token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Fetch failed');
      set({ projects: data.projects || [] });
    } catch (err) {
      console.warn('API Projects fetch failed, loading mocks.');
      set({ projects: mockProjects });
    }
  },

  fetchProjectDetails: async (id) => {
    try {
      const res = await fetch(`/api/projects/${id}`, {
        headers: { 'Authorization': `Bearer ${get().token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Fetch failed');
      set({
        selectedProject: data.project,
        projectFiles: data.files || [],
        projectDefects: data.defects || []
      });

      // Also get reports
      const reportsRes = await fetch(`/api/reports/project/${id}`, {
        headers: { 'Authorization': `Bearer ${get().token}` }
      });
      const reportsData = await reportsRes.json();
      set({ projectReports: reportsData.reports || [] });
    } catch (err) {
      console.warn(`API Project Details fetch failed for ID: ${id}. Loading mocks.`);
      const proj = get().projects.find(p => p.id === id) || mockProjects.find(p => p.id === id) || null;
      const files = get().projectFiles.length > 0 ? get().projectFiles : [
        { id: 'file_1', project_id: id, name: 'turbine_blade_crack.png', type: 'image/png', size: 1048576, url: 'https://images.unsplash.com/photo-1508791172828-3d60970c1158?w=800', folder_path: '/', version: 1, uploaded_at: new Date().toISOString() },
        { id: 'file_2', project_id: id, name: 'substation_corrosion.png', type: 'image/png', size: 2048576, url: 'https://images.unsplash.com/photo-1473872170063-eb9148425511?w=800', folder_path: '/', version: 1, uploaded_at: new Date().toISOString() }
      ];
      const defects = mockDefects.filter(d => d.project_id === id);

      set({
        selectedProject: proj,
        projectFiles: files,
        projectDefects: defects,
        projectReports: []
      });
    }
  },

  createProject: async (projectData) => {
    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${get().token}`
        },
        body: JSON.stringify(projectData)
      });
      if (res.ok) {
        get().fetchProjects();
        return true;
      }
      return false;
    } catch (err) {
      console.warn('API Project Create failed. Running local mock creation.');
      const newProj: Project = {
        id: get().projects.length + 1,
        name: projectData.name || 'Untitled Project',
        company_name: projectData.company_name || 'Generic Co',
        location: projectData.location || 'Local Coordinates',
        latitude: projectData.latitude || 12.9716,
        longitude: projectData.longitude || 77.5946,
        inspection_type: projectData.inspection_type || 'General Inspect',
        priority: projectData.priority || 'Medium',
        description: projectData.description || '',
        status: 'Pending',
        assigned_members: projectData.assigned_members || [],
        created_at: new Date().toISOString()
      };
      set({ projects: [newProj, ...get().projects] });
      return true;
    }
  },

  updateProject: async (id, projectData) => {
    try {
      const res = await fetch(`/api/projects/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${get().token}`
        },
        body: JSON.stringify(projectData)
      });
      if (res.ok) {
        get().fetchProjectDetails(id);
        return true;
      }
      return false;
    } catch (err) {
      const updated = get().projects.map(p => p.id === id ? { ...p, ...projectData } as Project : p);
      set({ projects: updated });
      if (get().selectedProject?.id === id) {
        set({ selectedProject: { ...get().selectedProject, ...projectData } as Project });
      }
      return true;
    }
  },

  deleteProject: async (id) => {
    try {
      const res = await fetch(`/api/projects/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${get().token}` }
      });
      if (res.ok) {
        get().fetchProjects();
        return true;
      }
      return false;
    } catch (err) {
      set({ projects: get().projects.filter(p => p.id !== id) });
      return true;
    }
  },

  uploadFile: async (projectId, file, folderPath = '/') => {
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('projectId', projectId.toString());
      formData.append('folderPath', folderPath);

      const res = await fetch('/api/upload', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${get().token}` },
        body: formData
      });
      if (res.ok) {
        get().fetchProjectDetails(projectId);
        return true;
      }
      return false;
    } catch (err) {
      console.warn('API Upload failed. Adding mock file to store.');
      const mockFile: FileAsset = {
        id: 'file_' + Math.random().toString(36).substr(2, 9),
        project_id: projectId,
        name: file.name,
        type: file.type || 'image/png',
        size: file.size,
        url: URL.createObjectURL(file),
        folder_path: folderPath,
        version: 1,
        uploaded_at: new Date().toISOString()
      };
      set({ projectFiles: [mockFile, ...get().projectFiles] });

      // Simulate AI Vision Agent for images
      if (file.type.startsWith('image/')) {
        setTimeout(() => {
          const mockNewDefect: Defect = {
            id: mockDefects.length + get().projectDefects.length + 1,
            project_id: projectId,
            file_id: mockFile.id,
            type: file.name.toLowerCase().includes('solar') ? 'crack' : 'structural',
            severity: 'High',
            confidence: 0.93,
            suggested_action: 'Simulated review: Check structural joint integrity.',
            gps_latitude: 12.9716 + (Math.random() - 0.5) * 0.002,
            gps_longitude: 77.5946 + (Math.random() - 0.5) * 0.002,
            status: 'Open',
            created_at: new Date().toISOString()
          };

          set({ projectDefects: [mockNewDefect, ...get().projectDefects] });
          
          // Trigger mock notification
          const newAlert: NotificationAlert = {
            id: Date.now(),
            title: 'AI Analysis Complete',
            message: `Vision Agent detected 1 defect on ${file.name}.`,
            type: 'critical_defect',
            is_read: false,
            created_at: new Date().toISOString()
          };
          set({ notifications: [newAlert, ...get().notifications] });
        }, 3000);
      }

      return true;
    }
  },

  generateReport: async (projectId, format) => {
    try {
      const res = await fetch('/api/reports/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${get().token}`
        },
        body: JSON.stringify({ projectId, format })
      });
      const data = await res.json();
      if (res.ok) {
        get().fetchProjectDetails(projectId);
        return data.downloadUrl;
      }
      return null;
    } catch (err) {
      console.warn('API Report Generation failed. Rendering mock download URL.');
      
      // Return a simulated text URL blob
      const proj = get().projects.find(p => p.id === projectId);
      const csvStr = `Report for project ${proj?.name}\nTotal Defects: ${get().projectDefects.length}\nDate: ${new Date().toLocaleDateString()}`;
      const blob = new Blob([csvStr], { type: 'text/csv' });
      const downloadUrl = URL.createObjectURL(blob);
      
      const newReport: InspectionReport = {
        id: Date.now(),
        project_id: projectId,
        name: `${proj?.name} Summary Report`,
        summary: `Compiled report for ${get().projectDefects.length} defects in ${format} format.`,
        defect_count: get().projectDefects.length,
        risk_score: 75,
        pdf_url: downloadUrl,
        created_at: new Date().toISOString()
      };
      
      set({ projectReports: [newReport, ...get().projectReports] });
      return downloadUrl;
    }
  },

  queryChat: async (question) => {
    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      sender: 'user',
      message: question,
      timestamp: new Date().toISOString()
    };

    set({ chatHistory: [...get().chatHistory, userMsg] });

    try {
      const res = await fetch('/api/chat/query', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${get().token}`
        },
        body: JSON.stringify({ question })
      });
      const data = await res.json();
      
      const aiMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        sender: 'ai',
        message: data.answer,
        sources: data.sources,
        timestamp: new Date().toISOString()
      };
      set({ chatHistory: [...get().chatHistory, aiMsg] });
    } catch (err) {
      // Mock chat completion
      setTimeout(() => {
        let answer = '';
        const qLower = question.toLowerCase();
        
        if (qLower.includes('critical') || qLower.includes('severe')) {
          answer = `Our sensors have logged **1 Critical defect** at the AeroWind Wind Farm (Turbine Blade structural crack). The AI model estimates an 88% confidence rate, and recommends scheduling a repair team with epoxy-resin vacuum infusion kits within 48 hours.`;
        } else if (qLower.includes('solar') || qLower.includes('bengaluru')) {
          answer = `The Giga Solar Asset Zone A in Bengaluru lists **1 High severity crack** in solar cell Row 4. The thermal cameras indicate hotspots. Maintenance action recommends panel replacement.`;
        } else if (qLower.includes('remedy') || qLower.includes('fix') || qLower.includes('action')) {
          answer = `### Current Remedy Log:\n1. **Blade crack**: Vacuum infusion of epoxy resin.\n2. **Conductor corrosion**: Wire brush cleaning + coating.\n3. **Vegetation**: Radical ground trimming and pruning.`;
        } else {
          answer = `I scanned our document base regarding "${question}". According to the *Industrial Drone Asset Guide (2026)*, operations must check mechanical defects immediately if thermal hot spots exceed 65°C under nominal solar radiation.`;
        }

        const aiMsg: ChatMessage = {
          id: (Date.now() + 1).toString(),
          sender: 'ai',
          message: answer,
          sources: ['DICC_Asset_Inspection_Guide_2026.pdf (Page 3)'],
          timestamp: new Date().toISOString()
        };
        set({ chatHistory: [...get().chatHistory, aiMsg] });
      }, 1000);
    }
  },

  fetchChatHistory: async () => {
    try {
      const res = await fetch('/api/chat/history', {
        headers: { 'Authorization': `Bearer ${get().token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Fetch failed');
      if (data && data.history && data.history.length > 0) {
        set({ chatHistory: data.history });
      }
    } catch (err) {
      console.warn('API Chat history fetch failed.');
    }
  },

  fetchNotifications: async () => {
    try {
      const res = await fetch('/api/notifications', {
        headers: { 'Authorization': `Bearer ${get().token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Fetch failed');
      set({ notifications: data.notifications || [] });
    } catch (err) {
      // Default alerts
      set({
        notifications: [
          { id: 1, title: 'Critical Defect Flagged', message: 'A critical structural blade crack was flagged at chitradurga wind farm.', type: 'critical_defect', is_read: false, created_at: new Date().toISOString() },
          { id: 2, title: 'New Report Generated', message: 'Inspector compiled Solar inspection excel sheet.', type: 'report_generated', is_read: true, created_at: new Date().toISOString() }
        ]
      });
    }
  },

  markNotificationsRead: async () => {
    try {
      await fetch('/api/notifications/mark-read', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${get().token}` }
      });
      get().fetchNotifications();
    } catch (err) {
      const read = get().notifications.map(n => ({ ...n, is_read: true }));
      set({ notifications: read });
    }
  },

  fetchSystemTelemetry: async () => {
    try {
      const res = await fetch('/api/admin/stats', {
        headers: { 'Authorization': `Bearer ${get().token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error('Fetch telemetry failed');
      return data;
    } catch (err) {
      return {
        health: {
          uptime: 3600,
          postgres: 'Connected (Fallback Simulated)',
          redis: 'Connected (Fallback Simulated)',
          mongodb: 'Connected (Fallback Simulated)',
          memory: { rss: '94 MB', heapTotal: '55 MB', heapUsed: '32 MB' }
        },
        metrics: {
          totalUsers: 3,
          totalProjects: get().projects.length || 2,
          totalDefects: get().projectDefects.length || 2,
          totalReports: get().projectReports.length || 0
        },
        recentActivities: [
          { id: 1, user_name: 'Inspector User', user_email: 'inspector@dicc.com', action: 'Upload File', details: 'Uploaded panel_4.jpg to project 1', timestamp: new Date().toISOString() },
          { id: 2, user_name: 'Admin User', user_email: 'admin@dicc.com', action: 'Login', details: 'User logged in', timestamp: new Date().toISOString() }
        ]
      };
    }
  },

  fetchLogs: async () => {
    try {
      const res = await fetch('/api/admin/logs', {
        headers: { 'Authorization': `Bearer ${get().token}` }
      });
      const data = await res.json();
      set({ systemLogs: data.logs });
    } catch (err) {
      set({
        systemLogs: [
          { message: 'System boot sequence initialised...', timestamp: new Date().toISOString() },
          { message: 'Databases fallback activated. Running on local mock configuration.', timestamp: new Date().toISOString() },
          { message: 'Express API Server running on port 5000.', timestamp: new Date().toISOString() }
        ]
      });
    }
  }
}));
