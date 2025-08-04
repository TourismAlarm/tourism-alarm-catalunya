import { Ollama } from '@langchain/community/llms/ollama';
import { ChromaClient } from 'chromadb';
import { APIConnector } from '../connectors/api_connector.js';

export class TourismCollectorAgent {
    constructor() {
        this.llm = new Ollama({
            baseUrl: 'http://localhost:11434',
            model: 'mistral:7b-instruct'
        });
        this.memory = [];
        this.apiConnector = new APIConnector();
        console.log('🤖 Agente Recolector iniciado con APIs externas');
    }

    async analyzeMunicipality(municipalityData) {
        // Enriquecer datos con información externa
        const enrichedData = await this.enrichMunicipalityData(municipalityData);
        
        // Obtener ventana temporal de predicción
        const predictionWindow = municipalityData.prediction_window || '48';
        const timeLabels = {
            '24': 'próximas 24 horas',
            '48': 'próximas 48 horas',
            '168': 'próxima semana'
        };
        const timeframe = timeLabels[predictionWindow] || 'próximas 48 horas';
        
        const prompt = `Analiza estos datos turísticos enriquecidos y extrae patrones para ${timeframe}:
        
        Datos del municipio: ${JSON.stringify(municipalityData)}
        Datos meteorológicos: ${JSON.stringify(enrichedData.weather)}
        Eventos locales: ${JSON.stringify(enrichedData.events)}
        Datos de tráfico: ${JSON.stringify(enrichedData.traffic)}
        Ventana temporal: ${timeframe}
        
        Considera el impacto del clima, eventos y tráfico en el turismo para ${timeframe}.
        Ajusta las predicciones según el plazo temporal:
        - 24h: Condiciones actuales tienen mayor peso
        - 48h: Balance entre condiciones actuales y tendencias
        - 1 semana: Tendencias generales tienen mayor peso
        
        Responde en JSON con: 
        {
            "patterns": ["patrón1", "patrón2"],
            "risk_level": "bajo/medio/alto/crítico",
            "weather_impact": "descripción del impacto climático",
            "events_impact": "descripción del impacto de eventos",
            "traffic_impact": "descripción del impacto del tráfico",
            "recommendations": ["recomendación1", "recomendación2"],
            "tourism_multiplier": número_del_1.0_al_2.0,
            "prediction_timeframe": "${timeframe}"
        }`;
        
        return await this.llm.call(prompt);
    }

    async enrichMunicipalityData(municipalityData) {
        const enriched = {
            weather: null,
            events: null,
            traffic: null
        };

        // Obtener datos meteorológicos si hay coordenadas
        if (municipalityData.latitude && municipalityData.longitude) {
            enriched.weather = await this.apiConnector.getWeatherData(
                municipalityData.latitude, 
                municipalityData.longitude
            );
        }

        // Obtener datos de eventos
        if (municipalityData.name) {
            enriched.events = await this.apiConnector.getEventsData(municipalityData.name);
        }

        // Obtener datos de tráfico
        if (municipalityData.latitude && municipalityData.longitude) {
            enriched.traffic = await this.apiConnector.getTrafficData(
                municipalityData.latitude, 
                municipalityData.longitude
            );
        }

        return enriched;
    }

    async collectRealTimeData() {
        try {
            const response = await fetch('/api/municipalities?limit=947');
            const data = await response.json();
            
            for (const municipality of data.data) {
                const analysis = await this.analyzeMunicipality(municipality);
                this.memory.push({
                    timestamp: new Date(),
                    municipality: municipality.name,
                    analysis: JSON.parse(analysis)
                });
            }
            
            console.log(`✅ Analizados ${data.data.length} municipios`);
            return this.memory;
        } catch (error) {
            console.error('Error collecting data:', error);
        }
    }
}