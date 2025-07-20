import express from 'express';
import { MongoClient } from 'mongodb';

const app = express();
app.use(express.json());

let db;
const connectToMongoDB = async () => {
  try {
    const client = new MongoClient(process.env.MONGO_URI, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      family: 4
    });
    await client.connect();
    db = client.db('Cryptix');
    console.log('\x1b[32m✓\x1b[0m MongoDB connected successfully');
  } catch (error) {
    console.error('\x1b[31m✗\x1b[0m MongoDB connection failed:', error.message);
    process.exit(1);
  }
};

const authenticateApiToken = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      error: 'unauthorized',
      message: 'Bearer token required'
    });
  }
  
  const token = authHeader.substring(7);
  
  if (!token) {
    return res.status(401).json({
      error: 'unauthorized',
      message: 'Invalid token format'
    });
  }
  
  try {
    const user = await db.collection('customers').findOne({ api_token: token });
    
    if (!user) {
      return res.status(401).json({
        error: 'unauthorized',
        message: 'Invalid API token'
      });
    }
    
    req.user = user;
    next();
  } catch (error) {
    console.error('\x1b[31m✗\x1b[0m Auth error:', error.message);
    return res.status(500).json({
      error: 'internal_server_error',
      message: 'Authentication service unavailable'
    });
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

app.get('/v1/me', authenticateApiToken, async (req, res) => {
  const startTime = process.hrtime.bigint();
  
  try {
    if (!db) {
      return res.status(503).json({
        error: 'service_unavailable',
        message: 'Database connection not available'
      });
    }
    
    const user = req.user;
    
    const response = {
      message: 'User profile retrieved successfully',
      data: {
        username: user.username,
        discord_id: user.discord_id,
        created_at: user.created_at,
        api_key_created_at: user.api_token_created_at
      }
    };
    
    const endTime = process.hrtime.bigint();
    const executionTime = Number(endTime - startTime) / 1000000;
    
    response.executionTime = `${executionTime.toFixed(2)}ms`;
    
    console.log(`\x1b[32m✓\x1b[0m GET /v1/me - \x1b[36m${user.username}\x1b[0m - \x1b[33m${response.executionTime}\x1b[0m`);
    
    res.status(200).json(response);
    
  } catch (error) {
    console.error('\x1b[31m✗\x1b[0m GET /v1/me error:', error.message);
    
    const endTime = process.hrtime.bigint();
    const executionTime = Number(endTime - startTime) / 1000000;
    
    res.status(500).json({
      error: 'internal_server_error',
      message: 'Failed to retrieve user profile',
      executionTime: `${executionTime.toFixed(2)}ms`
    });
  }
});

app.use('*', (req, res) => {
  res.status(404).json({
    error: 'endpoint_not_found',
    message: 'The requested endpoint does not exist',
    path: req.originalUrl
  });
});

app.listen(3000, '0.0.0.0', () => {
  console.log('\x1b[36mSeraphix SDK API\x1b[0m - \x1b[32mServer running on port 3000\x1b[0m');
});
