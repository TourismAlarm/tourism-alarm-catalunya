// Vercel API function - Municipalities endpoint
import { IdescatIntegrator } from '../lib/idescat-integrator.js';
import { CacheManager } from '../lib/cache.js';

const integrator = new IdescatIntegrator();
const cache = new CacheManager();

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { id } = req.query;

    if (id) {
      // Single municipality
      const municipality = await integrator.getMunicipality(id);
      return res.status(200).json({
        success: true,
        data: municipality
      });
    } else {
      // All municipalities
      const cacheKey = 'all-municipalities';
      let municipalities = await cache.get(cacheKey);

      if (!municipalities) {
        municipalities = await integrator.getAllMunicipalities();
        await cache.set(cacheKey, municipalities, 3600); // 1 hour
      }

      return res.status(200).json({
        success: true,
        data: municipalities,
        cached: !!municipalities,
        count: municipalities.length
      });
    }

  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
}