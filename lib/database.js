
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
  
  await db.collection('customers').updateOne(
    {
      'keysystems.id': keysystemId,
      'keysystems.keys.keys.value': keyValue
    },
    {
      $set: {
        'keysystems.$[ks].keys.$[session].keys.$[key].hwid': hwid
      }
    },
    {
      arrayFilters: [
        { 'ks.id': keysystemId },
        {},
        { 'key.value': keyValue }
      ]
    }
  );
};
