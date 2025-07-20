
export const authenticateApiToken = async (req, res, next) => {
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
    const db = global.db;
    if (!db) {
      return res.status(503).json({
        error: 'service_unavailable',
        message: 'Database connection not available'
      });
    }
    
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
