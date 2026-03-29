const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./config/swagger');

// Routes
const authRoutes = require('./routes/auth.routes');
const fileRoutes = require('./routes/file.routes');
const searchRoutes = require('./routes/search.routes');

const app = express();

// ─── Build allowed origins list ──────────────────────────────────────────────
// CLIENT_URL can be comma-separated for multiple origins:
//   e.g. "https://mediavault.vercel.app,http://localhost:3000"
const rawOrigins = (process.env.CLIENT_URL || 'http://localhost:3000')
  .split(',')
  .map((o) => o.trim().replace(/\/$/, '')); // strip trailing slash

const corsOptions = {
  origin: (incomingOrigin, callback) => {
    // Allow server-to-server / curl (no origin header)
    if (!incomingOrigin) return callback(null, true);

    const clean = incomingOrigin.replace(/\/$/, '');

    // Exact match
    if (rawOrigins.includes(clean)) return callback(null, true);

    // Vercel preview deployments: *.vercel.app
    if (/^https:\/\/[a-z0-9-]+-[a-z0-9]+-[a-z0-9]+\.vercel\.app$/.test(clean))
      return callback(null, true);

    // Allow any subdomain of a configured vercel domain
    const vercelBase = rawOrigins.find((o) => o.endsWith('.vercel.app'));
    if (vercelBase) {
      const base = vercelBase.replace(/^https?:\/\//, '');
      if (clean.endsWith(`.${base}`) || clean === `https://${base}`)
        return callback(null, true);
    }

    // Railway deployments
    if (/^https:\/\/.*\.railway\.app$/.test(clean)) return callback(null, true);

    callback(new Error(`CORS: origin '${incomingOrigin}' not allowed`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['Content-Disposition'],
  optionsSuccessStatus: 200, // Some browsers (IE11) choke on 204
};

// Must handle OPTIONS preflight BEFORE helmet so headers are set correctly
app.options('*', cors(corsOptions));

// Security Middleware — customise Helmet CSP to allow Cloudinary iframes for PDF
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'", 'https://unpkg.com'],
        styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
        fontSrc: ["'self'", 'https://fonts.gstatic.com'],
        imgSrc: ["'self'", 'data:', 'https://res.cloudinary.com', 'blob:'],
        mediaSrc: ["'self'", 'https://res.cloudinary.com', 'blob:'],
        // Allow Cloudinary PDF iframes and Swagger UI
        frameSrc: ["'self'", 'https://res.cloudinary.com', 'https://docs.cloudinary.com'],
        connectSrc: ["'self'", 'https://res.cloudinary.com', 'wss:', 'ws:'],
        workerSrc: ["'self'", 'blob:'],
      },
    },
    crossOriginEmbedderPolicy: false, // Required for PDF iframe + media
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
);
app.use(cors(corsOptions));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: { success: false, message: 'Too many requests, please try again later.' },
});
app.use('/api', limiter);

// Stricter limit for auth routes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { success: false, message: 'Too many auth attempts, please try again later.' },
});

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// API Documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'MediaVault API Docs',
}));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Routes
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/files', fileRoutes);
app.use('/api/search', searchRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Error:', err);
  const statusCode = err.statusCode || 500;
  res.status(statusCode).json({
    success: false,
    message: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
});

module.exports = app;