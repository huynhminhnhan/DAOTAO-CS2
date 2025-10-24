import jwt from 'jsonwebtoken';

// Secrets (in production, use environment variables)
const ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET || 'your-access-token-secret-key-here';
const REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET || 'your-refresh-token-secret-key-here';

// Expiry settings
const ACCESS_TOKEN_EXPIRY = process.env.ACCESS_TOKEN_EXPIRY || '15m';
const REFRESH_TOKEN_EXPIRY = process.env.REFRESH_TOKEN_EXPIRY || '7d';

export const generateAccessToken = (payload) => jwt.sign(payload, ACCESS_TOKEN_SECRET, {
  expiresIn: ACCESS_TOKEN_EXPIRY,
  issuer: 'student-management-system',
  audience: 'student-ms-users'
});

export const generateRefreshToken = (payload) => jwt.sign(payload, REFRESH_TOKEN_SECRET, {
  expiresIn: REFRESH_TOKEN_EXPIRY,
  issuer: 'student-management-system',
  audience: 'student-ms-users'
});

export const verifyAccessToken = (token) => {
  try {
    return jwt.verify(token, ACCESS_TOKEN_SECRET, {
      issuer: 'student-management-system',
      audience: 'student-ms-users'
    });
  } catch (error) {
    return null;
  }
};

export const verifyRefreshToken = (token) => {
  try {
    return jwt.verify(token, REFRESH_TOKEN_SECRET, {
      issuer: 'student-management-system',
      audience: 'student-ms-users'
    });
  } catch (error) {
    return null;
  }
};

export const generateTokenPair = (user) => {
  const payload = {
    id: user.id,
    username: user.username,
    email: user.email,
    role: user.role,
    status: user.status
  };
  return {
    accessToken: generateAccessToken(payload),
    refreshToken: generateRefreshToken(payload)
  };
};

export { ACCESS_TOKEN_EXPIRY, REFRESH_TOKEN_EXPIRY };
