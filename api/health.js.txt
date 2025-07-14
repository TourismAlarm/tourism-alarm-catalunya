// Vercel API function - Health check
export default function handler(req, res) {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'tourism-alarm-catalunya',
    version: '1.0.0',
    uptime: process.uptime(),
    memory: process.memoryUsage()
  });
}