const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

let app, server;
let mongod;

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  const uri = mongod.getUri();
  process.env.MONGODB_URI = uri;
  process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';
  process.env.NODE_ENV = 'test';
  const mod = require('../app');
  app = mod.app;
  server = mod.server;
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(uri);
  }
});

afterAll(async () => {
  if (server && server.listening) {
    await new Promise((resolve) => server.close(resolve));
  }
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
  if (mongod) {
    await mongod.stop();
  }
});

function registerPayload(role = 'client') {
  const emailPrefix = Math.random().toString(36).slice(2, 8);
  const base = {
    email: `${emailPrefix}@example.com`,
    password: 'Passw0rd!',
    role,
  };
  if (role === 'client') return { ...base, full_name: 'Client User', id_number: 'ID12345' };
  if (role === 'lawyer') return { ...base, full_name: 'Lawyer User', bar_number: '10001', specialization: 'Civil' };
  if (role === 'court') return { ...base, court_name: 'Central Court', jurisdiction: 'AA', court_type: 'Federal' };
  return base;
}

describe('Auth flow', () => {
  test('register + login works for client', async () => {
    const payload = registerPayload('client');
    const reg = await request(app).post('/api/auth/register').send(payload);
    expect([200, 201, 409]).toContain(reg.statusCode);

    const login = await request(app).post('/api/auth/login').send({ email: payload.email, password: payload.password });
    expect(login.statusCode).toBe(200);
    expect(login.body).toHaveProperty('token');
    expect(login.body).toHaveProperty('user');
    expect(login.body.user).not.toHaveProperty('password');
  });

  test('login fails with wrong password', async () => {
    const payload = registerPayload('client');
    await request(app).post('/api/auth/register').send(payload);

    const badLogin = await request(app).post('/api/auth/login').send({ email: payload.email, password: 'wrongpass' });
    expect(badLogin.statusCode).toBe(401);
  });
});
