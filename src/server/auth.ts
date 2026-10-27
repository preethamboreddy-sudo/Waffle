import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { Request, Response, NextFunction } from 'express';
import { dbStore } from './db/store';
import { Role } from './db/types';

const SECRET_KEY = process.env.SESSION_SECRET || 'waffle-pops-in-production-secret-token-key-2026';

export interface AuthenticatedUser {
  id: string;
  name: string;
  phone: string;
  email?: string;
  role: Role;
}

export interface AuthRequest extends Request {
  user?: AuthenticatedUser;
}

export type AuthClientApp = 'customer' | 'admin';

export function getAuthClientApp(req: Request): AuthClientApp | undefined {
  const value = req.header('x-client-app')?.toLowerCase();
  return value === 'customer' || value === 'admin' ? value : undefined;
}

function roleMatchesClientApp(role: Role, app: AuthClientApp) {
  return app === 'admin' ? role === 'ADMIN' || role === 'OPERATOR' : role === 'CUSTOMER';
}

/**
 * Creates an HMAC signed session token with expiry.
 */
export function createSessionToken(user: AuthenticatedUser): string {
  const payload = {
    sub: user.id,
    name: user.name,
    phone: user.phone,
    role: user.role,
    exp: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days
  };
  const jsonStr = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = crypto
    .createHmac('sha256', SECRET_KEY)
    .update(jsonStr)
    .digest('base64url');
  return `${jsonStr}.${signature}`;
}

/**
 * Verifies session token and returns payload if valid.
 */
export function verifySessionToken(token: string): AuthenticatedUser | null {
  try {
    const [jsonStr, signature] = token.split('.');
    if (!jsonStr || !signature) return null;

    const expectedSig = crypto
      .createHmac('sha256', SECRET_KEY)
      .update(jsonStr)
      .digest('base64url');

    if (signature !== expectedSig) return null;

    const payload = JSON.parse(Buffer.from(jsonStr, 'base64url').toString('utf-8'));
    if (payload.exp && Date.now() > payload.exp) {
      return null;
    }

    return {
      id: payload.sub,
      name: payload.name,
      phone: payload.phone,
      role: payload.role,
    };
  } catch {
    return null;
  }
}

/**
 * Middleware: Extracts user from cookie or Authorization Bearer header.
 */
export async function optionalAuth(req: AuthRequest, _res: Response, next: NextFunction) {
  const clientApp = getAuthClientApp(req);
  let token = clientApp === 'admin'
    ? req.cookies?.staff_session
    : clientApp === 'customer'
      ? req.cookies?.customer_session
      : req.cookies?.customer_session || req.cookies?.staff_session;

  if (!token && req.headers.authorization?.startsWith('Bearer ')) {
    token = req.headers.authorization.substring(7);
  }

  // Accept a matching pre-split session cookie during migration; ignore the other app's session.
  if (!token && req.cookies?.token) {
    const legacyUser = verifySessionToken(req.cookies.token);
    if (!clientApp || (legacyUser && roleMatchesClientApp(legacyUser.role, clientApp))) {
      token = req.cookies.token;
    }
  }

  if (token) {
    const verified = verifySessionToken(token);
    if (verified && (!clientApp || roleMatchesClientApp(verified.role, clientApp))) {
      const user = await dbStore.getUserById(verified.id);
      if (user && (!clientApp || roleMatchesClientApp(user.role, clientApp))) {
        req.user = {
          id: user.id,
          name: user.name,
          phone: user.phone,
          email: user.email,
          role: user.role,
        };
      }
    }
  }
  next();
}

/**
 * Middleware: Requires authenticated user.
 */
export async function requireAuth(req: AuthRequest, res: Response, next: NextFunction) {
  await optionalAuth(req, res, () => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required. Please sign in.' });
    }
    next();
  });
}

/**
 * Middleware: Requires ADMIN or OPERATOR role.
 */
export async function requireAdmin(req: AuthRequest, res: Response, next: NextFunction) {
  await optionalAuth(req, res, () => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required. Please sign in to staff portal.' });
    }
    if (req.user.role !== 'ADMIN' && req.user.role !== 'OPERATOR') {
      return res.status(403).json({ error: 'Access denied: Administrative privileges required.' });
    }
    next();
  });
}
