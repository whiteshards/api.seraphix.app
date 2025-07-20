
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
