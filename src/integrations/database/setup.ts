import { connectDB } from './client';

export const setupDatabase = async () => {
  await connectDB();
  // Add any additional setup logic here
};
