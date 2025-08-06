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

// ENDPOINT DE PREDICCIONES IA REALES PARA HEATMAP
app.post('/api/ai-predictions', async (req, res) => {
  try {
    const { timeframe, municipalities } = req.body;
    console.log(`🔮 Predicciones IA solicitadas para ${timeframe} - ${municipalities.length} municipios`);
    
    // Importar agente predictor
    const { TourismPredictorAgent } = await import('../agents/predictors/tourism_predictor.js');
    const predictor = new TourismPredictorAgent();
    
    // Ejecutar predicciones reales
    const predictions = await predictor.predictTourismFlow(municipalities, timeframe);
    
    res.json({
      success: true,
      data: predictions,
      timeframe,
      timestamp: new Date()
    });
    
  } catch (error) {
    console.error('❌ Error en predicciones IA:', error);
    
    // Fallback rápido con predicciones basadas en datos municipales
    console.log(`🔄 Fallback rápido: Generando predicciones para ${municipalities.length} municipios`);
    
    const predictions = municipalities.map(municipality => {
      // Calcular riesgo basado en datos del municipio
      let riskLevel = 'bajo';
      let saturationProb = 20;
      
      if (municipality.visitants_anuals > 5000000) {
        riskLevel = 'alto';
        saturationProb = 60 + Math.floor(Math.random() * 30);
      } else if (municipality.visitants_anuals > 1000000) {
        riskLevel = 'medio'; 
        saturationProb = 40 + Math.floor(Math.random() * 30);
      } else if (municipality.visitants_anuals > 500000) {
        riskLevel = 'medio';
        saturationProb = 30 + Math.floor(Math.random() * 25);
      } else {
        riskLevel = 'bajo';
        saturationProb = 10 + Math.floor(Math.random() * 20);
      }
      
      // Ajustes por ventana temporal
      const timeHours = parseInt(timeframe.replace('h', ''));
      if (timeHours <= 24) {
        saturationProb = Math.min(90, saturationProb * 1.2); // Más saturación a corto plazo
      } else if (timeHours >= 168) {
        saturationProb = Math.max(10, saturationProb * 0.8); // Menos saturación a largo plazo
      }
      
      return {
        municipality: municipality.name,
        expected_flow: riskLevel,
        saturation_probability: Math.floor(saturationProb),
        risk_level: riskLevel,
        recommendations: [`Monitorear ${municipality.name} - ${municipality.visitants_anuals?.toLocaleString() || 'N/A'} visitantes anuales`]
      };
    });
    
    const fallbackPredictions = {
      timeframe,
      predictions,
      global_trends: {
        overall_risk: calculateOverallRisk(predictions),
        hotspots: findHotspots(predictions),
        safe_alternatives: findSafeAlternatives(predictions)
      },
      confidence: 0.7,
      total_analyzed: predictions.length,
      data_source: 'statistical_analysis'
    };
    
    res.json({
      success: true,
      data: fallbackPredictions,
      fallback: true,
      timeframe,
      timestamp: new Date()
    });
  }
});

// Funciones auxiliares para análisis global
function calculateOverallRisk(predictions) {
  const riskCounts = { bajo: 0, medio: 0, alto: 0, crítico: 0 };
  predictions.forEach(p => riskCounts[p.risk_level] = (riskCounts[p.risk_level] || 0) + 1);
  
  const total = predictions.length;
  if (riskCounts.alto + riskCounts.crítico > total * 0.3) return 'alto';
  if (riskCounts.alto + riskCounts.crítico > total * 0.15) return 'medio';
  return 'bajo';
}

function findHotspots(predictions) {
  return predictions
    .filter(p => p.saturation_probability > 70)
    .sort((a, b) => b.saturation_probability - a.saturation_probability)
    .slice(0, 5)
    .map(p => p.municipality);
}

function findSafeAlternatives(predictions) {
  return predictions
    .filter(p => p.saturation_probability < 30 && p.risk_level === 'bajo')
    .sort((a, b) => a.saturation_probability - b.saturation_probability)
    .slice(0, 5)
    .map(p => p.municipality);
}

// ENDPOINT DE ANÁLISIS IA PARA HEATMAP (individual)
app.post('/api/ai-analysis', async (req, res) => {
  try {
    console.log('🤖 Análisis IA solicitado para:', req.body.name);
    
    // Importar agente collector
    const { TourismCollectorAgent } = await import('../agents/collectors/tourism_collector.js');
    const collector = new TourismCollectorAgent();
    
    // Ejecutar análisis completo
    const aiAnalysis = await collector.analyzeMunicipality(req.body);
    
    // Parsear el resultado JSON
    const parsed = JSON.parse(aiAnalysis);
    
    res.json({
      success: true,
      data: parsed,
      municipality: req.body.name,
      timestamp: new Date()
    });
    
  } catch (error) {
    console.error('❌ Error en análisis IA:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message,
      municipality: req.body.name 
    });
  }
});

// Puerto y inicio del servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 API Tourism Alarm Catalunya ejecutándose en puerto ${PORT}`);
  console.log(`📊 Monitor IA activo - health endpoint: http://localhost:${PORT}/api/health`);
});
