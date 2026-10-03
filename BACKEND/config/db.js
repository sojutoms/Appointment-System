import mongoose from 'mongoose';

// NoSQL injection (e.g. { "email": { "$ne": null } }) is blocked before queries
// are built: middleware/sanitize.js strips "$" keys from bodies, validators force
// fields to be strings/IDs, and Express 5 parses query strings without nesting.
mongoose.set('strictQuery', true);

export default async function connectDB() {
  const uri = process.env.MONGO_URI;
  if (!uri) {
    throw new Error('MONGO_URI is not set. Add it to your .env file.');
  }

  const conn = await mongoose.connect(uri);
  console.log(`MongoDB connected: ${conn.connection.host}/${conn.connection.name}`);
}
