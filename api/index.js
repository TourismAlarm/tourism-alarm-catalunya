import express from 'express';
import cors from 'cors';
import { AutonomousMonitor } from '../agents/autonomous/autonomous-monitor.js';
import fetch from 'node-fetch';

const app = express();
app.use(cors());
app.use(express.json());

// Monitor IA
const monitor = new AutonomousMonitor({
  ollamaUrl: 'http://127.0.0.1:11435',
  modelName: 'codellama:7b'
});
global.aiMonitor = monitor;

// Middleware para tracking
app.use((req, res, next) => {
  const start = Date.now();
  const originalSend = res.send;
  
  res.send = function(data) {
    monitor.recordRequest({
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      responseTime: Date.now() - start,
      timestamp: new Date()
    });
    originalSend.call(this, data);
  };
  next();
});

// ============ RUTAS DE LA API ============

// ENDPOINTS DE MONITOREO
app.get('/api/monitor/status', (req, res) => {
  const monitor = global.aiMonitor;
  
  res.json({
    monitoring: true,
    uptime: process.uptime(),
    stats: monitor.getStatus(),
    health: monitor.recentIssues.length === 0 ? 'HEALTHY' : 'ISSUES_DETECTED'
  });
});

app.post('/api/monitor/analyze', async (req, res) => {
  console.log('🔍 Análisis manual solicitado');
  
  try {
    await global.aiMonitor.performDeepAnalysis();
    res.json({
      success: true,
      analysis: global.aiMonitor.lastAnalysis,
      timestamp: new Date()
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ENDPOINT DE PRUEBA DE ERROR
app.get('/api/test-error', (req, res, next) => {
  const error = new Error('Error de prueba para el monitor');
  error.status = 500;
  next(error);
});

// ENDPOINT DE SALUD
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date() });
});
// ENDPOINT: Obtener todos los municipios turísticos principales
app.get('/api/municipalities', async (req, res, next) => {
  try {
    console.log('📍 Cargando municipios turísticos principales...');
    
    // Lista de municipios turísticos clave con sus códigos INE
    const MUNICIPIOS_TURISTICOS = [
      { id: '080193', name: 'Barcelona', tourism_score: 9.8, coastal: false, mountain: false },
      { id: '082704', name: 'Sitges', tourism_score: 8.5, coastal: true, mountain: false },
      { id: '170792', name: 'Girona', tourism_score: 7.2, coastal: false, mountain: false },
      { id: '431482', name: 'Tarragona', tourism_score: 7.5, coastal: true, mountain: false },
      { id: '251207', name: 'Lleida', tourism_score: 5.5, coastal: false, mountain: false },
      { id: '439057', name: 'Salou', tourism_score: 9.0, coastal: true, mountain: false },
      { id: '172023', name: 'Tossa de Mar', tourism_score: 8.0, coastal: true, mountain: false },
      { id: '170340', name: 'Calonge i Sant Antoni', tourism_score: 7.8, coastal: true, mountain: false },
      { id: '171523', name: 'Roses', tourism_score: 8.2, coastal: true, mountain: false },
      { id: '171479', name: 'Ripoll', tourism_score: 6.5, coastal: false, mountain: true },
      { id: '080155', name: 'Badalona', tourism_score: 6.0, coastal: true, mountain: false },
      { id: '171411', name: 'Puigcerdà', tourism_score: 7.0, coastal: false, mountain: true },
      { id: '082649', name: 'Sant Vicenç de Montalt', tourism_score: 6.8, coastal: true, mountain: false },
      { id: '430141', name: 'Amposta', tourism_score: 5.5, coastal: false, mountain: false },
      { id: '171655', name: 'Sant Joan de les Abadesses', tourism_score: 6.2, coastal: false, mountain: true },
      { id: '170499', name: 'Celrà', tourism_score: 5.0, coastal: false, mountain: false },
      { id: '082606', name: 'Santa Perpètua de Mogoda', tourism_score: 4.5, coastal: false, mountain: false },
      { id: '081022', name: 'Igualada', tourism_score: 5.2, coastal: false, mountain: false },
      { id: '080630', name: 'Esplugues de Llobregat', tourism_score: 5.8, coastal: false, mountain: false },
      { id: '081206', name: 'Mataró', tourism_score: 6.5, coastal: true, mountain: false }
    ];
    
    // Obtener datos de población de IDESCAT
    const url = `https://api.idescat.cat/emex/v1/dades.json?i=f171&lang=ca`;
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`IDESCAT API error: ${response.status}`);
    }
    
    const data = await response.json();
    
    // Procesar datos para cada municipio
    const municipalitiesWithData = MUNICIPIOS_TURISTICOS.map(mun => {
      // Buscar el municipio en los datos de IDESCAT
      const municipalities = data.fitxes.cols.col;
      const municipalityIndex = municipalities.findIndex(
        m => m.id === mun.id && m.scheme === 'mun'
      );
      
      if (municipalityIndex === -1) {
        console.warn(`⚠️ Municipio ${mun.name} (${mun.id}) no encontrado`);
        return {
          ...mun,
          population: 0,
          density: 0,
          area_km2: 0,
          latitude: 41.3851, // Coordenadas por defecto (Barcelona)
          longitude: 2.1734
        };
      }
      
      // Obtener datos del municipio
      const municipalityData = municipalities[municipalityIndex];
      const values = data.fitxes.indicadors.i.v.split(',');
      const population = parseInt(values[municipalityIndex]) || 0;
      
      // Coordenadas aproximadas (en producción, usar una base de datos real)
      const coords = getCoordinatesForMunicipality(mun.id);
      
      return {
        id: mun.id,
        name: municipalityData.content,
        population: population,
        area_km2: getAreaForMunicipality(mun.id), // Función helper
        density: Math.round(population / getAreaForMunicipality(mun.id)),
        latitude: coords.lat,
        longitude: coords.lng,
        tourism_score: mun.tourism_score,
        coastal: mun.coastal,
        mountain: mun.mountain,
        comarca: getComarcaForMunicipality(mun.id),
        province: getProvinceForMunicipality(mun.id)
      };
    });
    
    console.log(`✅ Cargados ${municipalitiesWithData.length} municipios`);
    
    res.json({
      success: true,
      data: municipalitiesWithData,
      total: municipalitiesWithData.length,
      source: 'IDESCAT',
      lastUpdate: data.fitxes.indicadors.i.updated
    });
    
  } catch (error) {
    console.error('❌ Error en /api/municipalities:', error);
    next(error);
  }
});

// FUNCIONES HELPER (añadir al final del archivo, antes de export)
function getCoordinatesForMunicipality(id) {
  const coords = {
    '080193': { lat: 41.3851, lng: 2.1734 },    // Barcelona
    '082704': { lat: 41.2372, lng: 1.8059 },    // Sitges
    '170792': { lat: 41.9794, lng: 2.8214 },    // Girona
    '431482': { lat: 41.1189, lng: 1.2445 },    // Tarragona
    '251207': { lat: 41.6148, lng: 0.6218 },    // Lleida
    '439057': { lat: 41.0763, lng: 1.1419 },    // Salou
    '172023': { lat: 41.7218, lng: 2.9307 },    // Tossa de Mar
    '170340': { lat: 41.8931, lng: 3.1639 },    // Calonge
    '171523': { lat: 42.2639, lng: 3.1770 },    // Roses
    '171479': { lat: 42.3139, lng: 2.3655 },    // Ripoll
    '080155': { lat: 41.4470, lng: 2.2450 },    // Badalona
    '171411': { lat: 42.4474, lng: 1.9286 },    // Puigcerdà
    '082649': { lat: 41.5881, lng: 2.5153 },    // Sant Vicenç de Montalt
    '430141': { lat: 40.7125, lng: 0.5816 },    // Amposta
    '171655': { lat: 42.2129, lng: 2.2909 },    // Sant Joan de les Abadesses
    '170499': { lat: 42.0131, lng: 2.7898 },    // Celrà
    '082606': { lat: 41.4874, lng: 2.1060 },    // Santa Perpètua
    '081022': { lat: 41.5789, lng: 1.6175 },    // Igualada
    '080630': { lat: 41.3745, lng: 2.0920 },    // Esplugues
    '081206': { lat: 41.5362, lng: 2.4445 }     // Mataró
  };
  return coords[id] || { lat: 41.3851, lng: 2.1734 };
}

function getAreaForMunicipality(id) {
  const areas = {
    '080193': 101.4,  // Barcelona
    '082704': 43.8,   // Sitges
    '170792': 39.1,   // Girona
    '431482': 55.0,   // Tarragona
    '251207': 211.7,  // Lleida
    '439057': 15.1,   // Salou
    // Añadir más según necesites
  };
  return areas[id] || 50; // Área por defecto
}

function getComarcaForMunicipality(id) {
  const comarcas = {
    '080193': 'Barcelonès',
    '082704': 'Garraf',
    '170792': 'Gironès',
    '431482': 'Tarragonès',
    '251207': 'Segrià',
    // Añadir más
  };
  return comarcas[id] || 'N/A';
}

function getProvinceForMunicipality(id) {
  const firstTwo = id.substring(0, 2);
  switch(firstTwo) {
    case '08': return 'Barcelona';
    case '17': return 'Girona';
    case '25': return 'Lleida';
    case '43': return 'Tarragona';
    default: return 'Catalunya';
  }
}
// ENDPOINT DE MUNICIPIOS (IDESCAT)
app.get('/api/municipalities/:id', async (req, res, next) => {
  try {
    const municipalityId = req.params.id;
    console.log(`📍 Buscando municipio: ${municipalityId}`);
    
    // URL para población total (indicador f171)
    const url = `https://api.idescat.cat/emex/v1/dades.json?i=f171&lang=ca`;
    console.log(`🔗 URL: ${url}`);
    
    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    
    const data = await response.json();
    
    // Verificar estructura de datos
    if (!data.fitxes || !data.fitxes.cols || !data.fitxes.indicadors) {
      throw new Error('Estructura de datos IDESCAT inesperada');
    }
    
    // Buscar el índice del municipio
    const municipalities = data.fitxes.cols.col;
    const municipalityIndex = municipalities.findIndex(
      m => m.id === municipalityId && m.scheme === 'mun'
    );
    
    if (municipalityIndex === -1) {
      const error = new Error(`Municipio ${municipalityId} no encontrado`);
      error.status = 404;
      throw error;
    }
    
    // Obtener datos del municipio
    const municipality = municipalities[municipalityIndex];
    const values = data.fitxes.indicadors.i.v.split(',');
    const population = values[municipalityIndex];
    
    console.log(`✅ Encontrado: ${municipality.content} - Población: ${population}`);
    console.log('📍 Enviando municipios:', municipalitiesWithData[0]);

res.json({
  success: true,
  data: municipalitiesWithData,
  total: municipalitiesWithData.length,
  source: 'IDESCAT',
  lastUpdate: data.fitxes.indicadors.i.updated
});
    res.json({
      success: true,
      municipalityId: municipalityId,
      municipalityName: municipality.content,
      population: parseInt(population),
      year: data.fitxes.indicadors.i.r,
      lastUpdate: data.fitxes.indicadors.i.updated,
      source: 'IDESCAT - Cens de població anual'
    });
    
  } catch (error) {
    console.error('❌ Error IDESCAT:', error.message);
    error.endpoint = 'IDESCAT';
    error.municipalityId = req.params.id;
    next(error);
  }
});

// Aquí puedes añadir más endpoints en el futuro
// app.get('/api/stats', ...)
// app.get('/api/tourism', ...)

// MANEJO DE RUTAS NO ENCONTRADAS (404)
app.use((req, res) => {
  const error = new Error(`Ruta no encontrada: ${req.originalUrl}`);
  error.status = 404;
  
  // Registrar en el monitor
  monitor.recordIssue({
    type: 'not_found',
    endpoint: req.originalUrl,
    method: req.method,
    error: error.message,
    timestamp: new Date(),
    severity: 'warning'
  });
  
  res.status(404).json({ 
    error: 'Ruta no encontrada',
    path: req.originalUrl 
  });
});

// ============ ERROR HANDLER (SIEMPRE AL FINAL) ============
app.use((err, req, res, next) => {
  console.error('❌ Error capturado:', err.message);
  
  monitor.recordIssue({
    type: 'api_error',
    endpoint: req.path,
    method: req.method,
    error: err.message,
    stack: err.stack,
    timestamp: new Date(),
    severity: err.status >= 500 ? 'critical' : 'warning'
  });
  
  res.status(err.status || 500).json({ 
    error: process.env.NODE_ENV === 'production' ? 'Internal Server Error' : err.message 
  });
});

// ============ ARRANCAR SERVIDOR ============
app.listen(3000, async () => {
  console.log('🌐 API en puerto 3000');
  await monitor.startMonitoring();
  console.log('🤖 Monitor IA activado');
  
  console.log('\n📊 Endpoints disponibles:');
  console.log('- GET  /api/health');
  console.log('- GET  /api/monitor/status');
  console.log('- POST /api/monitor/analyze');
  console.log('- GET  /api/test-error');
  console.log('- GET  /api/municipalities/:id');
  console.log('\n🚀 Sistema listo!\n');
});

export default app;