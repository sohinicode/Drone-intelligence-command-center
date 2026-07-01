import request from 'supertest';
import app from '../index';

describe('DICC Backend API Tests', () => {
  
  describe('GET /health', () => {
    it('should return 200 OK and health statistics', async () => {
      const res = await request(app).get('/health');
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('status');
      expect(res.body.status).toBe('healthy');
      expect(res.body).toHaveProperty('uptime');
      expect(res.body).toHaveProperty('services');
    });
  });

  describe('Authentication Routes', () => {
    const testUser = {
      name: 'Test Engineer',
      email: `test_${Math.random().toString(36).substring(7)}@dicc.com`,
      password: 'password123',
      role: 'Engineer'
    };

    it('should register a new user successfully', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send(testUser);
      
      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('message');
      expect(res.body).toHaveProperty('user');
      expect(res.body.user.email).toBe(testUser.email);
      expect(res.body.user.role).toBe(testUser.role);
    });

    it('should fail to register a duplicate email', async () => {
      // First registration
      const email = `dup_${Math.random().toString(36).substring(7)}@dicc.com`;
      await request(app)
        .post('/api/auth/register')
        .send({ ...testUser, email });

      // Duplicate registration
      const res = await request(app)
        .post('/api/auth/register')
        .send({ ...testUser, email });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('error');
    });

    it('should login an existing user and return a JWT access token', async () => {
      // Register first
      const email = `login_${Math.random().toString(36).substring(7)}@dicc.com`;
      await request(app)
        .post('/api/auth/register')
        .send({ ...testUser, email });

      // Login
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email, password: testUser.password });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('accessToken');
      expect(res.body).toHaveProperty('user');
      expect(res.body.user.email).toBe(email);
    });

    it('should reject login for invalid credentials', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'fake@dicc.com', password: 'wrongpassword' });

      expect(res.status).toBe(401);
      expect(res.body).toHaveProperty('error');
    });
  });
});
