
import express from 'express';
import { authenticateApiToken } from '../middleware/auth.js';
import { findKeysystemsByOwner, findKeysystemById, updateKeyHwid, resetKeyHwid } from '../lib/database.js';
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
    const { key, hwid, discord_id } = req.body;
    
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
    
    if (hwid.length > 300) {
      return res.status(400).json({
        error: 'bad_request',
        message: 'HWID must not exceed 300 characters'
      });
    }
    
    if (discord_id !== undefined) {
      if (typeof discord_id !== 'number' && typeof discord_id !== 'string') {
        return res.status(400).json({
          error: 'bad_request',
          message: 'Discord ID must be a number or string'
        });
      }
      
      const discordIdStr = discord_id.toString();
      if (discordIdStr.length > 48) {
        return res.status(400).json({
          error: 'bad_request',
          message: 'Discord ID must not exceed 48 characters'
        });
      }
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
    let sessionId = null;
    let keyIndex = -1;
    
    if (keysystem.keys) {
      for (const [sessionIdKey, session] of Object.entries(keysystem.keys)) {
        if (session.keys && Array.isArray(session.keys)) {
          for (let j = 0; j < session.keys.length; j++) {
            const keyObj = session.keys[j];
            if (keyObj.value === key) {
              foundKey = keyObj;
              sessionId = sessionIdKey;
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
      await updateKeyHwid(keysystemId, key, hwid, discord_id);
      console.log(`\x1b[32m✓\x1b[0m POST /v1/keysystems/keys?id=${keysystemId} - KEY_VALID (HWID_BOUND) - \x1b[33m${executionTime.toFixed(2)}ms\x1b[0m`);
    } else if (foundKey.hwid !== hwid) {
      console.log(`\x1b[31m✗\x1b[0m POST /v1/keysystems/keys?id=${keysystemId} - KEY_HWID_LOCKED - \x1b[33m${executionTime.toFixed(2)}ms\x1b[0m`);
      return res.status(400).json({
        message: 'KEY_HWID_LOCKED',
        executionTime: `${executionTime.toFixed(2)}ms`
      });
    } else {
      if (discord_id !== undefined) {
        await updateKeyHwid(keysystemId, key, hwid, discord_id);
      }
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

router.patch('/keys/reset', createRateLimit(100), authenticateApiToken, async (req, res) => {
  const startTime = process.hrtime.bigint();
  
  try {
    const { id: keysystemId } = req.query;
    const { key } = req.body;
    const user = req.user;
    
    if (!keysystemId) {
      return res.status(400).json({
        error: 'bad_request',
        message: 'Keysystem ID query parameter is required'
      });
    }
    
    if (typeof key !== 'string') {
      return res.status(400).json({
        error: 'bad_request',
        message: 'Key must be a string'
      });
    }
    
    const keysystems = await findKeysystemsByOwner(user.discord_id);
    if (!keysystems || keysystems.length === 0) {
      return res.status(404).json({
        error: 'not_found',
        message: 'No keysystems found for this user'
      });
    }
    
    const targetKeysystem = keysystems.find(ks => ks.id === keysystemId);
    
    if (!targetKeysystem) {
      return res.status(404).json({
        error: 'not_found',
        message: 'Keysystem not found or access denied'
      });
    }
    
    let foundKey = null;
    let sessionId = null;
    let keyIndex = -1;
    
    if (targetKeysystem.keys) {
      for (const [sessionIdKey, session] of Object.entries(targetKeysystem.keys)) {
        if (session.keys && Array.isArray(session.keys)) {
          for (let j = 0; j < session.keys.length; j++) {
            const keyObj = session.keys[j];
            if (keyObj.value === key) {
              foundKey = keyObj;
              sessionId = sessionIdKey;
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
      console.log(`\x1b[31m✗\x1b[0m PATCH /v1/keysystems/keys/reset?id=${keysystemId} - KEY_NOT_FOUND - \x1b[36m${user.username}\x1b[0m - \x1b[33m${executionTime.toFixed(2)}ms\x1b[0m`);
      return res.status(404).json({
        error: 'not_found',
        message: 'Key not found',
        executionTime: `${executionTime.toFixed(2)}ms`
      });
    }
    
    await resetKeyHwid(keysystemId, key);
    
    console.log(`\x1b[32m✓\x1b[0m PATCH /v1/keysystems/keys/reset?id=${keysystemId} - HWID_RESET - \x1b[36m${user.username}\x1b[0m - \x1b[33m${executionTime.toFixed(2)}ms\x1b[0m`);
    
    res.status(200).json({
      message: 'HWID reset successfully',
      executionTime: `${executionTime.toFixed(2)}ms`
    });
    
  } catch (error) {
    console.error('\x1b[31m✗\x1b[0m PATCH /v1/keysystems/keys/reset error:', error.message);
    
    const endTime = process.hrtime.bigint();
    const executionTime = Number(endTime - startTime) / 1000000;
    
    res.status(500).json({
      error: 'internal_server_error',
      message: 'Failed to reset key HWID',
      executionTime: `${executionTime.toFixed(2)}ms`
    });
  }
});

export default router;
