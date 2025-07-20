
const requestCounts = new Map();

export const createRateLimit = (requestsPerSecond) => {
  return (req, res, next) => {
    const clientId = req.ip || req.connection.remoteAddress;
    const now = Date.now();
    const windowStart = Math.floor(now / 1000) * 1000;
    const key = `${clientId}:${windowStart}`;
    
    const current = requestCounts.get(key) || 0;
    
    if (current >= requestsPerSecond) {
      return res.status(429).json({
        error: 'rate_limit_exceeded',
        message: 'Too many requests, please try again later'
      });
    }
    
    requestCounts.set(key, current + 1);
    
    setTimeout(() => {
      requestCounts.delete(key);
    }, 2000);
    
    next();
  };
};
