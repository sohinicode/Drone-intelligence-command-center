import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { isPostgresConnected, pgPool, mockDb, logger } from '../config/db';
import { authenticateJWT, AuthenticatedRequest } from '../middlewares/auth';

const router = Router();

const ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || 'super_secret_access_key_12345';
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'super_secret_refresh_key_54321';

// Register User
router.post('/register', async (req: Request, res: Response) => {
  const { name, email, password, role } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Missing required parameters: name, email, password' });
  }

  const allowedRoles = ['Admin', 'Inspector', 'Engineer'];
  const userRole = allowedRoles.includes(role) ? role : 'Engineer';

  try {
    const passwordHash = await bcrypt.hash(password, 12);

    if (isPostgresConnected && pgPool) {
      // Check if user exists
      const checkUser = await pgPool.query('SELECT * FROM users WHERE email = $1', [email]);
      if (checkUser.rows.length > 0) {
        return res.status(400).json({ error: 'User with this email already exists' });
      }

      const result = await pgPool.query(
        'INSERT INTO users (name, email, password_hash, role, verified) VALUES ($1, $2, $3, $4, $5) RETURNING id, name, email, role, verified',
        [name, email, passwordHash, userRole, true]
      );
      
      // Log activity
      await pgPool.query('INSERT INTO activities (user_id, action, details) VALUES ($1, $2, $3)', [
        result.rows[0].id,
        'Register',
        `User ${email} registered with role ${userRole}`
      ]);

      return res.status(201).json({ message: 'User registered successfully', user: result.rows[0] });
    } else {
      // Mock DB logic
      const exists = mockDb.users.find(u => u.email === email);
      if (exists) {
        return res.status(400).json({ error: 'User with this email already exists' });
      }

      const newUser = {
        id: mockDb.users.length + 1,
        name,
        email,
        password_hash: passwordHash,
        role: userRole,
        verified: true,
        created_at: new Date()
      };
      
      mockDb.users.push(newUser);
      
      mockDb.activities.push({
        id: mockDb.activities.length + 1,
        user_id: newUser.id,
        action: 'Register',
        details: `User ${email} registered with role ${userRole}`,
        timestamp: new Date()
      });

      const { password_hash, ...userResponse } = newUser;
      return res.status(201).json({ message: 'User registered successfully (Fallback Database)', user: userResponse });
    }
  } catch (err: any) {
    logger.error(`Error in registration: ${err.message}`);
    return res.status(500).json({ error: 'Server error during registration' });
  }
});

// Login User
router.post('/login', async (req: Request, res: Response) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Missing email or password' });
  }

  try {
    let user: any = null;

    if (isPostgresConnected && pgPool) {
      const result = await pgPool.query('SELECT * FROM users WHERE email = $1', [email]);
      if (result.rows.length > 0) {
        user = result.rows[0];
      }
    } else {
      user = mockDb.users.find(u => u.email === email);
    }

    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Generate JWT Tokens
    const accessToken = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      ACCESS_SECRET,
      { expiresIn: '15m' }
    );

    const refreshToken = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      REFRESH_SECRET,
      { expiresIn: '7d' }
    );

    // Save refresh token in HttpOnly cookie
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    // Log Activity
    if (isPostgresConnected && pgPool) {
      await pgPool.query('INSERT INTO activities (user_id, action, details) VALUES ($1, $2, $3)', [
        user.id,
        'Login',
        `User ${user.email} logged in`
      ]);
    } else {
      mockDb.activities.push({
        id: mockDb.activities.length + 1,
        user_id: user.id,
        action: 'Login',
        details: `User ${user.email} logged in (Fallback Database)`,
        timestamp: new Date()
      });
    }

    const { password_hash, ...userResponse } = user;
    return res.json({
      message: 'Logged in successfully',
      accessToken,
      user: userResponse
    });
  } catch (err: any) {
    logger.error(`Error in login: ${err.message}`);
    return res.status(500).json({ error: 'Server error during login' });
  }
});

// Refresh Token
router.post('/refresh', (req: Request, res: Response) => {
  // Read cookie
  const refreshToken = req.cookies?.refreshToken || req.body?.refreshToken;

  if (!refreshToken) {
    return res.status(401).json({ error: 'Unauthorized: No Refresh Token Provided' });
  }

  try {
    const decoded = jwt.verify(refreshToken, REFRESH_SECRET) as any;
    const newAccessToken = jwt.sign(
      { id: decoded.id, email: decoded.email, role: decoded.role },
      ACCESS_SECRET,
      { expiresIn: '15m' }
    );

    return res.json({ accessToken: newAccessToken });
  } catch (err) {
    return res.status(403).json({ error: 'Forbidden: Invalid or Expired Refresh Token' });
  }
});

// Logout
router.post('/logout', (req: Request, res: Response) => {
  res.clearCookie('refreshToken');
  return res.json({ message: 'Logged out successfully' });
});

// Get profile details
router.get('/me', authenticateJWT, async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthenticated' });

  try {
    let user: any = null;
    if (isPostgresConnected && pgPool) {
      const result = await pgPool.query('SELECT id, name, email, role, verified, avatar_url, created_at FROM users WHERE id = $1', [req.user.id]);
      if (result.rows.length > 0) user = result.rows[0];
    } else {
      const localUser = mockDb.users.find(u => u.id === req.user?.id);
      if (localUser) {
        const { password_hash, ...rest } = localUser;
        user = rest;
      }
    }

    if (!user) return res.status(404).json({ error: 'User profile not found' });
    return res.json({ user });
  } catch (err: any) {
    logger.error(`Error fetching profile: ${err.message}`);
    return res.status(500).json({ error: 'Server error fetching user profile' });
  }
});

export default router;
