import dotenv from "dotenv";
import express from 'express';
import { MongoClient } from 'mongodb';
import keysystemsRoutes from './routes/keysystems.js';
import userRoutes from './routes/user.js';
dotenv.config()
const app = express();
app.use(express.json());

const connectToMongoDB = async () => {
  try {
    const client = new MongoClient(process.env.MONGO_URI, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      family: 4
    });
    await client.connect();
    global.db = client.db('Cryptix');
    console.log('\x1b[32m✓\x1b[0m MongoDB connected successfully');
  } catch (error) {
    console.error('\x1b[31m✗\x1b[0m MongoDB connection failed:', error.message);
    process.exit(1);
  }
};

connectToMongoDB();

app.get('/v1/status', (req, res) => {
  const startTime = process.hrtime.bigint();

  const response = {
    message: 'API is Running',
    version: '1',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development'
  };

  const endTime = process.hrtime.bigint();
  const executionTime = Number(endTime - startTime) / 1000000;

  response.executionTime = `${executionTime.toFixed(2)}ms`;

  console.log(`\x1b[32m✓\x1b[0m GET /v1/status - \x1b[33m${response.executionTime}\x1b[0m`);

  res.status(200).json(response);
});

app.use('/v1', userRoutes);
app.use('/v1/keysystems', keysystemsRoutes);

app.use('*', (req, res) => {
  res.status(404).json({
    error: 'endpoint_not_found',
    message: 'The requested endpoint does not exist',
    path: req.originalUrl
  });
});

app.listen(4000, '0.0.0.0', () => {
  console.log('\x1b[36mSeraphix SDK API\x1b[0m - \x1b[32mServer running on port 4000\x1b[0m');
});
