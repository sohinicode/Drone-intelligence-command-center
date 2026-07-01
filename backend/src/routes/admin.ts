import { Router, Response } from 'express';
import { isPostgresConnected, pgPool, mockDb, logger } from '../config/db';
import { authenticateJWT, AuthenticatedRequest, authorizeRoles } from '../middlewares/auth';
import fs from 'fs';
import path from 'path';

const router = Router();

// Retrieve administrative statistics & health (Admin only)
router.get('/stats', authenticateJWT, authorizeRoles('Admin'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const memory = process.memoryUsage();
    const systemHealth = {
      uptime: process.uptime(),
      postgres: isPostgresConnected ? 'Connected' : 'Fallback (In-Memory Database active)',
      redis: 'Offline/Standby',
      mongodb: 'Offline/Memory DB active',
      memory: {
        rss: `${(memory.rss / 1024 / 1024).toFixed(1)} MB`,
        heapTotal: `${(memory.heapTotal / 1024 / 1024).toFixed(1)} MB`,
        heapUsed: `${(memory.heapUsed / 1024 / 1024).toFixed(1)} MB`
      }
    };

    let usersCount = mockDb.users.length;
    let projectsCount = mockDb.projects.length;
    let defectsCount = mockDb.defects.length;
    let reportsCount = mockDb.reports.length;
    let activities: any[] = mockDb.activities.slice(-10).reverse();

    if (isPostgresConnected && pgPool) {
      const uRes = await pgPool.query('SELECT COUNT(*) as count FROM users');
      usersCount = parseInt(uRes.rows[0].count);
      const pRes = await pgPool.query('SELECT COUNT(*) as count FROM projects');
      projectsCount = parseInt(pRes.rows[0].count);
      const dRes = await pgPool.query('SELECT COUNT(*) as count FROM defects');
      defectsCount = parseInt(dRes.rows[0].count);
      const rRes = await pgPool.query('SELECT COUNT(*) as count FROM reports');
      reportsCount = parseInt(rRes.rows[0].count);
      
      const actRes = await pgPool.query(`
        SELECT a.*, u.name as user_name, u.email as user_email 
        FROM activities a 
        LEFT JOIN users u ON a.user_id = u.id 
        ORDER BY a.timestamp DESC LIMIT 10
      `);
      activities = actRes.rows;
    } else {
      // Hydrate user emails in activities for mockDb
      activities = activities.map(act => {
        const u = mockDb.users.find(usr => usr.id === act.user_id);
        return {
          ...act,
          user_name: u ? u.name : 'Unknown User',
          user_email: u ? u.email : 'unknown@dicc.com'
        };
      });
    }

    return res.json({
      health: systemHealth,
      metrics: {
        totalUsers: usersCount,
        totalProjects: projectsCount,
        totalDefects: defectsCount,
        totalReports: reportsCount
      },
      recentActivities: activities
    });
  } catch (err: any) {
    logger.error(`Error in admin stats retrieval: ${err.message}`);
    return res.status(500).json({ error: 'Server error generating admin telemetry' });
  }
});

// Retrieve user list (Admin only)
router.get('/users', authenticateJWT, authorizeRoles('Admin'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (isPostgresConnected && pgPool) {
      const result = await pgPool.query('SELECT id, name, email, role, verified, created_at FROM users ORDER BY id ASC');
      return res.json({ users: result.rows });
    } else {
      const users = mockDb.users.map(({ password_hash, ...u }) => u);
      return res.json({ users });
    }
  } catch (err: any) {
    logger.error(`Error fetching user list: ${err.message}`);
    return res.status(500).json({ error: 'Server error fetching user profiles' });
  }
});

// Update user roles (Admin only)
router.put('/users/:id/role', authenticateJWT, authorizeRoles('Admin'), async (req: AuthenticatedRequest, res: Response) => {
  const userId = parseInt(req.params.id);
  const { role } = req.body;

  const allowedRoles = ['Admin', 'Inspector', 'Engineer'];
  if (!allowedRoles.includes(role)) {
    return res.status(400).json({ error: 'Invalid role specified' });
  }

  try {
    if (isPostgresConnected && pgPool) {
      const result = await pgPool.query('UPDATE users SET role = $1 WHERE id = $2 RETURNING id, name, email, role', [role, userId]);
      if (result.rows.length === 0) return res.status(404).json({ error: 'User not found' });
      return res.json({ message: 'User role updated', user: result.rows[0] });
    } else {
      const user = mockDb.users.find(u => u.id === userId);
      if (!user) return res.status(404).json({ error: 'User not found' });
      user.role = role;
      return res.json({ message: 'User role updated (Fallback)', user: { id: user.id, name: user.name, email: user.email, role: user.role } });
    }
  } catch (err: any) {
    logger.error(`Error changing user role: ${err.message}`);
    return res.status(500).json({ error: 'Server error changing user role' });
  }
});

// Get log file output (Admin only)
router.get('/logs', authenticateJWT, authorizeRoles('Admin'), (req: AuthenticatedRequest, res: Response) => {
  const logPath = path.join(__dirname, '../../combined.log');
  
  if (!fs.existsSync(logPath)) {
    return res.json({ logs: ['No system logs generated yet.'] });
  }

  try {
    const rawLogs = fs.readFileSync(logPath, 'utf8');
    const logLines = rawLogs
      .split('\n')
      .filter(line => line.trim().length > 0)
      .map(line => {
        try {
          return JSON.parse(line);
        } catch {
          return { message: line, timestamp: new Date() };
        }
      })
      .slice(-100); // return last 100 entries

    return res.json({ logs: logLines });
  } catch (err: any) {
    logger.error(`Error reading log files: ${err.message}`);
    return res.status(500).json({ error: 'Server error reading system logs' });
  }
});

export default router;
