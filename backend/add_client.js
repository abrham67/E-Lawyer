// Script to add a client user to the database
// Usage: node add_client.js

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/User');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/elegal';

async function main() {
  await mongoose.connect(MONGO_URI);
  const password = await bcrypt.hash('client123', 10);
  const user = new User({
    email: 'client1@example.com',
    password,
    full_name: 'Client One',
    role: 'client',
  });
  await user.save();
  console.log('Client user created:', user.email);
  await mongoose.disconnect();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
