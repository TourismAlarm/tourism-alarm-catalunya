// Servidor MÍNIMO solo con Node.js puro
import { createServer } from 'http';
import { readFile } from 'fs/promises';
import { fileURLToPath } from 'url';
import path from 'path';
import url from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🚀 Servidor mínimo iniciando...');

const server = createServer(async (req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;
  
  console.log(`📍 Request: ${req.method} ${pathname}`);
  
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }
  
  try {
    if (pathname === '/' || pathname === '/index.html') {
      const html = await readFile(path.join(__dirname, 'public', 'index.html'), 'utf8');
      res.setHeader('Content-Type', 'text/html');
      res.writeHead(200);
      res.end(html);
      
    } else if (pathname === '/script.js') {
      const js = await readFile(path.join(__dirname, 'public', 'script.js'), 'utf8');
      res.setHeader('Content-Type', 'application/javascript');
      res.writeHead(200);
      res.end(js);
      
    } else if (pathname === '/style.css') {
      const css = await readFile(path.join(__dirname, 'public', 'style.css'), 'utf8');
      res.setHeader('Content-Type', 'text/css');
      res.writeHead(200);
      res.end(css);
      
    } else if (pathname === '/api/health') {
      res.setHeader('Content-Type', 'application/json');
      res.writeHead(200);
      res.end(JSON.stringify({ 
        status: 'OK', 
        server: 'minimal',
        timestamp: new Date() 
      }));
      
    } else if (pathname === '/api/municipalities') {
      const municipalities = [
        { id: '080193', name: 'Barcelona', poblacio: 1620343, visitants_anuals: 15000000, alertLevel: 'critical' },
        { id: '171032', name: 'Lloret de Mar', poblacio: 40942, visitants_anuals: 3500000, alertLevel: 'critical' },
        { id: '431713', name: 'Salou', poblacio: 28563, visitants_anuals: 2500000, alertLevel: 'critical' }
      ];
      
      // Generar más municipios
      while (municipalities.length < 947) {
        municipalities.push({
          id: (100000 + municipalities.length).toString(),
          name: `Municipio ${municipalities.length + 1}`,
          poblacio: Math.floor(Math.random() * 50000) + 5000,
          visitants_anuals: Math.floor(Math.random() * 500000) + 10000,
          alertLevel: 'medium'
        });
      }
      
      res.setHeader('Content-Type', 'application/json');
      res.writeHead(200);
      res.end(JSON.stringify({
        success: true,
        data: municipalities,
        total: municipalities.length
      }));
      
    } else if (pathname === '/api/ai-predictions' && req.method === 'POST') {
      let body = '';
      req.on('data', chunk => body += chunk);
      req.on('end', () => {
        try {
          const data = JSON.parse(body);
          const predictions = data.municipalities.map(m => ({
            municipality: m.name,
            expected_flow: m.visitants_anuals > 5000000 ? 'crítico' : m.visitants_anuals > 1000000 ? 'alto' : 'medio',
            saturation_probability: Math.floor(Math.random() * 40) + 40,
            risk_level: m.visitants_anuals > 5000000 ? 'crítico' : m.visitants_anuals > 1000000 ? 'alto' : 'medio',
            recommendations: [`Análisis de ${m.name}`]
          }));
          
          res.setHeader('Content-Type', 'application/json');
          res.writeHead(200);
          res.end(JSON.stringify({
            success: true,
            data: {
              predictions,
              global_trends: { overall_risk: 'medio', hotspots: ['Barcelona'], safe_alternatives: [] },
              confidence: 0.8
            }
          }));
        } catch (e) {
          res.writeHead(400);
          res.end('Bad Request');
        }
      });
      
    } else {
      res.writeHead(404);
      res.end('Not Found');
    }
    
  } catch (error) {
    console.error('Error:', error);
    res.writeHead(500);
    res.end('Server Error');
  }
});

const PORT = 3000;

server.listen(PORT, () => {
  console.log(`🚀 SERVIDOR MÍNIMO ejecutándose en http://localhost:${PORT}`);
  console.log(`✅ Solo Node.js puro - sin dependencias externas`);
  console.log(`🔥 Servidor ACTIVO - Ctrl+C para parar`);
  
  // Mantener vivo
  setInterval(() => {
    console.log(`💓 Servidor activo: ${new Date().toLocaleTimeString()}`);
  }, 30000);
});

process.on('SIGINT', () => {
  console.log('\n🛑 Cerrando servidor...');
  server.close(() => {
    process.exit(0);
  });
});