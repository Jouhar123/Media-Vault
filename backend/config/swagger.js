const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'MediaVault API',
      version: '1.0.0',
      description: 'A scalable multimedia upload and search platform API',
      contact: {
        name: 'MediaVault Support',
        email: 'support@mediavault.com',
      },
    },
    servers: [
      { url: 'http://localhost:5000', description: 'Development server' },
      { url: 'https://mediavault-api.railway.app', description: 'Production server' },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
      schemas: {
        User: {
          type: 'object',
          properties: {
            _id: { type: 'string' },
            username: { type: 'string' },
            email: { type: 'string', format: 'email' },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        File: {
          type: 'object',
          properties: {
            _id: { type: 'string' },
            name: { type: 'string' },
            originalName: { type: 'string' },
            fileType: { type: 'string', enum: ['image', 'video', 'audio', 'pdf'] },
            mimeType: { type: 'string' },
            size: { type: 'number' },
            cloudinaryUrl: { type: 'string' },
            cloudinaryPublicId: { type: 'string' },
            tags: { type: 'array', items: { type: 'string' } },
            viewCount: { type: 'number' },
            uploader: { $ref: '#/components/schemas/User' },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        Error: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            message: { type: 'string' },
          },
        },
      },
    },
    security: [{ bearerAuth: [] }],
  },
  apis: ['./routes/*.js'],
};

module.exports = swaggerJsdoc(options);
