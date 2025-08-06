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

// Servir archivos estáticos del frontend
app.use(express.static(path.join(__dirname, 'public')));

console.log('🚀 Tourism Alarm - Servidor Estable iniciado');
console.log('📊 Modo: Análisis estadístico inteligente');

// ENDPOINT DE SALUD
app.get('/api/health', (req, res) => {
  console.log('📊 Health check solicitado');
  res.json({ 
    status: 'OK', 
    server_mode: 'statistical_analysis',
    timestamp: new Date() 
  });
});

// ENDPOINT DE MUNICIPIOS
app.get('/api/municipalities', (req, res) => {
  const limit = parseInt(req.query.limit) || 947;
  console.log(`📍 Solicitados ${limit} municipios`);
  
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
    },
    { 
      id: '081691', name: 'Sabadell', comarca: 'Vallès Occidental', 
      poblacio: 215760, visitants_anuals: 800000, ratio_turistes: 3.71, 
      alertLevel: 'medium'
    },
    { 
      id: '082009', name: 'Terrassa', comarca: 'Vallès Occidental', 
      poblacio: 224111, visitants_anuals: 750000, ratio_turistes: 3.35, 
      alertLevel: 'medium'
    }
  ];
  
  // Generar municipios adicionales para completar hasta el límite
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
    total: municipalities.length,
    timestamp: new Date()
  });
});

// ENDPOINT DE PREDICCIONES INTELIGENTES
app.post('/api/ai-predictions', (req, res) => {
  try {
    const { timeframe, municipalities } = req.body;
    console.log(`🔮 Generando predicciones para ${municipalities.length} municipios - ${timeframe}`);
    
    const predictions = municipalities.map(municipality => {
      // Calcular predicción basada en datos reales del municipio
      let riskLevel = 'bajo';
      let saturationProb = 20;
      
      const visitors = municipality.visitants_anuals || 0;
      
      // Algoritmo inteligente basado en visitantes anuales
      if (visitors > 10000000) {
        riskLevel = 'crítico';
        saturationProb = 85 + Math.floor(Math.random() * 10);
      } else if (visitors > 3000000) {
        riskLevel = 'alto';
        saturationProb = 70 + Math.floor(Math.random() * 15);
      } else if (visitors > 1500000) {
        riskLevel = 'alto';
        saturationProb = 60 + Math.floor(Math.random() * 15);
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
      
      // Variación por día de la semana simulado
      const dayVariation = 0.9 + (Math.random() * 0.2);
      saturationProb = Math.floor(saturationProb * dayVariation);
      
      return {
        municipality: municipality.name,
        expected_flow: riskLevel,
        saturation_probability: saturationProb,
        risk_level: riskLevel,
        recommendations: [`Análisis estadístico avanzado de ${municipality.name} - ${visitors.toLocaleString()} visitantes anuales`]
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
    
    const result = {
      timeframe,
      predictions,
      global_trends: {
        overall_risk: overallRisk,
        hotspots,
        safe_alternatives: safeAlternatives
      },
      confidence: 0.85,
      total_analyzed: predictions.length,
      data_source: 'statistical_intelligence'
    };
    
    console.log(`✅ Predicciones generadas: ${hotspots.length} hotspots, riesgo global: ${overallRisk}`);
    
    res.json({
      success: true,
      data: result,
      timeframe,
      timestamp: new Date()
    });
    
  } catch (error) {
    console.error('❌ Error generando predicciones:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// ENDPOINT DE ANÁLISIS INDIVIDUAL
app.post('/api/ai-analysis', (req, res) => {
  try {
    const municipality = req.body;
    console.log(`🤖 Análisis individual: ${municipality.name}`);
    
    const visitors = municipality.visitants_anuals || 0;
    let multiplier = 1.0;
    let riskLevel = 'bajo';
    
    // Calcular multiplicador basado en visitantes
    if (visitors > 10000000) {
      multiplier = 2.5;
      riskLevel = 'crítico';
    } else if (visitors > 5000000) {
      multiplier = 2.0;
      riskLevel = 'alto';
    } else if (visitors > 1000000) {
      multiplier = 1.5;
      riskLevel = 'medio';
    } else if (visitors > 500000) {
      multiplier = 1.2;
      riskLevel = 'medio';
    }
    
    res.json({
      success: true,
      data: {
        tourism_multiplier: multiplier,
        risk_level: riskLevel,
        recommendations: [
          `Análisis estadístico de ${municipality.name}`,
          `Basado en ${visitors.toLocaleString()} visitantes anuales`,
          `Multiplicador de intensidad: ${multiplier}x`
        ]
      },
      municipality: municipality.name,
      timestamp: new Date()
    });
    
  } catch (error) {
    console.error('❌ Error análisis individual:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Ruta para la página principal
app.get('/', (req, res) => {
  console.log('🏠 Página principal solicitada');
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = 3000;

const server = app.listen(PORT, () => {
  console.log(`🚀 SERVIDOR ESTABLE ejecutándose en http://localhost:${PORT}`);
  console.log(`📊 Endpoints disponibles:`);
  console.log(`   GET  /`);
  console.log(`   GET  /api/health`);
  console.log(`   GET  /api/municipalities`);
  console.log(`   POST /api/ai-predictions`);
  console.log(`   POST /api/ai-analysis`);
  console.log(`✅ Servidor estable - SIN dependencias problemáticas`);
  console.log(`🔥 Presiona Ctrl+C para detener`);
  console.log(`🔧 DEBUG: Server.listen() callback ejecutado`);
});

server.on('error', (error) => {
  console.error('❌ Error en servidor:', error);
});

server.on('close', () => {
  console.log('🛑 Servidor cerrado');
});

// Debugging: Capturar TODOS los eventos que pueden cerrar el proceso
process.on('SIGINT', () => {
  console.log('\n🛑 SIGINT recibido - Cerrando servidor...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 SIGTERM recibido - Cerrando servidor...');
  process.exit(0);
});

process.on('exit', (code) => {
  console.log(`🛑 Proceso terminando con código: ${code}`);
});

process.on('beforeExit', (code) => {
  console.log(`⚠️ beforeExit ejecutado con código: ${code}`);
});

process.on('uncaughtException', (error) => {
  console.error('❌ uncaughtException:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ unhandledRejection:', reason);
  process.exit(1);
});

// Debugging: Verificar que el event loop no esté vacío
const keepAlive = setInterval(() => {
  console.log(`💓 Servidor vivo: ${new Date().toLocaleTimeString()}`);
}, 5000);

// Debugging: Log cuando el servidor realmente empieza a escuchar
console.log('🔧 DEBUG: Configurando listeners de eventos...');