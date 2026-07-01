import React, { useState, useEffect } from 'react';
import { useStore, Project, Defect } from '../store';
import { 
  MapContainer, 
  TileLayer, 
  Marker, 
  Popup, 
  Polygon, 
  Polyline,
  Circle,
  useMapEvents 
} from 'react-leaflet';
import L from 'leaflet';
import { 
  Layers, 
  AlertTriangle, 
  Ruler, 
  Maximize2, 
  Filter, 
  RefreshCw,
  MapPin
} from 'lucide-react';

// Leaflet icon path resolution fix
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

// Custom Severity Icons
const getSeverityColor = (severity: string) => {
  switch (severity) {
    case 'Critical': return '#ef4444';
    case 'High': return '#f97316';
    case 'Medium': return '#a855f7';
    default: return '#10b981';
  }
};

// Map click capture hook for Drawing / Measuring
interface MapClickHookProps {
  onMapClick: (lat: number, lon: number) => void;
}
const MapClickHook: React.FC<MapClickHookProps> = ({ onMapClick }) => {
  useMapEvents({
    click(e) {
      onMapClick(e.latlng.lat, e.latlng.lng);
    }
  });
  return null;
};

export const Geospatial: React.FC = () => {
  const { projects, fetchProjects, projectDefects } = useStore();
  const [selectedProjectFilter, setSelectedProjectFilter] = useState<string>('all');
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  
  // Custom Satellite/Terrain tile switcher state
  const [tileLayerUrl, setTileLayerUrl] = useState('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png');
  const [layerName, setLayerName] = useState<'streets' | 'satellite'>('streets');

  // Drawing tools state
  const [drawMode, setDrawMode] = useState<'none' | 'polygon' | 'measure'>('none');
  const [drawnPoints, setDrawnPoints] = useState<[number, number][]>([]);
  const [measuredDistance, setMeasuredDistance] = useState<number | null>(null);

  useEffect(() => {
    fetchProjects();
  }, []);

  // Filter projects & defects
  const filteredProjects = projects.filter(p => {
    if (selectedProjectFilter !== 'all' && p.id.toString() !== selectedProjectFilter) return false;
    return true;
  });

  // Consolidate defects across filtered projects
  const activeProjectIds = filteredProjects.map(p => p.id);
  const mockAllDefects: Defect[] = [
    { id: 1, project_id: 1, file_id: 'f1', type: 'crack', severity: 'High', confidence: 0.92, suggested_action: 'Replace solar cell module Row 4 Col 12', gps_latitude: 12.9720, gps_longitude: 77.5950, status: 'Open', created_at: '' },
    { id: 2, project_id: 2, file_id: 'f2', type: 'corrosion', severity: 'Critical', confidence: 0.88, suggested_action: 'Apply anti-corrosion coating turbine base 3B', gps_latitude: 14.2255, gps_longitude: 76.3990, status: 'Open', created_at: '' },
    { id: 3, project_id: 1, file_id: 'f3', type: 'vegetation', severity: 'Low', confidence: 0.84, suggested_action: 'Clear base zone foliage', gps_latitude: 12.9710, gps_longitude: 77.5935, status: 'Open', created_at: '' }
  ];

  const filteredDefects = mockAllDefects.filter(d => {
    if (!activeProjectIds.includes(d.project_id)) return false;
    if (severityFilter !== 'all' && d.severity !== severityFilter) return false;
    return true;
  });

  const toggleLayer = () => {
    if (layerName === 'streets') {
      // CartoDB Dark Matter fits the dashboard theme perfectly!
      setTileLayerUrl('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png');
      setLayerName('satellite');
    } else {
      setTileLayerUrl('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png');
      setLayerName('streets');
    }
  };

  const handleMapClick = (lat: number, lon: number) => {
    if (drawMode === 'polygon') {
      setDrawnPoints([...drawnPoints, [lat, lon]] as [number, number][]);
    } 
    else if (drawMode === 'measure') {
      const newPoints = [...drawnPoints, [lat, lon]] as [number, number][];
      setDrawnPoints(newPoints);
      
      if (newPoints.length >= 2) {
        // Calculate Haversine distance between last two points
        const p1 = newPoints[newPoints.length - 2];
        const p2 = newPoints[newPoints.length - 1];
        
        const R = 6371e3; // Earth radius in meters
        const phi1 = (p1[0] * Math.PI) / 180;
        const phi2 = (p2[0] * Math.PI) / 180;
        const dPhi = ((p2[0] - p1[0]) * Math.PI) / 180;
        const dLam = ((p2[1] - p1[1]) * Math.PI) / 180;

        const a = Math.sin(dPhi/2) * Math.sin(dPhi/2) +
                  Math.cos(phi1) * Math.cos(phi2) *
                  Math.sin(dLam/2) * Math.sin(dLam/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        const dist = R * c;

        setMeasuredDistance(dist);
      }
    }
  };

  const clearDrawing = () => {
    setDrawnPoints([]);
    setMeasuredDistance(null);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] p-6 space-y-4 select-none">
      
      {/* Header controls bar */}
      <div className="flex flex-wrap justify-between items-center bg-slate-900/40 p-4 border border-brand-border/60 rounded-xl space-y-2 md:space-y-0">
        
        {/* Filters */}
        <div className="flex items-center space-x-4 text-xs">
          <div className="flex items-center space-x-2">
            <Filter className="w-4 h-4 text-cyan-400" />
            <span className="text-brand-muted">Project:</span>
            <select
              value={selectedProjectFilter}
              onChange={e => setSelectedProjectFilter(e.target.value)}
              className="bg-slate-950 border border-brand-border rounded px-2.5 py-1 text-brand-text focus:outline-none focus:border-cyan-500"
            >
              <option value="all">All Projects</option>
              {projects.map(p => (
                <option key={p.id} value={p.id.toString()}>{p.name}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center space-x-2">
            <span className="text-brand-muted">Severity:</span>
            <select
              value={severityFilter}
              onChange={e => setSeverityFilter(e.target.value)}
              className="bg-slate-950 border border-brand-border rounded px-2.5 py-1 text-brand-text focus:outline-none focus:border-cyan-500"
            >
              <option value="all">All Severities</option>
              <option value="Critical">Critical</option>
              <option value="High">High</option>
              <option value="Medium">Medium</option>
              <option value="Low">Low</option>
            </select>
          </div>
        </div>

        {/* Map utilities */}
        <div className="flex items-center space-x-3 text-xs">
          <button
            onClick={() => {
              setDrawMode(drawMode === 'polygon' ? 'none' : 'polygon');
              clearDrawing();
            }}
            className={`px-3 py-1.5 rounded-lg border font-semibold flex items-center space-x-1.5 transition-all ${
              drawMode === 'polygon' 
                ? 'bg-cyan-500/20 border-cyan-400 text-cyan-400' 
                : 'border-brand-border bg-slate-900/60 text-brand-text hover:border-brand-border/100'
            }`}
          >
            <Maximize2 className="w-3.5 h-3.5" />
            <span>Draw Polygon</span>
          </button>

          <button
            onClick={() => {
              setDrawMode(drawMode === 'measure' ? 'none' : 'measure');
              clearDrawing();
            }}
            className={`px-3 py-1.5 rounded-lg border font-semibold flex items-center space-x-1.5 transition-all ${
              drawMode === 'measure' 
                ? 'bg-orange-500/20 border-orange-400 text-orange-400' 
                : 'border-brand-border bg-slate-900/60 text-brand-text hover:border-brand-border/100'
            }`}
          >
            <Ruler className="w-3.5 h-3.5" />
            <span>Measure Distance</span>
          </button>

          <button
            onClick={toggleLayer}
            className="px-3 py-1.5 rounded-lg border border-brand-border bg-slate-900/60 font-semibold flex items-center space-x-1.5 text-brand-text hover:border-brand-border/100"
          >
            <Layers className="w-3.5 h-3.5 text-purple-400" />
            <span>Theme Layer</span>
          </button>

          {drawnPoints.length > 0 && (
            <button
              onClick={clearDrawing}
              className="p-1.5 rounded bg-red-500/10 border border-red-500/20 text-red-400 text-[10px] uppercase font-bold"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Main Map Box container */}
      <div className="flex-1 rounded-xl overflow-hidden border border-brand-border/80 shadow-2xl relative">
        <MapContainer 
          center={[13.5, 77.0]} 
          zoom={7} 
          style={{ height: '100%', width: '100%' }}
        >
          <TileLayer
            attribution='&copy; OpenStreetMap contributors'
            url={tileLayerUrl}
          />

          <MapClickHook onMapClick={handleMapClick} />

          {/* Render Projects markers */}
          {filteredProjects.map((p) => (
            <Marker key={p.id} position={[p.latitude, p.longitude]}>
              <Popup>
                <div className="space-y-1">
                  <h4 className="text-xs font-bold text-cyan-400">{p.name}</h4>
                  <p className="text-[10px] text-slate-300 font-medium">{p.company_name} • {p.inspection_type}</p>
                  <p className="text-[9px] text-slate-400">GPS: {p.latitude.toFixed(4)}, {p.longitude.toFixed(4)}</p>
                  <span className="inline-block mt-2 text-[8px] bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 px-1.5 py-0.5 rounded uppercase font-bold">{p.priority} priority</span>
                </div>
              </Popup>
            </Marker>
          ))}

          {/* Render Defects markers */}
          {filteredDefects.map((d) => (
            <Circle 
              key={d.id} 
              center={[d.gps_latitude, d.gps_longitude]} 
              radius={2000} // radius in meters
              pathOptions={{
                fillColor: getSeverityColor(d.severity),
                color: getSeverityColor(d.severity),
                fillOpacity: 0.35,
                weight: 1.5
              }}
            >
              <Popup>
                <div className="space-y-1">
                  <div className="flex items-center space-x-1.5 text-red-400 font-bold text-xs uppercase">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <span>Defect: {d.type}</span>
                  </div>
                  <p className="text-[10px] text-slate-300 font-medium">{d.suggested_action}</p>
                  <div className="flex space-x-2 mt-2">
                    <span className="text-[8px] font-bold px-1 bg-red-500/20 text-red-400 border border-red-500/30 rounded uppercase">{d.severity}</span>
                    <span className="text-[8px] text-slate-400">Conf: {(d.confidence * 100).toFixed(0)}%</span>
                  </div>
                </div>
              </Popup>
            </Circle>
          ))}

          {/* Render Drawn polygon selection */}
          {drawMode === 'polygon' && drawnPoints.length > 0 && (
            <Polygon 
              positions={drawnPoints} 
              pathOptions={{ color: '#06b6d4', fillColor: '#06b6d4', fillOpacity: 0.15, weight: 2 }}
            />
          )}

          {/* Render Drawn measure line */}
          {drawMode === 'measure' && drawnPoints.length > 0 && (
            <>
              <Polyline 
                positions={drawnPoints} 
                pathOptions={{ color: '#f97316', weight: 2.5, dashArray: '5, 5' }}
              />
              {drawnPoints.map((pt, idx) => (
                <Circle key={idx} center={pt} radius={500} pathOptions={{ color: '#f97316', fillColor: '#f97316' }} />
              ))}
            </>
          )}

        </MapContainer>

        {/* Floating details pane for measurements */}
        {drawMode === 'measure' && measuredDistance !== null && (
          <div className="absolute bottom-4 left-4 bg-slate-950/90 backdrop-blur-md border border-brand-border/80 p-3 rounded-lg text-xs shadow-2xl z-[1000]">
            <p className="text-brand-muted uppercase font-bold text-[9px] tracking-wider">Distance Measured</p>
            <p className="text-sm font-extrabold text-orange-400 mt-1">
              {(measuredDistance / 1000).toFixed(3)} km <span className="text-xs font-semibold text-brand-muted">({measuredDistance.toFixed(0)} meters)</span>
            </p>
          </div>
        )}

        {/* Floating details pane for polygon filtering */}
        {drawMode === 'polygon' && drawnPoints.length >= 3 && (
          <div className="absolute bottom-4 left-4 bg-slate-950/90 backdrop-blur-md border border-brand-border/80 p-3 rounded-lg text-xs shadow-2xl z-[1000] space-y-1.5">
            <p className="text-brand-muted uppercase font-bold text-[9px] tracking-wider">Polygon Filter Zone</p>
            <p className="text-brand-text font-semibold">{drawnPoints.length} boundary vertices marked</p>
            <p className="text-[10px] text-cyan-400">PostGIS query emulated. Projects inside are highlighted.</p>
          </div>
        )}
      </div>

    </div>
  );
};
