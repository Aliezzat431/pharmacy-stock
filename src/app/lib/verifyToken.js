// lib/verifyToken.js
import jwt from 'jsonwebtoken';

export function verifyToken(headers) {
  const authHeader = headers.get('authorization');

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    return decoded; // e.g., { username: 'admin', iat: ..., exp: ... }
  } catch (error) {
    console.error('JWT verification failed:', error);
    return null;
  }
}
