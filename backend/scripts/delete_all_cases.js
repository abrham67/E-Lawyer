const mongoose = require('mongoose');
require('dotenv').config();

const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/e-lawyer';

async function run() {
  try {
    await mongoose.connect(mongoUri, { useNewUrlParser: true, useUnifiedTopology: true });
    console.log('Connected to mongo');
    const Case = require('../models/Case');
    let CourtSession;
    try { CourtSession = require('../models/CourtSession'); } catch (e) { CourtSession = null; }

    const caseCount = await Case.countDocuments();
    console.log('Found cases:', caseCount);
    const deletedCases = await Case.deleteMany({});
    console.log('Deleted cases count:', deletedCases.deletedCount || deletedCases.n || 0);

    if (CourtSession) {
      const sessionCount = await CourtSession.countDocuments();
      console.log('Found court sessions:', sessionCount);
      const deletedSessions = await CourtSession.deleteMany({});
      console.log('Deleted sessions count:', deletedSessions.deletedCount || deletedSessions.n || 0);
    } else {
      console.log('No CourtSession model found; skipping sessions deletion');
    }

    await mongoose.disconnect();
    console.log('Done');
    process.exit(0);
  } catch (err) {
    console.error('Error during deletion:', err);
    try { await mongoose.disconnect(); } catch (e) {}
    process.exit(1);
  }
}

run();
