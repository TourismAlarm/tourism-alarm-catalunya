// Vercel API function - System stats
export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  
  const stats = {
    service: 'tourism-alarm-catalunya',
    environment: process.env.NODE_ENV || 'development',
    nodeVersion: process.version,
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    platform: process.platform,
    timestamp: new Date().toISOString(),
    endpoints: {
      health: '/api/health',
      municipalities: '/api/municipalities',
      singleMunicipality: '/api/municipalities?id=[INE_CODE]'
    }
  };

  res.status(200).json(stats);
}