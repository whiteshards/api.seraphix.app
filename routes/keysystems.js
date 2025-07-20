
import express from 'express';
import { authenticateApiToken } from '../middleware/auth.js';
import { findKeysystemsByOwner, findKeysystemById, updateKeyHwid } from '../lib/database.js';
import { createRateLimit } from '../middleware/rateLimit.js';

const router = express.Router();

router.get('/', authenticateApiToken, async (req, res) => {
  const startTime = process.hrtime.bigint();
  
  try {
    const { id: keysystemid } = req.query;
    const user = req.user;
    
    if (!keysystemid) {
      return res.status(400).json({
        error: 'bad_request',
        message: 'Keysystem ID query parameter is required'
      });
    }
    
    const keysystems = await findKeysystemsByOwner(user.discord_id);
    if (!keysystems || keysystems.length === 0) {
      return res.status(404).json({
        error: 'not_found',
        message: 'No keysystems found for this user'
      });
    }
    
    const targetKeysystem = keysystems.find(ks => ks.id === keysystemid);
    
    if (!targetKeysystem) {
      return res.status(404).json({
        error: 'not_found',
        message: 'Keysystem not found or access denied'
      });
    }
    
    const filteredKeysystem = {
      id: targetKeysystem.id,
      name: targetKeysystem.name,
      active: targetKeysystem.active,
      createdAt: targetKeysystem.createdAt,
      settings: {
        maxKeyPerson: targetKeysystem.maxKeyPerson,
        keyCooldown: targetKeysystem.keyCooldown, 
        webhookUrl: targetKeysystem.webhookUrl,
        checkpoints: targetKeysystem.checkpoints ? targetKeysystem.checkpoints.length : 0},
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
    
    console.log(`\x1b[32m✓\x1b[0m GET /v1/keysystems?id=${keysystemid} - \x1b[36m${user.username}\x1b[0m - \x1b[33m${response.executionTime}\x1b[0m`);
    
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

router.post('/keys', createRateLimit(100), async (req, res) => {
  const startTime = process.hrtime.bigint();
  
  try {
    const { id: keysystemId } = req.query;
    const { key, hwid } = req.body;
    
    if (!keysystemId) {
      return res.status(400).json({
        error: 'bad_request',
        message: 'Keysystem ID query parameter is required'
      });
    }
    
    if (typeof key !== 'string' || typeof hwid !== 'string') {
      return res.status(400).json({
        error: 'bad_request',
        message: 'Key and hwid must be strings'
      });
    }
    
    const keysystem = await findKeysystemById(keysystemId);
    
    if (!keysystem) {
      const endTime = process.hrtime.bigint();
      const executionTime = Number(endTime - startTime) / 1000000;
      
      return res.status(400).json({
        message: 'KEY_INVALID',
        executionTime: `${executionTime.toFixed(2)}ms`
      });
    }
    console.log(keysystem)
    let foundKey = null;
    let sessionIndex = -1;
    let keyIndex = -1;
    
    if (keysystem.keys) {
      //console.log(keysystem.keys.length)
      for (let i = 0; i < keysystem.keys.length; i++) {
        const session = keysystem.keys[i];
        if (session.keys && Array.isArray(session.keys)) {
          for (let j = 0; j < session.keys.length; j++) {
            const keyObj = session.keys[j];
            if (keyObj.value === key) {
              foundKey = keyObj;
              sessionIndex = i;
              keyIndex = j;
              break;
            }
          }
        }
        if (foundKey) break;
      }
    }
    
    const endTime = process.hrtime.bigint();
    const executionTime = Number(endTime - startTime) / 1000000;
    
    if (!foundKey) {
      console.log(`\x1b[31m✗\x1b[0m POST /v1/keysystems/keys?id=${keysystemId} - KEY_INVALID - \x1b[33m${executionTime.toFixed(2)}ms\x1b[0m`);
      return res.status(400).json({
        message: 'KEY_INVALID',
        executionTime: `${executionTime.toFixed(2)}ms`
      });
    }
    
    if (foundKey.status !== 'active') {
      console.log(`\x1b[31m✗\x1b[0m POST /v1/keysystems/keys?id=${keysystemId} - KEY_EXPIRED - \x1b[33m${executionTime.toFixed(2)}ms\x1b[0m`);
      return res.status(400).json({
        message: 'KEY_EXPIRED',
        executionTime: `${executionTime.toFixed(2)}ms`
      });
    }
    
    if (foundKey.expires_at && new Date(foundKey.expires_at) < new Date()) {
      console.log(`\x1b[31m✗\x1b[0m POST /v1/keysystems/keys?id=${keysystemId} - KEY_EXPIRED - \x1b[33m${executionTime.toFixed(2)}ms\x1b[0m`);
      return res.status(400).json({
        message: 'KEY_EXPIRED',
        executionTime: `${executionTime.toFixed(2)}ms`
      });
    }
    
    if (!foundKey.hwid) {
      await updateKeyHwid(keysystemId, key, hwid);
      console.log(`\x1b[32m✓\x1b[0m POST /v1/keysystems/keys?id=${keysystemId} - KEY_VALID (HWID_BOUND) - \x1b[33m${executionTime.toFixed(2)}ms\x1b[0m`);
    } else if (foundKey.hwid !== hwid) {
      console.log(`\x1b[31m✗\x1b[0m POST /v1/keysystems/keys?id=${keysystemId} - KEY_HWID_LOCKED - \x1b[33m${executionTime.toFixed(2)}ms\x1b[0m`);
      return res.status(400).json({
        message: 'KEY_HWID_LOCKED',
        executionTime: `${executionTime.toFixed(2)}ms`
      });
    } else {
      console.log(`\x1b[32m✓\x1b[0m POST /v1/keysystems/keys?id=${keysystemId} - KEY_VALID - \x1b[33m${executionTime.toFixed(2)}ms\x1b[0m`);
    }
    
    res.status(200).json({
      message: 'KEY_VALID',
      executionTime: `${executionTime.toFixed(2)}ms`
    });
    
  } catch (error) {
    console.error('\x1b[31m✗\x1b[0m POST /v1/keysystems/keys error:', error.message);
    
    const endTime = process.hrtime.bigint();
    const executionTime = Number(endTime - startTime) / 1000000;
    
    res.status(500).json({
      error: 'internal_server_error',
      message: 'Key verification failed',
      executionTime: `${executionTime.toFixed(2)}ms`
    });
  }
});

export default router;
