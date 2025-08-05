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
    
    // Fallback con predicciones simuladas
    const fallbackPredictions = {
      timeframe,
      predictions: municipalities.slice(0, 10).map(m => ({
        municipality: m.name,
        expected_flow: ['bajo', 'medio', 'alto'][Math.floor(Math.random() * 3)],
        saturation_probability: Math.floor(Math.random() * 100),
        risk_level: ['bajo', 'medio', 'alto'][Math.floor(Math.random() * 3)],
        recommendations: [`Monitorear ${m.name}`]
      })),
      global_trends: {
        overall_risk: 'medio',
        hotspots: ['Barcelona', 'Lloret de Mar'],
        safe_alternatives: ['Municipios rurales']
      },
      confidence: 0.6
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
