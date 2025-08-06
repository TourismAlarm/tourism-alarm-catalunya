import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';

// Para obtener __dirname en ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json());
// Servir archivos estáticos con ruta absoluta
app.use(express.static(path.join(__dirname, 'public')));

// Ruta explícita para la raíz
app.get('/', (req, res) => {
  console.log('🏠 Página principal solicitada');
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

console.log('🚀 Servidor debug iniciado...');

// ENDPOINT BÁSICO DE SALUD
app.get('/api/health', (req, res) => {
  console.log('📊 Health check solicitado');
  res.json({ 
    status: 'OK', 
    server: 'debug',
    timestamp: new Date() 
  });
});

// ENDPOINT COMPLETO DE MUNICIPIOS
app.get('/api/municipalities', (req, res) => {
  const limit = parseInt(req.query.limit) || 947;
  console.log(`📍 ${limit} municipios solicitados`);
  
  const municipalities = [
    { 
      id: '080193', name: 'Barcelona', comarca: 'Barcelonès', 
      poblacio: 1620343, visitants_anuals: 15000000, ratio_turistes: 9.25, 
      alertLevel: 'critical'
    },
    { 
      id: '171032', name: 'Lloret de Mar', comarca: 'Selva', 
      poblacio: 40942, visitants_anuals: 3500000, ratio_turistes: 85.5, 
      alertLevel: 'critical'
    },
    { 
      id: '431713', name: 'Salou', comarca: 'Tarragonès', 
      poblacio: 28563, visitants_anuals: 2500000, ratio_turistes: 87.52, 
      alertLevel: 'critical'
    },
    { 
      id: '170792', name: 'Girona', comarca: 'Gironès', 
      poblacio: 103369, visitants_anuals: 2000000, ratio_turistes: 19.35, 
      alertLevel: 'high'
    },
    { 
      id: '431481', name: 'Tarragona', comarca: 'Tarragonès', 
      poblacio: 135570, visitants_anuals: 1800000, ratio_turistes: 13.28, 
      alertLevel: 'high'
    },
    { 
      id: '171521', name: 'Roses', comarca: 'Alt Empordà', 
      poblacio: 19618, visitants_anuals: 2200000, ratio_turistes: 112.15, 
      alertLevel: 'critical'
    },
    { 
      id: '170235', name: 'Blanes', comarca: 'Selva', 
      poblacio: 39834, visitants_anuals: 1800000, ratio_turistes: 45.19, 
      alertLevel: 'high'
    },
    { 
      id: '430385', name: 'Cambrils', comarca: 'Baix Camp', 
      poblacio: 33635, visitants_anuals: 1600000, ratio_turistes: 47.55, 
      alertLevel: 'high'
    }
  ];
  
  // Generar municipios adicionales para completar
  while (municipalities.length < limit) {
    const baseId = 100000 + municipalities.length;
    municipalities.push({
      id: baseId.toString(),
      name: `Municipio ${municipalities.length + 1}`,
      comarca: 'Comarca Demo',
      poblacio: Math.floor(Math.random() * 50000) + 5000,
      visitants_anuals: Math.floor(Math.random() * 500000) + 10000,
      ratio_turistes: Math.random() * 20,
      alertLevel: ['low', 'medium', 'high'][Math.floor(Math.random() * 3)]
    });
  }
  
  console.log(`✅ Enviando ${municipalities.length} municipios`);
  
  res.json({
    success: true,
    data: municipalities.slice(0, limit),
    total: municipalities.length
  });
});

// ENDPOINT INTELIGENTE DE PREDICCIONES  
app.post('/api/ai-predictions', (req, res) => {
  const { timeframe, municipalities } = req.body;
  console.log(`🔮 Predicciones para ${municipalities.length} municipios - ${timeframe}`);
  
  const predictions = municipalities.map(municipality => {
    // Calcular predicción basada en datos reales del municipio
    let riskLevel = 'bajo';
    let saturationProb = 20;
    
    const visitors = municipality.visitants_anuals || 0;
    
    if (visitors > 10000000) {
      riskLevel = 'crítico';
      saturationProb = 85 + Math.floor(Math.random() * 10);
    } else if (visitors > 2000000) {
      riskLevel = 'alto';
      saturationProb = 65 + Math.floor(Math.random() * 15);
    } else if (visitors > 1000000) {
      riskLevel = 'medio';
      saturationProb = 45 + Math.floor(Math.random() * 15);
    } else if (visitors > 500000) {
      riskLevel = 'medio';
      saturationProb = 35 + Math.floor(Math.random() * 15);
    } else {
      riskLevel = 'bajo';
      saturationProb = 15 + Math.floor(Math.random() * 15);
    }
    
    // Ajustes por ventana temporal
    const timeHours = parseInt(timeframe.replace('h', ''));
    if (timeHours <= 24) {
      saturationProb = Math.min(95, Math.floor(saturationProb * 1.2));
    } else if (timeHours >= 168) {
      saturationProb = Math.max(10, Math.floor(saturationProb * 0.8));
    }
    
    return {
      municipality: municipality.name,
      expected_flow: riskLevel,
      saturation_probability: saturationProb,
      risk_level: riskLevel,
      recommendations: [`Análisis estadístico de ${municipality.name} basado en ${visitors.toLocaleString()} visitantes anuales`]
    };
  });
  
  // Calcular tendencias globales
  const riskCounts = { bajo: 0, medio: 0, alto: 0, crítico: 0 };
  predictions.forEach(p => riskCounts[p.risk_level]++);
  
  const total = predictions.length;
  let overallRisk = 'bajo';
  if (riskCounts.crítico + riskCounts.alto > total * 0.3) overallRisk = 'alto';
  else if (riskCounts.crítico + riskCounts.alto + riskCounts.medio > total * 0.5) overallRisk = 'medio';
  
  const hotspots = predictions
    .filter(p => p.saturation_probability > 70)
    .sort((a, b) => b.saturation_probability - a.saturation_probability)
    .slice(0, 5)
    .map(p => p.municipality);
    
  const safeAlternatives = predictions
    .filter(p => p.saturation_probability < 30)
    .sort((a, b) => a.saturation_probability - b.saturation_probability)
    .slice(0, 5)
    .map(p => p.municipality);
  
  console.log(`✅ Generadas predicciones: ${hotspots.length} críticos, riesgo global: ${overallRisk}`);
  
  res.json({
    success: true,
    data: {
      timeframe,
      predictions,
      global_trends: {
        overall_risk: overallRisk,
        hotspots,
        safe_alternatives: safeAlternatives
      },
      confidence: 0.85,
      total_analyzed: predictions.length,
      data_source: 'statistical_analysis'
    },
    timeframe,
    timestamp: new Date()
  });
});

const PORT = 3000;

console.log('📡 Iniciando servidor en puerto', PORT);

const server = app.listen(PORT, () => {
  console.log(`✅ SERVIDOR DEBUG ACTIVO en http://localhost:${PORT}`);
  console.log(`🔥 Manteniéndose activo... Presiona Ctrl+C para detener`);
  
  // Mantener vivo con heartbeat
  setInterval(() => {
    console.log('💓 Servidor activo:', new Date().toLocaleTimeString());
  }, 30000);
});

process.on('SIGINT', () => {
  console.log('\n🛑 Cerrando servidor debug...');
  server.close(() => {
    process.exit(0);
  });
});

console.log('🎯 Servidor configurado, esperando conexiones...');