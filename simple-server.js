import express from 'express';
import cors from 'cors';

const app = express();
app.use(cors());
app.use(express.json());

console.log('🚀 Servidor simple iniciado');

// ENDPOINT DE SALUD
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date() });
});

// ENDPOINT DE PREDICCIONES IA OPTIMIZADO
app.post('/api/ai-predictions', async (req, res) => {
  try {
    const { timeframe, municipalities } = req.body;
    console.log(`🔮 Predicciones para ${municipalities.length} municipios - ${timeframe}`);
    
    // Generar predicciones rápidas basadas en datos municipales
    const predictions = municipalities.map(municipality => {
      let riskLevel = 'bajo';
      let saturationProb = 20;
      
      // Calcular riesgo basado en visitantes
      const visitors = municipality.visitants_anuals || 0;
      if (visitors > 5000000) {
        riskLevel = 'alto';
        saturationProb = 60 + Math.floor(Math.random() * 30);
      } else if (visitors > 1000000) {
        riskLevel = 'medio'; 
        saturationProb = 40 + Math.floor(Math.random() * 30);
      } else if (visitors > 500000) {
        riskLevel = 'medio';
        saturationProb = 30 + Math.floor(Math.random() * 25);
      } else {
        riskLevel = 'bajo';
        saturationProb = 10 + Math.floor(Math.random() * 20);
      }
      
      // Ajustes temporales
      const timeHours = parseInt(timeframe.replace('h', ''));
      if (timeHours <= 24) {
        saturationProb = Math.min(90, Math.floor(saturationProb * 1.2));
      } else if (timeHours >= 168) {
        saturationProb = Math.max(10, Math.floor(saturationProb * 0.8));
      }
      
      return {
        municipality: municipality.name,
        expected_flow: riskLevel,
        saturation_probability: saturationProb,
        risk_level: riskLevel,
        recommendations: [`Monitorear ${municipality.name}`]
      };
    });
    
    // Calcular tendencias globales
    const riskCounts = { bajo: 0, medio: 0, alto: 0 };
    predictions.forEach(p => riskCounts[p.risk_level] = (riskCounts[p.risk_level] || 0) + 1);
    
    const total = predictions.length;
    let overallRisk = 'bajo';
    if (riskCounts.alto > total * 0.3) overallRisk = 'alto';
    else if (riskCounts.alto + riskCounts.medio > total * 0.5) overallRisk = 'medio';
    
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
      confidence: 0.8,
      total_analyzed: predictions.length,
      data_source: 'optimized_analysis'
    };
    
    console.log(`✅ ${predictions.length} predicciones generadas exitosamente`);
    
    res.json({
      success: true,
      data: result,
      timeframe,
      timestamp: new Date()
    });
    
  } catch (error) {
    console.error('❌ Error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// ENDPOINT DE ANÁLISIS INDIVIDUAL
app.post('/api/ai-analysis', async (req, res) => {
  try {
    const municipality = req.body;
    console.log('🤖 Análisis individual:', municipality.name);
    
    const visitors = municipality.visitants_anuals || 0;
    let multiplier = 1.0;
    let riskLevel = 'medio';
    
    if (visitors > 5000000) {
      multiplier = 2.5;
      riskLevel = 'alto';
    } else if (visitors > 1000000) {
      multiplier = 1.8;
      riskLevel = 'medio';
    } else {
      multiplier = 1.0;
      riskLevel = 'bajo';
    }
    
    res.json({
      success: true,
      data: {
        tourism_multiplier: multiplier,
        risk_level: riskLevel,
        recommendations: [`Análisis de ${municipality.name}`]
      },
      municipality: municipality.name,
      timestamp: new Date()
    });
    
  } catch (error) {
    console.error('❌ Error análisis individual:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message,
      municipality: req.body.name 
    });
  }
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`🚀 Servidor simple ejecutándose en http://localhost:${PORT}`);
  console.log(`📊 Endpoints disponibles:`);
  console.log(`   GET  /api/health`);
  console.log(`   POST /api/ai-predictions`);
  console.log(`   POST /api/ai-analysis`);
});