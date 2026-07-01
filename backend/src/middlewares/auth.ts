import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || 'super_secret_access_key_12345';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: number;
    email: string;
    role: 'Admin' | 'Inspector' | 'Engineer';
  };
}

// Authenticate JWT Token
export const authenticateJWT = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Access Denied: No Token Provided' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, ACCESS_SECRET) as any;
    req.user = {
      id: decoded.id,
      email: decoded.email,
      role: decoded.role
    };
    next();
  } catch (err) {
    return res.status(403).json({ error: 'Access Denied: Invalid or Expired Token' });
  }
};

// Authorize User Roles (RBAC)
export const authorizeRoles = (...roles: ('Admin' | 'Inspector' | 'Engineer')[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Access Denied: User Unauthenticated' });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: `Access Denied: Requires role of ${roles.join(' or ')}` });
    }

    next();
  };
};
