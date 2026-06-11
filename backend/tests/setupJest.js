// Jest setup: increase timeout and provide sane defaults for tests
process.env.NODE_ENV = process.env.NODE_ENV || 'test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';
process.env.DISABLE_JOBS = '1';
// Avoid starting cron jobs during tests
jest.mock('node-cron', () => ({ schedule: () => ({ stop: () => {} }) }));
jest.mock('../jobs/reminders', () => ({}));
jest.setTimeout(20000);
