import { Ollama } from '@langchain/community/llms/ollama';

export class TourismPredictorAgent {
    constructor() {
        this.llm = new Ollama({
            baseUrl: 'http://localhost:11434',
            model: 'mistral:7b-instruct'
        });
        this.predictions = [];
        this.modelAccuracy = 0.85;
        console.log('🔮 Agente Predictor iniciado');
    }

    async predictTourismFlow(historicalData, timeframe = '24h') {
        const prompt = `Basándote en estos datos históricos de turismo, predice el flujo turístico para las próximas ${timeframe}:
        
        Datos históricos:
        ${JSON.stringify(historicalData.slice(-50))}
        
        Considera:
        1. Tendencias estacionales
        2. Patrones de fin de semana vs días laborables
        3. Eventos especiales o festividades
        4. Condiciones meteorológicas típicas
        5. Capacidad de saturación por municipio
        
        Genera predicciones para:
        - Flujo esperado (bajo/medio/alto/crítico)
        - Probabilidad de saturación (0-100%)
        - Municipios en riesgo de sobrecarga
        - Recomendaciones preventivas
        
        Responde en JSON con estructura:
        {
            "timeframe": "${timeframe}",
            "predictions": [
                {
                    "municipality": "nombre",
                    "expected_flow": "nivel",
                    "saturation_probability": número,
                    "risk_level": "bajo/medio/alto/crítico",
                    "recommendations": ["acción1", "acción2"]
                }
            ],
            "global_trends": {
                "overall_risk": "nivel",
                "hotspots": ["municipio1", "municipio2"],
                "safe_alternatives": ["alternativa1", "alternativa2"]
            },
            "confidence": número
        }`;
        
        try {
            const prediction = await this.llm.call(prompt);
            const parsedPrediction = JSON.parse(prediction);
            
            // Almacenar predicción
            this.predictions.push({
                timestamp: new Date(),
                timeframe,
                data: parsedPrediction,
                accuracy_score: this.modelAccuracy
            });
            
            console.log(`🎯 Predicción generada para ${timeframe}`);
            return parsedPrediction;
        } catch (error) {
            console.error('Error en predicción:', error);
            return this.generateFallbackPrediction(timeframe);
        }
    }

    async predictAlertLevel(municipalityData) {
        const prompt = `Evalúa el nivel de alerta turística para este municipio:
        ${JSON.stringify(municipalityData)}
        
        Calcula nivel de alerta basado en:
        - Ratio turistas/población local
        - Capacidad de infraestructura
        - Tendencias recientes
        - Impacto ambiental y social
        
        Responde en JSON:
        {
            "alert_level": "verde/amarillo/naranja/rojo",
            "urgency": "baja/media/alta/crítica",
            "primary_concerns": ["preocupación1", "preocupación2"],
            "immediate_actions": ["acción1", "acción2"],
            "timeline": "cuándo actuar"
        }`;
        
        try {
            const alert = await this.llm.call(prompt);
            return JSON.parse(alert);
        } catch (error) {
            console.error('Error calculando alerta:', error);
            return this.generateFallbackAlert();
        }
    }

    async generateWeeklyForecast(municipalityData) {
        const prompt = `Genera un pronóstico turístico semanal para estos municipios:
        ${JSON.stringify(municipalityData)}
        
        Para cada día de la semana, predice:
        - Volumen de visitantes esperado
        - Distribución por municipios
        - Puntos de congestión probable
        - Mejores momentos para visitar
        
        Responde en JSON con formato semanal`;
        
        try {
            const forecast = await this.llm.call(prompt);
            return JSON.parse(forecast);
        } catch (error) {
            console.error('Error en pronóstico semanal:', error);
            return this.generateFallbackWeekly();
        }
    }

    generateFallbackPrediction(timeframe) {
        return {
            timeframe,
            predictions: [{
                municipality: "Sistema en mantenimiento",
                expected_flow: "medio",
                saturation_probability: 50,
                risk_level: "medio",
                recommendations: ["Consultar datos más tarde"]
            }],
            global_trends: {
                overall_risk: "medio",
                hotspots: [],
                safe_alternatives: []
            },
            confidence: 0.3
        };
    }

    generateFallbackAlert() {
        return {
            alert_level: "amarillo",
            urgency: "media",
            primary_concerns: ["Sistema de predicción temporalmente no disponible"],
            immediate_actions: ["Revisar datos manualmente"],
            timeline: "próxima hora"
        };
    }

    generateFallbackWeekly() {
        return {
            week_forecast: "Pronóstico no disponible temporalmente",
            status: "fallback_mode"
        };
    }

    getAccuracy() {
        return this.modelAccuracy;
    }

    getPredictionHistory() {
        return this.predictions.slice(-20); // Últimas 20 predicciones
    }
}