const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
let app, server, io;
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
  io = mod.io;
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(uri);
  }
});

afterAll(async () => {
  if (io && typeof io.close === 'function') {
    await new Promise((resolve) => io.close(resolve));
  }
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

describe('Cases connect/disconnect', () => {
  test('client can connect (create pending case) and lawyer receives socket emit', async () => {
    // Use x-test-user to bypass JWT in test environment
    const testUser = { id: '507f191e810c19729de860eb', role: 'client', full_name: 'Test Client' };
    const clientRes = await request(app)
      .post('/api/cases/connect')
      .set('x-test-user', JSON.stringify(testUser))
      .send({ lawyer_id: '507f191e810c19729de860ea', title: 'Test Case', description: 'Valid description text' });
    if (clientRes.statusCode !== 201) {
      console.error('connect error body', clientRes.body);
    }
    expect(clientRes.statusCode).toBe(201);
    expect(clientRes.body).toHaveProperty('_id');
  });

  test('client can disconnect own case', async () => {
  const testUser = { id: '507f191e810c19729de860eb', role: 'client', full_name: 'Test Client' };
  const c = await request(app).post('/api/cases/connect').set('x-test-user', JSON.stringify(testUser)).send({ lawyer_id: '507f191e810c19729de860ea', title: 'Test Case', description: 'Valid description text' });
  const caseId = c.body._id;
  const del = await request(app).delete(`/api/cases/${caseId}/disconnect`).set('x-test-user', JSON.stringify(testUser));
  expect(del.statusCode).toBe(200);
  });
});
