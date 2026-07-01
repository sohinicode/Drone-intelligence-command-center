import { Router, Response } from 'express';
import { isPostgresConnected, pgPool, mockDb, logger } from '../config/db';
import { authenticateJWT, AuthenticatedRequest, authorizeRoles } from '../middlewares/auth';

const router = Router();

// ==========================================
// Geospatial Helpers (Haversine & Ray-Cast)
// ==========================================

// Calculate distance in meters using Haversine formula
const getHaversineDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const R = 6371e3; // Earth radius in meters
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) *
    Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // in meters
};

// Check if a point is inside a polygon using Ray-Casting (PnPoly)
const isPointInPolygon = (lat: number, lon: number, polygon: [number, number][]): boolean => {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i][0], yi = polygon[i][1];
    const xj = polygon[j][0], yj = polygon[j][1];

    const intersect = ((yi > lat) !== (yj > lat)) &&
      (lon < ((xj - xi) * (lat - yi)) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
};

// ==========================================
// REST APIs for Projects
// ==========================================

// Get all projects
router.get('/', authenticateJWT, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (isPostgresConnected && pgPool) {
      const result = await pgPool.query('SELECT * FROM projects ORDER BY created_at DESC');
      return res.json({ projects: result.rows });
    } else {
      return res.json({ projects: mockDb.projects });
    }
  } catch (err: any) {
    logger.error(`Error fetching projects: ${err.message}`);
    return res.status(500).json({ error: 'Server error fetching projects' });
  }
});

// Get single project
router.get('/:id', authenticateJWT, async (req: AuthenticatedRequest, res: Response) => {
  const projectId = parseInt(req.params.id);
  if (isNaN(projectId)) return res.status(400).json({ error: 'Invalid project ID' });

  try {
    let project: any = null;
    let files: any[] = [];
    let defects: any[] = [];

    if (isPostgresConnected && pgPool) {
      const projRes = await pgPool.query('SELECT * FROM projects WHERE id = $1', [projectId]);
      if (projRes.rows.length > 0) {
        project = projRes.rows[0];
        const filesRes = await pgPool.query('SELECT * FROM files WHERE project_id = $1', [projectId]);
        files = filesRes.rows;
        const defectsRes = await pgPool.query('SELECT * FROM defects WHERE project_id = $1', [projectId]);
        defects = defectsRes.rows;
      }
    } else {
      project = mockDb.projects.find(p => p.id === projectId);
      if (project) {
        files = mockDb.files.filter(f => f.project_id === projectId);
        defects = mockDb.defects.filter(d => d.project_id === projectId);
      }
    }

    if (!project) return res.status(404).json({ error: 'Project not found' });
    return res.json({ project, files, defects });
  } catch (err: any) {
    logger.error(`Error fetching project details: ${err.message}`);
    return res.status(500).json({ error: 'Server error fetching project details' });
  }
});

// Create project (Admin and Inspector only)
router.post('/', authenticateJWT, authorizeRoles('Admin', 'Inspector'), async (req: AuthenticatedRequest, res: Response) => {
  const { name, company_name, location, latitude, longitude, inspection_type, priority, description, assigned_members } = req.body;

  if (!name || !company_name || !location) {
    return res.status(400).json({ error: 'Missing required parameters: name, company_name, location' });
  }

  const lat = latitude ? parseFloat(latitude) : 0;
  const lon = longitude ? parseFloat(longitude) : 0;
  const members = Array.isArray(assigned_members) ? assigned_members.map((m: any) => parseInt(m)) : [];

  try {
    if (isPostgresConnected && pgPool) {
      const geomText = `POINT(${lon} ${lat})`;
      const result = await pgPool.query(
        `INSERT INTO projects (name, company_name, location, latitude, longitude, geom, inspection_type, priority, description, assigned_members)
         VALUES ($1, $2, $3, $4, $5, ST_GeomFromText($6, 4326), $7, $8, $9, $10)
         RETURNING *`,
        [name, company_name, location, lat, lon, geomText, inspection_type || 'Standard', priority || 'Medium', description || '', members]
      );
      
      // Log activity
      await pgPool.query('INSERT INTO activities (user_id, action, details) VALUES ($1, $2, $3)', [
        req.user?.id,
        'Create Project',
        `Project ${name} created`
      ]);

      return res.status(201).json({ message: 'Project created successfully', project: result.rows[0] });
    } else {
      const newProject = {
        id: mockDb.projects.length + 1,
        name,
        company_name,
        location,
        latitude: lat,
        longitude: lon,
        inspection_type: inspection_type || 'Standard',
        priority: priority || 'Medium',
        description: description || '',
        status: 'Pending',
        assigned_members: members,
        created_at: new Date()
      };

      mockDb.projects.push(newProject);
      
      mockDb.activities.push({
        id: mockDb.activities.length + 1,
        user_id: req.user?.id || 1,
        action: 'Create Project',
        details: `Project ${name} created (Fallback Database)`,
        timestamp: new Date()
      });

      return res.status(201).json({ message: 'Project created successfully (Fallback)', project: newProject });
    }
  } catch (err: any) {
    logger.error(`Error creating project: ${err.message}`);
    return res.status(500).json({ error: 'Server error creating project' });
  }
});

// Update project (Admin and Inspector)
router.put('/:id', authenticateJWT, authorizeRoles('Admin', 'Inspector'), async (req: AuthenticatedRequest, res: Response) => {
  const projectId = parseInt(req.params.id);
  const { name, company_name, location, latitude, longitude, inspection_type, priority, description, status, assigned_members } = req.body;

  if (isNaN(projectId)) return res.status(400).json({ error: 'Invalid project ID' });

  try {
    if (isPostgresConnected && pgPool) {
      const geomText = `POINT(${longitude} ${latitude})`;
      const result = await pgPool.query(
        `UPDATE projects 
         SET name = $1, company_name = $2, location = $3, latitude = $4, longitude = $5, geom = ST_GeomFromText($6, 4326), 
             inspection_type = $7, priority = $8, description = $9, status = $10, assigned_members = $11
         WHERE id = $12 RETURNING *`,
        [name, company_name, location, latitude, longitude, geomText, inspection_type, priority, description, status, assigned_members, projectId]
      );
      if (result.rows.length === 0) return res.status(404).json({ error: 'Project not found' });
      return res.json({ message: 'Project updated', project: result.rows[0] });
    } else {
      const project = mockDb.projects.find(p => p.id === projectId);
      if (!project) return res.status(404).json({ error: 'Project not found' });

      project.name = name ?? project.name;
      project.company_name = company_name ?? project.company_name;
      project.location = location ?? project.location;
      project.latitude = latitude ? parseFloat(latitude) : project.latitude;
      project.longitude = longitude ? parseFloat(longitude) : project.longitude;
      project.inspection_type = inspection_type ?? project.inspection_type;
      project.priority = priority ?? project.priority;
      project.description = description ?? project.description;
      project.status = status ?? project.status;
      project.assigned_members = assigned_members ?? project.assigned_members;

      return res.json({ message: 'Project updated (Fallback)', project });
    }
  } catch (err: any) {
    logger.error(`Error updating project: ${err.message}`);
    return res.status(500).json({ error: 'Server error updating project' });
  }
});

// Delete project (Admin only)
router.delete('/:id', authenticateJWT, authorizeRoles('Admin'), async (req: AuthenticatedRequest, res: Response) => {
  const projectId = parseInt(req.params.id);
  if (isNaN(projectId)) return res.status(400).json({ error: 'Invalid project ID' });

  try {
    if (isPostgresConnected && pgPool) {
      const result = await pgPool.query('DELETE FROM projects WHERE id = $1 RETURNING id', [projectId]);
      if (result.rows.length === 0) return res.status(404).json({ error: 'Project not found' });
    } else {
      const index = mockDb.projects.findIndex(p => p.id === projectId);
      if (index === -1) return res.status(404).json({ error: 'Project not found' });
      mockDb.projects.splice(index, 1);
    }
    return res.json({ message: 'Project deleted successfully' });
  } catch (err: any) {
    logger.error(`Error deleting project: ${err.message}`);
    return res.status(500).json({ error: 'Server error deleting project' });
  }
});

// ==========================================
// Geospatial PostGIS & TS Fallback Endpoints
// ==========================================

// 1. Find defects within radius (e.g. 5km)
router.get('/geo/defects-nearby', authenticateJWT, async (req: AuthenticatedRequest, res: Response) => {
  const { latitude, longitude, radiusMeters } = req.query;

  if (!latitude || !longitude) {
    return res.status(400).json({ error: 'Missing coordinates: latitude, longitude' });
  }

  const lat = parseFloat(latitude as string);
  const lon = parseFloat(longitude as string);
  const radius = radiusMeters ? parseFloat(radiusMeters as string) : 5000; // default 5km

  try {
    if (isPostgresConnected && pgPool) {
      const result = await pgPool.query(
        `SELECT d.*, ST_Distance(d.geom, ST_SetSRID(ST_Point($1, $2), 4326)) as distance_meters
         FROM defects d
         WHERE ST_DWithin(d.geom, ST_SetSRID(ST_Point($1, $2), 4326), $3)
         ORDER BY distance_meters ASC`,
        [lon, lat, radius]
      );
      return res.json({ defects: result.rows });
    } else {
      // TS Fallback using Haversine
      const nearbyDefects = mockDb.defects
        .map(d => {
          const dist = getHaversineDistance(lat, lon, d.gps_latitude, d.gps_longitude);
          return { ...d, distance_meters: dist };
        })
        .filter(d => d.distance_meters <= radius)
        .sort((a, b) => a.distance_meters - b.distance_meters);

      return res.json({ defects: nearbyDefects });
    }
  } catch (err: any) {
    logger.error(`Error running nearby geo-query: ${err.message}`);
    return res.status(500).json({ error: 'Server error during nearby defects search' });
  }
});

// 2. Find all projects/assets inside a custom drawn polygon boundary
router.post('/geo/inside-polygon', authenticateJWT, async (req: AuthenticatedRequest, res: Response) => {
  const { polygon } = req.body; // Array of [lon, lat] coordinates (closed ring: first equals last)

  if (!polygon || !Array.isArray(polygon) || polygon.length < 3) {
    return res.status(400).json({ error: 'Invalid polygon format. Needs array of [lon, lat] coordinates.' });
  }

  try {
    if (isPostgresConnected && pgPool) {
      // Build Well-Known Text (WKT) POLYGON string
      const ringText = polygon.map(pt => `${pt[0]} ${pt[1]}`).join(', ');
      const wktPolygon = `POLYGON((${ringText}))`;

      const result = await pgPool.query(
        `SELECT * FROM projects
         WHERE ST_Contains(ST_GeomFromText($1, 4326), geom)`,
        [wktPolygon]
      );
      return res.json({ projects: result.rows });
    } else {
      // TS Fallback using Ray-Casting algorithm
      // Map polygon coordinates to match raycast format: [lat, lon]
      const latLonPoly = polygon.map(pt => [pt[1], pt[0]] as [number, number]);
      
      const containedProjects = mockDb.projects.filter(p => {
        return isPointInPolygon(p.latitude, p.longitude, latLonPoly);
      });

      return res.json({ projects: containedProjects });
    }
  } catch (err: any) {
    logger.error(`Error running polygon containment query: ${err.message}`);
    return res.status(500).json({ error: 'Server error during polygon check' });
  }
});

export default router;
