const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../app');

// Mock cloudinary to avoid actual uploads in tests
jest.mock('../config/cloudinary', () => ({
  cloudinary: {
    uploader: { destroy: jest.fn().mockResolvedValue({ result: 'ok' }) },
  },
  upload: {
    single: () => (req, res, next) => {
      req.file = {
        path: 'https://res.cloudinary.com/test/image/upload/test.jpg',
        filename: 'mediavault/test123',
        originalname: 'test.jpg',
        mimetype: 'image/jpeg',
        size: 1024,
      };
      next();
    },
  },
  ALLOWED_TYPES: { 'image/jpeg': 'image' },
}));

jest.mock('../utils/websocket', () => ({
  notifyUser: jest.fn(),
  broadcast: jest.fn(),
}));

let token, refreshToken, fileId;

beforeAll(async () => {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/mediavault_test');
});

afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.connection.close();
});

// ─── AUTH TESTS ────────────────────────────────────────────────────────────────

describe('Auth API', () => {
  const testUser = {
    username: 'testuser',
    email: 'test@example.com',
    password: 'Password123',
  };

  it('POST /api/auth/register - should register a new user', async () => {
    const res = await request(app).post('/api/auth/register').send(testUser);
    expect(res.statusCode).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user.email).toBe(testUser.email);
    expect(res.body.data.accessToken).toBeDefined();
    token = res.body.data.accessToken;
    refreshToken = res.body.data.refreshToken;
  });

  it('POST /api/auth/register - should reject duplicate email', async () => {
    const res = await request(app).post('/api/auth/register').send(testUser);
    expect(res.statusCode).toBe(409);
  });

  it('POST /api/auth/register - should reject weak password', async () => {
    const res = await request(app).post('/api/auth/register').send({
      username: 'another',
      email: 'another@example.com',
      password: 'weak',
    });
    expect(res.statusCode).toBe(400);
    expect(res.body.errors).toBeDefined();
  });

  it('POST /api/auth/login - should login with correct credentials', async () => {
    const res = await request(app).post('/api/auth/login').send({
      email: testUser.email,
      password: testUser.password,
    });
    expect(res.statusCode).toBe(200);
    expect(res.body.data.accessToken).toBeDefined();
    token = res.body.data.accessToken;
    refreshToken = res.body.data.refreshToken;
  });

  it('POST /api/auth/login - should reject wrong password', async () => {
    const res = await request(app).post('/api/auth/login').send({
      email: testUser.email,
      password: 'WrongPass123',
    });
    expect(res.statusCode).toBe(401);
  });

  it('GET /api/auth/me - should return current user', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${token}`);
    expect(res.statusCode).toBe(200);
    expect(res.body.data.user.email).toBe(testUser.email);
  });

  it('GET /api/auth/me - should reject unauthenticated', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.statusCode).toBe(401);
  });

  it('POST /api/auth/refresh - should refresh tokens', async () => {
    const res = await request(app).post('/api/auth/refresh').send({ refreshToken });
    expect(res.statusCode).toBe(200);
    expect(res.body.data.accessToken).toBeDefined();
    token = res.body.data.accessToken;
  });
});

// ─── FILE TESTS ────────────────────────────────────────────────────────────────

describe('Files API', () => {
  it('POST /api/files/upload - should upload a file', async () => {
    const res = await request(app)
      .post('/api/files/upload')
      .set('Authorization', `Bearer ${token}`)
      .field('name', 'Test Image')
      .field('tags', 'test,image');
    expect(res.statusCode).toBe(201);
    expect(res.body.data.file._id).toBeDefined();
    fileId = res.body.data.file._id;
  });

  it('POST /api/files/upload - should reject unauthenticated upload', async () => {
    const res = await request(app).post('/api/files/upload');
    expect(res.statusCode).toBe(401);
  });

  it('GET /api/files - should list files', async () => {
    const res = await request(app).get('/api/files');
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body.data.files)).toBe(true);
    expect(res.body.data.pagination).toBeDefined();
  });

  it('GET /api/files - should filter by fileType', async () => {
    const res = await request(app).get('/api/files?fileType=image');
    expect(res.statusCode).toBe(200);
    res.body.data.files.forEach(f => expect(f.fileType).toBe('image'));
  });

  it('GET /api/files/:id - should get a file and increment view count', async () => {
    const res = await request(app).get(`/api/files/${fileId}`).set('Authorization', `Bearer ${token}`);
    expect(res.statusCode).toBe(200);
    expect(res.body.data.file.viewCount).toBeGreaterThan(0);
  });

  it('PATCH /api/files/:id - should update file metadata', async () => {
    const res = await request(app)
      .patch(`/api/files/${fileId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Updated Name', tags: ['updated', 'tags'] });
    expect(res.statusCode).toBe(200);
    expect(res.body.data.file.name).toBe('Updated Name');
  });
});

// ─── SEARCH TESTS ──────────────────────────────────────────────────────────────

describe('Search API', () => {
  it('GET /api/search - should return search results', async () => {
    const res = await request(app)
      .get('/api/search?query=test')
      .set('Authorization', `Bearer ${token}`);
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body.data.files)).toBe(true);
  });

  it('GET /api/search - should filter by fileType', async () => {
    const res = await request(app)
      .get('/api/search?query=test&fileType=image')
      .set('Authorization', `Bearer ${token}`);
    expect(res.statusCode).toBe(200);
  });

  it('GET /api/search - should reject with no params', async () => {
    const res = await request(app)
      .get('/api/search')
      .set('Authorization', `Bearer ${token}`);
    expect(res.statusCode).toBe(400);
  });

  it('GET /api/search/suggestions - should return autocomplete suggestions', async () => {
    const res = await request(app)
      .get('/api/search/suggestions?query=te')
      .set('Authorization', `Bearer ${token}`);
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body.data.suggestions)).toBe(true);
  });
});

// ─── DELETE FILE TEST ──────────────────────────────────────────────────────────

describe('File Deletion', () => {
  it('DELETE /api/files/:id - should delete a file', async () => {
    const res = await request(app)
      .delete(`/api/files/${fileId}`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.statusCode).toBe(200);
  });

  it('DELETE /api/files/:id - should 404 after deletion', async () => {
    const res = await request(app)
      .get(`/api/files/${fileId}`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.statusCode).toBe(404);
  });
});
