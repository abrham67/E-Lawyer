import mongoose from 'mongoose';

const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/e-lawyer';

export const connectDB = async () => {
  try {
    await mongoose.connect(mongoUri);
    console.log('MongoDB connected (frontend integration)');
  } catch (err) {
    console.error('MongoDB connection error:', err);
    throw err;
  }
};
