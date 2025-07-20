
export const getDatabase = () => {
  if (!global.db) {
    throw new Error('Database connection not available');
  }
  return global.db;
};

export const findKeysystemsByOwner = async (ownerId) => {
  const db = getDatabase();
  const customer = await db.collection('customers').findOne({ 
    discord_id: ownerId 
  });
  return customer ? customer.keysystems || [] : [];
};

export const findKeysystemById = async (keysystemId) => {
  const db = getDatabase();
  const customer = await db.collection('customers').findOne({
    'keysystems.id': keysystemId
  });
  
  if (!customer) return null;
  
  return customer.keysystems.find(ks => ks.id === keysystemId);
};

export const updateKeyHwid = async (keysystemId, keyValue, hwid) => {
  const db = getDatabase();
  
  const keysystem = await findKeysystemById(keysystemId);
  if (!keysystem || !keysystem.keys) return;
  
  for (const [sessionId, session] of Object.entries(keysystem.keys)) {
    if (session.keys && Array.isArray(session.keys)) {
      for (let i = 0; i < session.keys.length; i++) {
        if (session.keys[i].value === keyValue) {
          await db.collection('customers').updateOne(
            { 'keysystems.id': keysystemId },
            {
              $set: {
                [`keysystems.$[ks].keys.${sessionId}.keys.${i}.hwid`]: hwid
              }
            },
            {
              arrayFilters: [{ 'ks.id': keysystemId }]
            }
          );
          return;
        }
      }
    }
  }
};

export const resetKeyHwid = async (keysystemId, keyValue) => {
  const db = getDatabase();
  
  const keysystem = await findKeysystemById(keysystemId);
  if (!keysystem || !keysystem.keys) return;
  
  for (const [sessionId, session] of Object.entries(keysystem.keys)) {
    if (session.keys && Array.isArray(session.keys)) {
      for (let i = 0; i < session.keys.length; i++) {
        if (session.keys[i].value === keyValue) {
          await db.collection('customers').updateOne(
            { 'keysystems.id': keysystemId },
            {
              $set: {
                [`keysystems.$[ks].keys.${sessionId}.keys.${i}.hwid`]: null
              }
            },
            {
              arrayFilters: [{ 'ks.id': keysystemId }]
            }
          );
          return;
        }
      }
    }
  }
};
