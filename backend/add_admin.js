#!/usr/bin/env node

// Script to add or update an admin user in the database
// Usage:
//   node add_admin.js --email admin@example.com --password SuperSecret123 --name "Admin User"
// Environment variables (fallbacks):
//   ADMIN_EMAIL, ADMIN_PASSWORD, ADMIN_NAME
//   MONGODB_URI or MONGO_URI for database connection string

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/User');

const MONGO_URI = process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://localhost:27017/e-lawyer';

function parseArgs() {
  const args = process.argv.slice(2);
  const parsed = {};
  for (let i = 0; i < args.length; i += 1) {
    const current = args[i];
    if (!current.startsWith('--')) continue;
    const key = current.slice(2);
    const next = args[i + 1];
    if (next && !next.startsWith('--')) {
      parsed[key] = next;
      i += 1;
    } else {
      parsed[key] = true;
    }
  }
  return parsed;
}

async function main() {
  const cli = parseArgs();
  const email = cli.email || process.env.ADMIN_EMAIL;
  const passwordPlain = cli.password || process.env.ADMIN_PASSWORD;
  const fullName = cli.name || cli.full_name || process.env.ADMIN_NAME;

  if (!email || !passwordPlain || !fullName) {
    console.error('\nMissing required admin credentials.');
    console.error('Provide --email, --password, and --name arguments or set ADMIN_EMAIL, ADMIN_PASSWORD, ADMIN_NAME environment variables.');
    console.error('Example:');
    console.error('  node add_admin.js --email admin@example.com --password SuperSecret123 --name "Admin User"\n');
    process.exit(1);
  }

  await mongoose.connect(MONGO_URI);

  try {
    const hashedPassword = await bcrypt.hash(passwordPlain, 10);

    const existing = await User.findOne({ email });
    if (existing) {
      existing.password = hashedPassword;
      existing.full_name = fullName;
      existing.role = 'admin';
      existing.updated_at = new Date();
      await existing.save();
      console.log(`Updated existing admin: ${email}`);
    } else {
      const adminUser = new User({
        email,
        password: hashedPassword,
        full_name: fullName,
        role: 'admin',
        id_verified: true,
      });
      await adminUser.save();
      console.log(`Created new admin: ${email}`);
    }
  } catch (err) {
    console.error('Failed to create admin user:', err.message);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
}

main();
