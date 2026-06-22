import mongoose from 'mongoose';

export const connectDB = async () => {
  try {
    const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/japanese-learning-app';
    await mongoose.connect(uri);
    console.log('✅ MongoDB connected successfully');
    return true;
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    console.warn('⚠️ Falling back to mock data for API responses.');
    return false;
  }
};
