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
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        fontSrc: ["'self'", "https://fonts.gstatic.com"],
        scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
        imgSrc: ["'self'", "data:", "https:"]
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
    secret: process.env.SESSION_SECRET || 'your-session-secret-key-here',
    resave: false,
    saveUninitialized: false,
    cookie: {
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      secure: false, // Set to true in production with HTTPS
      httpOnly: true
    }
  }
};

export {
  createExpressApp,
  serverConfig,
  securityConfig
};
