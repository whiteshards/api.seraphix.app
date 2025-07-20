import express from 'express';

const app = express();

app.use(express.json());

app.get('/v1/status', (req, res) => {
  const startTime = process.hrtime.bigint();
  
  const response = {
    message: 'API is Running',
    version: '1',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development'
  };
  
  const endTime = process.hrtime.bigint();
  const executionTime = Number(endTime - startTime) / 1000000;
  
  response.executionTime = `${executionTime.toFixed(2)}ms`;
  
  console.log(`\x1b[32m✓\x1b[0m GET /v1/status - \x1b[33m${response.executionTime}\x1b[0m`);
  
  res.status(200).json(response);
});

app.use('*', (req, res) => {
  res.status(404).json({
    error: 'endpoint_not_found',
    message: 'The requested endpoint does not exist',
    path: req.originalUrl
  });
});

app.listen(3000, '0.0.0.0', () => {
  console.log('\x1b[36mSeraphix SDK API\x1b[0m - \x1b[32mServer running on port 3000\x1b[0m');
});
