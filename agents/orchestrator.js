import { TourismCollectorAgent } from './collectors/tourism_collector.js';
import { PatternAnalyzerAgent } from './analyzers/pattern_analyzer.js';
import { TourismPredictorAgent } from './predictors/tourism_predictor.js';
import { AutonomousMonitorAgent } from './monitors/autonomous_monitor.js';

export class AIOrchestrator {
    constructor() {
        this.collector = new TourismCollectorAgent();
        this.analyzer = new PatternAnalyzerAgent();
        this.predictor = new TourismPredictorAgent();
        this.monitor = new AutonomousMonitorAgent();
        
        this.isInitialized = false;
        this.analysisResults = {};
        
        console.log('🎼 Orquestador IA inicializado');
        this.initialize();
    }

    async initialize() {
        try {
            // Iniciar monitoreo automático cada 10 minutos
            await this.monitor.startMonitoring(10);
            this.isInitialized = true;
            console.log('✅ Sistema IA completamente inicializado');
        } catch (error) {
            console.error('❌ Error inicializando sistema IA:', error);
        }
    }

    async runFullAnalysis() {
        console.log('🚀 Ejecutando análisis completo del sistema...');
        
        try {
            // 1. Recolectar datos actuales
            console.log('📊 Recolectando datos...');
            const collectedData = await this.collector.collectRealTimeData();
            
            // 2. Analizar patrones
            console.log('🧠 Analizando patrones...');
            const patterns = await this.analyzer.findPatterns(collectedData);
            
            // 3. Generar predicciones
            console.log('🔮 Generando predicciones...');
            const predictions24h = await this.predictor.predictTourismFlow(collectedData, '24h');
            const predictions48h = await this.predictor.predictTourismFlow(collectedData, '48h');
            const weeklyForecast = await this.predictor.generateWeeklyForecast(collectedData);
            
            // 4. Compilar resultados
            this.analysisResults = {
                timestamp: new Date(),
                collected_data: {
                    total_municipalities: collectedData.length,
                    sample_data: collectedData.slice(-10) // Últimos 10 para ejemplo
                },
                patterns: patterns,
                predictions: {
                    next_24h: predictions24h,
                    next_48h: predictions48h,
                    weekly: weeklyForecast
                },
                monitor_status: this.monitor.getMonitoringStatus(),
                system_health: this.getSystemHealth()
            };
            
            console.log('✅ Análisis completo finalizado');
            return this.analysisResults;
            
        } catch (error) {
            console.error('❌ Error en análisis completo:', error);
            return this.getFallbackResults();
        }
    }

    async getQuickInsights() {
        // Análisis rápido para actualizaciones frecuentes
        try {
            const currentMetrics = await this.monitor.collectCurrentMetrics();
            const quickPrediction = await this.predictor.predictTourismFlow(
                this.collector.memory.slice(-20), '24h'
            );
            
            return {
                timestamp: new Date(),
                current_status: this.interpretMetrics(currentMetrics),
                quick_prediction: quickPrediction,
                active_alerts: this.monitor.getActiveAlerts(),
                system_status: 'operational'
            };
        } catch (error) {
            console.error('Error en insights rápidos:', error);
            return this.getQuickFallback();
        }
    }

    async analyzeMunicipalityRisk(municipalityName) {
        try {
            // Buscar datos del municipio
            const municipalityData = this.collector.memory.find(
                item => item.municipality === municipalityName
            );
            
            if (!municipalityData) {
                throw new Error(`Municipio ${municipalityName} no encontrado`);
            }
            
            // Análisis específico del municipio
            const riskAnalysis = await this.predictor.predictAlertLevel(municipalityData);
            const patterns = await this.analyzer.findPatterns([municipalityData]);
            
            return {
                municipality: municipalityName,
                risk_analysis: riskAnalysis,
                local_patterns: patterns,
                recommendations: this.generateMunicipalityRecommendations(riskAnalysis),
                last_updated: new Date()
            };
            
        } catch (error) {
            console.error(`Error analizando ${municipalityName}:`, error);
            return this.getMunicipalityFallback(municipalityName);
        }
    }

    interpretMetrics(metrics) {
        const { high_risk_count, critical_count, total_municipalities } = metrics;
        
        if (critical_count > 0) {
            return {
                level: 'crítico',
                message: `${critical_count} municipios en estado crítico`,
                action_needed: true
            };
        } else if (high_risk_count > total_municipalities * 0.1) {
            return {
                level: 'alto',
                message: `${high_risk_count} municipios en riesgo alto`,
                action_needed: true
            };
        } else {
            return {
                level: 'normal',
                message: 'Situación turística estable',
                action_needed: false
            };
        }
    }

    generateMunicipalityRecommendations(riskAnalysis) {
        const baseRecommendations = {
            'verde': ['Mantener monitoreo rutinario', 'Promover turismo sostenible'],
            'amarillo': ['Incrementar vigilancia', 'Preparar medidas preventivas'],
            'naranja': ['Activar protocolos de atención', 'Limitar accesos si es necesario'],
            'rojo': ['Activar plan de emergencia', 'Implementar restricciones inmediatas']
        };
        
        return baseRecommendations[riskAnalysis.alert_level] || ['Consultar manual de procedimientos'];
    }

    getSystemHealth() {
        return {
            collector_status: this.collector.memory.length > 0 ? 'activo' : 'sin datos',
            analyzer_active: this.analyzer.patterns.size >= 0,
            predictor_accuracy: this.predictor.getAccuracy(),
            monitor_active: this.monitor.isActive,
            overall_health: this.isInitialized ? 'óptimo' : 'inicializando'
        };
    }

    getFallbackResults() {
        return {
            timestamp: new Date(),
            collected_data: { total_municipalities: 0, sample_data: [] },
            patterns: { status: 'no disponible' },
            predictions: {
                next_24h: { status: 'no disponible' },
                next_48h: { status: 'no disponible' },
                weekly: { status: 'no disponible' }
            },
            monitor_status: { is_active: false },
            system_health: { overall_health: 'modo fallback' }
        };
    }

    getQuickFallback() {
        return {
            timestamp: new Date(),
            current_status: { level: 'desconocido', message: 'Sistema en modo fallback' },
            quick_prediction: { status: 'no disponible' },
            active_alerts: [],
            system_status: 'fallback'
        };
    }

    getMunicipalityFallback(name) {
        return {
            municipality: name,
            risk_analysis: { alert_level: 'amarillo', urgency: 'media' },
            local_patterns: { status: 'no disponible' },
            recommendations: ['Consultar datos manualmente'],
            last_updated: new Date()
        };
    }

    // Métodos de control
    async stopAllAgents() {
        await this.monitor.stopMonitoring();
        console.log('🛑 Todos los agentes detenidos');
    }

    getStatus() {
        return {
            orchestrator_active: this.isInitialized,
            last_analysis: this.analysisResults.timestamp || null,
            agents_status: {
                collector: this.collector.memory.length,
                analyzer: this.analyzer.patterns.size,
                predictor: this.predictor.getPredictionHistory().length,
                monitor: this.monitor.getMonitoringStatus()
            }
        };
    }
}