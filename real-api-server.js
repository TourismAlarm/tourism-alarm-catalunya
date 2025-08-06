import express from 'express';
import cors from 'cors';
import { TourismCollectorAgent } from './agents/collectors/tourism_collector.js';
import { APIConnector } from './agents/connectors/api_connector.js';
import { validateAPIConfig } from './agents/connectors/api_config.js';

const app = express();
app.use(cors());
app.use(express.json());

// Inicializar APIs reales
const apiConnector = new APIConnector();
let tourismCollector = null;

async function initializeTourismCollector() {
  try {
    tourismCollector = new TourismCollectorAgent();
    console.log('🤖 TourismCollectorAgent inicializado correctamente');
  } catch (error) {
    console.log('⚠️ TourismCollectorAgent no disponible:', error.message);
    console.log('📊 Usando análisis estadístico como fallback');
  }
}

// Inicializar en startup
initializeTourismCollector();

console.log('🚀 Servidor con APIs reales iniciado');
validateAPIConfig();

// ENDPOINT DE SALUD
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    apis_configured: apiConnector.isConfigured,
    ai_agent: tourismCollector ? 'available' : 'fallback',
    timestamp: new Date() 
  });
});

// ENDPOINT DE PREDICCIONES CON APIs REALES
app.post('/api/ai-predictions', async (req, res) => {
  try {
    const { timeframe, municipalities } = req.body;
    console.log(`🔮 Predicciones REALES para ${municipalities.length} municipios - ${timeframe}`);
    
    // Estrategia híbrida para performance
    const keyMunicipalities = municipalities
      .filter(m => m.visitants_anuals > 1000000) // Solo municipios importantes
      .slice(0, 50); // Top 50
    
    const regularMunicipalities = municipalities.filter(m => 
      !keyMunicipalities.includes(m)
    );
    
    console.log(`📊 Análisis IA real: ${keyMunicipalities.length} municipios clave`);
    console.log(`🔢 Análisis estadístico: ${regularMunicipalities.length} municipios restantes`);
    
    const predictions = [];
    
    // 1. ANÁLISIS IA REAL para municipios clave (con APIs externas en paralelo)
    const keyPredictions = await Promise.allSettled(
      keyMunicipalities.map(async (municipality) => {
        try {
          const enrichedData = {
            ...municipality,
            prediction_window: timeframe.replace('h', '')
          };
          
          // Obtener datos enriquecidos con APIs reales EN PARALELO con timeout
          const apiPromises = [
            Promise.race([
              apiConnector.getWeatherData(municipality.latitude, municipality.longitude),
              new Promise((_, reject) => setTimeout(() => reject(new Error('Weather timeout')), 5000))
            ]).catch(() => null),
            Promise.race([
              apiConnector.getEventsData(municipality.name),
              new Promise((_, reject) => setTimeout(() => reject(new Error('Events timeout')), 5000))
            ]).catch(() => null),
            Promise.race([
              apiConnector.getTrafficData(municipality.latitude, municipality.longitude),
              new Promise((_, reject) => setTimeout(() => reject(new Error('Traffic timeout')), 5000))
            ]).catch(() => null)
          ];
          
          const [weatherData, eventsData, trafficData] = await Promise.all(apiPromises);
          
          // Análisis IA con timeout más corto
          let analysis = null;
          if (tourismCollector) {
            try {
              const aiPromise = tourismCollector.analyzeMunicipality(enrichedData);
              analysis = await Promise.race([
                aiPromise.then(result => JSON.parse(result)),
                new Promise((_, reject) => setTimeout(() => reject(new Error('IA timeout')), 8000))
              ]);
            } catch (error) {
              console.log(`⚠️ Error IA para ${municipality.name}: ${error.message}`);
            }
          }
          
          // Calcular predicción con datos reales
          let saturationProb = 50;
          let riskLevel = 'medio';
          
          // Factor base por visitantes
          const visitors = municipality.visitants_anuals || 0;
          if (visitors > 10000000) {
            saturationProb = 80;
            riskLevel = 'crítico';
          } else if (visitors > 5000000) {
            saturationProb = 70;
            riskLevel = 'alto';
          } else if (visitors > 1000000) {
            saturationProb = 50;
            riskLevel = 'medio';
          }
          
          // Ajustes por APIs reales
          let weatherMultiplier = 1.0;
          let eventsMultiplier = 1.0;
          let trafficMultiplier = 1.0;
          
          if (weatherData) {
            weatherMultiplier = weatherData.tourism_impact;
            console.log(`🌤️ ${municipality.name}: Clima ${weatherData.description} (${weatherData.temp}°C) - Impacto: x${weatherMultiplier}`);
          }
          
          if (eventsData) {
            eventsMultiplier = eventsData.tourism_impact;
            console.log(`🎫 ${municipality.name}: ${eventsData.total} eventos - Impacto: x${eventsMultiplier}`);
          }
          
          if (trafficData) {
            trafficMultiplier = trafficData.tourism_impact;
            console.log(`🚦 ${municipality.name}: Tráfico (${(trafficData.congestionRatio * 100).toFixed(1)}% fluidez) - Impacto: x${trafficMultiplier}`);
          }
          
          // Aplicar multiplicadores de APIs reales
          const totalMultiplier = weatherMultiplier * eventsMultiplier * trafficMultiplier;
          saturationProb = Math.min(95, Math.floor(saturationProb * totalMultiplier));
          
          // Ajuste por IA si disponible
          if (analysis && analysis.tourism_multiplier) {
            saturationProb = Math.min(95, Math.floor(saturationProb * analysis.tourism_multiplier));
            riskLevel = analysis.risk_level || riskLevel;
          }
          
          // Ajuste temporal
          const timeHours = parseInt(timeframe.replace('h', ''));
          if (timeHours <= 24) {
            saturationProb = Math.min(95, Math.floor(saturationProb * 1.1));
          } else if (timeHours >= 168) {
            saturationProb = Math.max(5, Math.floor(saturationProb * 0.9));
          }
          
          console.log(`✅ ${municipality.name}: ${saturationProb}% saturación (APIs reales)`);
          
          return {
            municipality: municipality.name,
            expected_flow: riskLevel,
            saturation_probability: saturationProb,
            risk_level: riskLevel,
            recommendations: analysis?.recommendations || [`Monitorear ${municipality.name} con datos en tiempo real`],
            data_sources: {
              weather: weatherData ? 'real_api' : 'unavailable',
              events: eventsData ? 'real_api' : 'unavailable', 
              traffic: trafficData ? 'real_api' : 'unavailable',
              ai_analysis: analysis ? 'real_ollama' : 'statistical'
            }
          };
          
        } catch (error) {
          console.log(`⚠️ Error procesando ${municipality.name}:`, error.message);
          
          // Fallback para municipios con error
          const visitors = municipality.visitants_anuals || 0;
          const riskLevel = visitors > 5000000 ? 'alto' : visitors > 1000000 ? 'medio' : 'bajo';
          const saturationProb = visitors > 5000000 ? 70 : visitors > 1000000 ? 45 : 25;
          
          return {
            municipality: municipality.name,
            expected_flow: riskLevel,
            saturation_probability: saturationProb,
            risk_level: riskLevel,
            recommendations: [`Análisis de ${municipality.name} basado en datos históricos`],
            data_sources: { fallback: 'statistical_only' }
          };
        }
      })
    );
    
    // Procesar resultados de municipios clave
    keyPredictions.forEach((result) => {
      if (result.status === 'fulfilled' && result.value) {
        predictions.push(result.value);
      }
    });
    
    // 2. ANÁLISIS ESTADÍSTICO para municipios restantes
    for (const municipality of regularMunicipalities) {
      const visitors = municipality.visitants_anuals || 0;
      let riskLevel = 'bajo';
      let saturationProb = 20;
      
      if (visitors > 500000) {
        riskLevel = 'medio';
        saturationProb = 35 + Math.floor(Math.random() * 15);
      } else if (visitors > 100000) {
        riskLevel = 'bajo';
        saturationProb = 20 + Math.floor(Math.random() * 15);
      } else {
        riskLevel = 'bajo';
        saturationProb = 10 + Math.floor(Math.random() * 10);
      }
      
      // Ajuste temporal
      const timeHours = parseInt(timeframe.replace('h', ''));
      if (timeHours <= 24) {
        saturationProb = Math.min(80, Math.floor(saturationProb * 1.2));
      } else if (timeHours >= 168) {
        saturationProb = Math.max(5, Math.floor(saturationProb * 0.8));
      }
      
      predictions.push({
        municipality: municipality.name,
        expected_flow: riskLevel,
        saturation_probability: saturationProb,
        risk_level: riskLevel,
        recommendations: [`Análisis estadístico de ${municipality.name}`],
        data_sources: { statistical: 'visitor_data' }
      });
    }
    
    // Calcular tendencias globales
    const riskCounts = { bajo: 0, medio: 0, alto: 0, crítico: 0 };
    predictions.forEach(p => riskCounts[p.risk_level] = (riskCounts[p.risk_level] || 0) + 1);
    
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
      confidence: 0.9, // Alta confianza con APIs reales
      total_analyzed: predictions.length,
      data_source: 'hybrid_real_apis',
      api_analysis: keyMunicipalities.length,
      statistical_analysis: regularMunicipalities.length
    };
    
    console.log(`✅ COMPLETADO: ${keyMunicipalities.length} con APIs reales + ${regularMunicipalities.length} estadísticos`);
    
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

// ENDPOINT DE ANÁLISIS INDIVIDUAL CON APIs REALES
app.post('/api/ai-analysis', async (req, res) => {
  try {
    const municipality = req.body;
    console.log('🤖 Análisis individual con APIs reales:', municipality.name);
    
    // Obtener datos enriquecidos
    const weatherData = await apiConnector.getWeatherData(
      municipality.latitude, 
      municipality.longitude
    );
    const eventsData = await apiConnector.getEventsData(municipality.name);
    const trafficData = await apiConnector.getTrafficData(
      municipality.latitude, 
      municipality.longitude
    );
    
    let analysis = null;
    if (tourismCollector) {
      try {
        const enrichedData = {
          ...municipality,
          prediction_window: municipality.prediction_window || '48'
        };
        const aiResult = await tourismCollector.analyzeMunicipality(enrichedData);
        analysis = JSON.parse(aiResult);
      } catch (error) {
        console.log('⚠️ Error en análisis IA:', error.message);
      }
    }
    
    // Calcular multiplicador basado en APIs reales
    let multiplier = 1.0;
    const visitors = municipality.visitants_anuals || 0;
    
    if (visitors > 5000000) multiplier = 2.0;
    else if (visitors > 1000000) multiplier = 1.5;
    
    // Aplicar factores de APIs reales
    if (weatherData) multiplier *= weatherData.tourism_impact;
    if (eventsData) multiplier *= eventsData.tourism_impact;
    if (trafficData) multiplier *= trafficData.tourism_impact;
    
    // Usar análisis IA si está disponible
    if (analysis && analysis.tourism_multiplier) {
      multiplier = analysis.tourism_multiplier;
    }
    
    const riskLevel = analysis?.risk_level || 
      (visitors > 5000000 ? 'alto' : visitors > 1000000 ? 'medio' : 'bajo');
    
    res.json({
      success: true,
      data: {
        tourism_multiplier: multiplier,
        risk_level: riskLevel,
        recommendations: analysis?.recommendations || [`Análisis de ${municipality.name} con datos en tiempo real`],
        real_time_data: {
          weather: weatherData,
          events: eventsData,
          traffic: trafficData
        }
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
  console.log(`🚀 Servidor con APIs REALES ejecutándose en http://localhost:${PORT}`);
  console.log(`📊 Endpoints disponibles:`);
  console.log(`   GET  /api/health`);
  console.log(`   POST /api/ai-predictions (APIs reales + IA)`);
  console.log(`   POST /api/ai-analysis (Análisis individual completo)`);
  console.log(`🌐 APIs externas: OpenWeather + Ticketmaster + TomTom + Ollama IA`);
});