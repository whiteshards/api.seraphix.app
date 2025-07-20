
export const getDatabase = () => {
  if (!global.db) {
    throw new Error('Database connection not available');
  }
  return global.db;
};

export const findKeysystemsByOwner = async (ownerId) => {
  const db = getDatabase();
  return await db.collection('keysystems').find({ 
    owner: ownerId 
  }).toArray();
};
