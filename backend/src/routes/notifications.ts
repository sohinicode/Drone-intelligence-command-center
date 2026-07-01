import { Router, Response } from 'express';
import { isPostgresConnected, pgPool, mockDb, logger } from '../config/db';
import { authenticateJWT, AuthenticatedRequest } from '../middlewares/auth';

const router = Router();

// Get user notifications
router.get('/', authenticateJWT, async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthenticated' });

  try {
    if (isPostgresConnected && pgPool) {
      const result = await pgPool.query(
        'SELECT * FROM notifications WHERE user_id = $1 OR user_id = 1 ORDER BY created_at DESC LIMIT 50',
        [req.user.id]
      );
      return res.json({ notifications: result.rows });
    } else {
      const notes = mockDb.notifications
        .filter(n => n.user_id === req.user?.id || n.user_id === 1)
        .sort((a, b) => b.created_at.getTime() - a.created_at.getTime());
      return res.json({ notifications: notes });
    }
  } catch (err: any) {
    logger.error(`Error fetching notifications: ${err.message}`);
    return res.status(500).json({ error: 'Server error retrieving notifications' });
  }
});

// Mark all as read
router.post('/mark-read', authenticateJWT, async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthenticated' });

  try {
    if (isPostgresConnected && pgPool) {
      await pgPool.query('UPDATE notifications SET is_read = TRUE WHERE user_id = $1 OR user_id = 1', [req.user.id]);
    } else {
      mockDb.notifications.forEach(n => {
        if (n.user_id === req.user?.id || n.user_id === 1) {
          n.is_read = true;
        }
      });
    }
    return res.json({ message: 'Notifications marked as read' });
  } catch (err: any) {
    logger.error(`Error marking notifications: ${err.message}`);
    return res.status(500).json({ error: 'Server error marking notifications' });
  }
});

export default router;
