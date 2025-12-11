#!/usr/bin/env node
// Safely purge users from MongoDB (dev/test helper)
// Usage examples:
//   node backend/scripts/purge_users.js --yes
//   node backend/scripts/purge_users.js --role lawyer --yes

require('dotenv').config();
const mongoose = require('mongoose');
const path = require('path');

// Resolve User model relative to this script
const User = require(path.join(__dirname, '..', 'models', 'User'));

const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/e-lawyer';

function parseArgs() {
  const args = process.argv.slice(2);
  const opts = { yes: false, role: null };
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '--yes' || a === '-y') opts.yes = true;
    else if ((a === '--role' || a === '-r') && args[i + 1]) {
      opts.role = String(args[i + 1]).toLowerCase();
      i++;
    }
  }
  return opts;
}

async function main() {
  const { yes, role } = parseArgs();
  if (!yes) {
    console.error('Refusing to run without --yes flag. Use --role <lawyer|client|court|admin> to limit scope.');
    process.exit(2);
  }
  await mongoose.connect(mongoUri);
  try {
    const filter = role ? { role } : {};
    const count = await User.countDocuments(filter);
    if (count === 0) {
      console.log('No matching users found. Nothing to delete.');
      return;
    }
    const res = await User.deleteMany(filter);
    console.log(`Deleted ${res.deletedCount || 0} user(s).`);
  } finally {
    await mongoose.disconnect();
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
