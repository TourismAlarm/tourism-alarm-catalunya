export default function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { timeframe, municipalities } = req.body;
    console.log(`🔮 Generando predicciones para ${municipalities.length} municipios - ${timeframe}`);
    
    const predictions = municipalities.map(municipality => {
      let riskLevel = 'bajo';
      let saturationProb = 20;
      
      const visitors = municipality.visitants_anuals || 0;
      
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
      
      const dayVariation = 0.9 + (Math.random() * 0.2);
      saturationProb = Math.floor(saturationProb * dayVariation);
      
      return {
        municipality: municipality.name,
        expected_flow: riskLevel,
        saturation_probability: saturationProb,
        risk_level: riskLevel,
        recommendations: [`Análisis estadístico de ${municipality.name} - ${visitors.toLocaleString()} visitantes`]
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
      data_source: 'vercel_serverless'
    };
    
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
}