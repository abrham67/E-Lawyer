// Backfill script: add initial history entries to existing cases missing history
const mongoose = require('mongoose');
const Case = require('../models/Case');
require('dotenv').config();

async function run() {
  await mongoose.connect(process.env.MONGO_URI || process.env.DATABASE_URL || 'mongodb://localhost:27017/elegal');
  console.log('Connected to MongoDB');
  const cases = await Case.find({ $or: [ { history: { $exists: false } }, { history: { $size: 0 } } ] });
  console.log(`Found ${cases.length} cases to backfill`);
  for (const c of cases) {
    const initial = { status: c.status || 'pending', by: null, reason: 'Backfilled initial history', timestamp: c.created_at || new Date() };
    c.history = [initial];
    await c.save();
    console.log(`Backfilled case ${c._id}`);
  }
  process.exit(0);
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
