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
