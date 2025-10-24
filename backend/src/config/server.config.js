/**
 * Server Configuration with ESM
 * Cấu hình server và middleware theo chuẩn AdminJS v7
 */

import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';

/**
 * Security middleware configuration
 */
const securityConfig = {
  helmet: {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'", "*.ngrok-free.app", "*.ngrok.io"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        fontSrc: ["'self'", "https://fonts.gstatic.com"],
        scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
        imgSrc: ["'self'", "data:", "https:", "*.ngrok-free.app", "*.ngrok.io"],
        connectSrc: ["'self'", "*.ngrok-free.app", "*.ngrok.io"]
      }
    }
  },
  
  cors: {
    origin: '*',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization']
  },
  
  rateLimit: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 1000, // Limit each IP to 100 requests per windowMs
    message: {
      success: false,
      message: 'Too many requests, please try again later'
    }
  }
};

/**
 * Create and configure Express app
 */
const createExpressApp = () => {
  const app = express();
  
  // Trust proxy - Required for ngrok, Railway, Heroku, etc.
  // This allows Express to trust X-Forwarded-* headers from reverse proxies
  app.set('trust proxy', 1);
  
  // Log requests when using ngrok (helpful for debugging mobile access)
  app.use((req, res, next) => {
    const isNgrok = req.get('host')?.includes('ngrok');
    if (isNgrok) {
      console.log(`[NGROK] ${req.method} ${req.path} - UA: ${req.get('user-agent')?.substring(0, 50)}`);
    }
    next();
  });
  
  // Security middleware
  app.use(helmet(securityConfig.helmet));
  app.use(cors(securityConfig.cors));
  app.use(rateLimit(securityConfig.rateLimit));
  
  return app;
};

/**
 * Server configuration
 */
const serverConfig = {
  port: process.env.PORT || 3000,
  host: process.env.HOST || 'localhost',
  
  // Session configuration
  session: {
    secret: process.env.SESSION_SECRET || 'dev-session-secret',
    resave: false,
    saveUninitialized: false,
    cookie: {
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      secure: process.env.NODE_ENV === 'production', // Enable secure cookies in production
      httpOnly: true
    }
  }
};

export {
  createExpressApp,
  serverConfig,
  securityConfig
};
