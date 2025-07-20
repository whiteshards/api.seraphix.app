
import express from 'express';
import { authenticateApiToken } from '../middleware/auth.js';
import { findKeysystemsByOwner } from '../lib/database.js';

const router = express.Router();

router.get('/:keysystemid', authenticateApiToken, async (req, res) => {
  const startTime = process.hrtime.bigint();
  
  try {
    const { keysystemid } = req.params;
    const user = req.user;
    
    if (!keysystemid) {
      return res.status(400).json({
        error: 'bad_request',
        message: 'Keysystem ID is required'
      });
    }
    
    const keysystems = await findKeysystemsByOwner(user.discord_id);
    
    if (!keysystems || keysystems.length === 0) {
      return res.status(404).json({
        error: 'not_found',
        message: 'No keysystems found for this user'
      });
    }
    
    const targetKeysystem = keysystems.find(ks => ks._id.toString() === keysystemid);
    
    if (!targetKeysystem) {
      return res.status(404).json({
        error: 'not_found',
        message: 'Keysystem not found or access denied'
      });
    }
    
    const filteredKeysystem = {
      _id: targetKeysystem._id,
      name: targetKeysystem.name,
      maxKeyPerforum: targetKeysystem.maxKeyPerforum,
      keyTier: targetKeysystem.keyTier,
      keyCooldown: targetKeysystem.keyCooldown,
      maxKeyLeft: targetKeysystem.maxKeyLeft,
      webhookUrl: targetKeysystem.webhookUrl,
      active: targetKeysystem.active,
      createdAt: targetKeysystem.createdAt,
      checkpoints: targetKeysystem.checkpoints ? targetKeysystem.checkpoints.length : 0,
      owner: targetKeysystem.owner
    };
    
    const endTime = process.hrtime.bigint();
    const executionTime = Number(endTime - startTime) / 1000000;
    
    const response = {
      message: 'Keysystem retrieved successfully',
      data: {
        keysystem: filteredKeysystem
      },
      executionTime: `${executionTime.toFixed(2)}ms`
    };
    
    console.log(`\x1b[32m✓\x1b[0m GET /v1/keysystems/${keysystemid} - \x1b[36m${user.username}\x1b[0m - \x1b[33m${response.executionTime}\x1b[0m`);
    
    res.status(200).json(response);
    
  } catch (error) {
    console.error('\x1b[31m✗\x1b[0m GET /v1/keysystems error:', error.message);
    
    const endTime = process.hrtime.bigint();
    const executionTime = Number(endTime - startTime) / 1000000;
    
    res.status(500).json({
      error: 'internal_server_error',
      message: 'Failed to retrieve keysystem',
      executionTime: `${executionTime.toFixed(2)}ms`
    });
  }
});

export default router;
