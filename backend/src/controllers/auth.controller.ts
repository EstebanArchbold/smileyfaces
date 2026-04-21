import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

export function login(req: Request, res: Response): void {
  const { email, password } = req.body;

  if (!email || !password) {
    res.status(400).json({ error: 'Email and password are required' });
    return;
  }

  const adminEmail = process.env.ADMIN_EMAIL;
  const adminPasswordHash = process.env.ADMIN_PASSWORD_HASH;

  if (!adminEmail || !adminPasswordHash) {
    res.status(500).json({ error: 'Admin credentials not configured' });
    return;
  }

  if (email !== adminEmail) {
    res.status(401).json({ error: 'Invalid credentials' });
    return;
  }

  const isValidPassword = bcrypt.compareSync(password, adminPasswordHash);
  if (!isValidPassword) {
    res.status(401).json({ error: 'Invalid credentials' });
    return;
  }

  const token = jwt.sign(
    { email: adminEmail, role: 'admin' },
    process.env.JWT_SECRET || 'fallback-secret',
    { expiresIn: '24h' }
  );

  res.json({ token, email: adminEmail });
}

export function verify(req: Request, res: Response): void {
  res.json({ valid: true, email: req.user?.email });
}
