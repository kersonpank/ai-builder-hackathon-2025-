import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { Request, Response, NextFunction } from 'express';

// Require JWT secret at startup - fail fast if missing
if (!process.env.SESSION_SECRET) {
  throw new Error(
    'CRITICAL: SESSION_SECRET environment variable is required for JWT authentication. ' +
    'Please set a strong random secret in your environment variables.'
  );
}

const JWT_SECRET = process.env.SESSION_SECRET;
const JWT_EXPIRES_IN = '7d';

export interface JWTPayload {
  userId: string;
  companyId?: string;
  type: 'admin' | 'user';
}

export interface AuthRequest extends Request {
  user?: JWTPayload;
}

// Generate JWT token
export function generateToken(payload: JWTPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

// Verify JWT token
export function verifyToken(token: string): JWTPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as JWTPayload;
  } catch (error) {
    return null;
  }
}

// Hash password
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

// Compare password
export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

// Auth middleware for regular users
export function requireAuth(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token não fornecido' });
  }

  const token = authHeader.substring(7);
  const payload = verifyToken(token);

  if (!payload) {
    return res.status(401).json({ error: 'Token inválido ou expirado' });
  }

  if (payload.type !== 'user') {
    return res.status(403).json({ error: 'Acesso negado' });
  }

  req.user = payload;
  next();
}

// Auth middleware for admin users
export function requireAdminAuth(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token não fornecido' });
  }

  const token = authHeader.substring(7);
  const payload = verifyToken(token);

  if (!payload) {
    return res.status(401).json({ error: 'Token inválido ou expirado' });
  }

  if (payload.type !== 'admin') {
    return res.status(403).json({ error: 'Acesso negado - apenas administradores' });
  }

  req.user = payload;
  next();
}

// Optional auth middleware (for public routes that can benefit from auth)
export function optionalAuth(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    const payload = verifyToken(token);
    if (payload) {
      req.user = payload;
    }
  }
  
  next();
}
