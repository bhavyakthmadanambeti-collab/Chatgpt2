import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { db, User } from './db.js';

const JWT_SECRET = process.env.JWT_SECRET || 'chatgpt_pro_secret_key_2026_super_secure';

export interface AuthRequest extends Request {
  user?: User;
}

export function sanitizeUser(user: User) {
  const { passwordHash, ...rest } = user;
  return rest;
}

export function generateToken(user: User): string {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: user.role,
      mustChangePassword: user.mustChangePassword,
    },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

export function authenticateToken(req: AuthRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;

  if (!token) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET) as { id: string };
    const user = db.getUserById(payload.id);

    if (!user) {
      res.status(401).json({ error: 'User no longer exists' });
      return;
    }

    if (user.status === 'disabled') {
      res.status(403).json({ error: 'Your account has been deactivated. Please contact the administrator.' });
      return;
    }

    req.user = user;
    next();
  } catch (err) {
    res.status(401).json({ error: 'Invalid or expired session token' });
  }
}

export function optionalAuthenticateToken(req: AuthRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;

  if (token) {
    try {
      const payload = jwt.verify(token, JWT_SECRET) as { id: string };
      const user = db.getUserById(payload.id);
      if (user && user.status === 'active') {
        req.user = user;
      }
    } catch {}
  }
  next();
}

export function requireAdmin(req: AuthRequest, res: Response, next: NextFunction): void {
  if (!req.user || req.user.role !== 'admin') {
    res.status(403).json({ error: 'Administrator access required' });
    return;
  }
  next();
}

export function hashPassword(plain: string): string {
  const salt = bcrypt.genSaltSync(10);
  return bcrypt.hashSync(plain, salt);
}

export function comparePassword(plain: string, hash: string): boolean {
  return bcrypt.compareSync(plain, hash);
}
