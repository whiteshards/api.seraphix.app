
import express from 'express';
import { authenticateApiToken } from '../middleware/auth.js';

const router = express.Router();

router.get('/me', authenticateApiToken, async (req, res) => {
  const startTime = process.hrtime.bigint();
  
  try {
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

export default router;
