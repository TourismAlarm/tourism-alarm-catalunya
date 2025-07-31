import { Ollama } from '@langchain/community/llms/ollama';

export class AutonomousMonitorAgent {
    constructor() {
        this.llm = new Ollama({
            baseUrl: 'http://localhost:11434',
            model: 'mistral:7b-instruct'
        });
        this.isActive = false;
        this.monitoringInterval = null;
        this.alertThresholds = {
            critical: 90,
            high: 75,
            medium: 50,
            low: 25
        };
        this.alerts = [];
        this.autoActions = [];
        console.log('👁️ Monitor Autónomo iniciado');
    }

    async startMonitoring(intervalMinutes = 5) {
        if (this.isActive) {
            console.log('⚠️ Monitor ya está activo');
            return;
        }

        this.isActive = true;
        console.log(`🔄 Iniciando monitoreo cada ${intervalMinutes} minutos`);

        this.monitoringInterval = setInterval(async () => {
            await this.performMonitoringCycle();
        }, intervalMinutes * 60 * 1000);

        // Ejecutar primer ciclo inmediatamente
        await this.performMonitoringCycle();
    }

    async stopMonitoring() {
        if (this.monitoringInterval) {
            clearInterval(this.monitoringInterval);
            this.monitoringInterval = null;
        }
        this.isActive = false;
        console.log('🛑 Monitoreo detenido');
    }

    async performMonitoringCycle() {
        try {
            console.log('🔍 Ejecutando ciclo de monitoreo...');
            
            // 1. Recopilar datos actuales
            const currentData = await this.collectCurrentMetrics();
            
            // 2. Analizar situación actual
            const analysis = await this.analyzeCurrentSituation(currentData);
            
            // 3. Detectar anomalías
            const anomalies = await this.detectAnomalies(currentData, analysis);
            
            // 4. Evaluar necesidad de alertas
            const alerts = await this.evaluateAlerts(anomalies);
            
            // 5. Ejecutar acciones automáticas
            if (alerts.length > 0) {
                await this.executeAutomaticActions(alerts);
            }
            
            // 6. Registrar actividad
            this.logMonitoringActivity({
                timestamp: new Date(),
                metrics: currentData,
                analysis,
                anomalies,
                alerts,
                status: 'completed'
            });

            console.log(`✅ Ciclo completado - ${alerts.length} alertas generadas`);
        } catch (error) {
            console.error('❌ Error en ciclo de monitoreo:', error);
            this.logMonitoringActivity({
                timestamp: new Date(),
                error: error.message,
                status: 'failed'
            });
        }
    }

    async collectCurrentMetrics() {
        // Simular recolección de métricas actuales
        // En producción, esto conectaría con APIs reales
        try {
            const response = await fetch('/api/municipalities?limit=947');
            const data = await response.json();
            
            return {
                total_municipalities: data.data?.length || 0,
                timestamp: new Date(),
                high_risk_count: data.data?.filter(m => m.risk_level === 'high').length || 0,
                critical_count: data.data?.filter(m => m.risk_level === 'critical').length || 0,
                average_tourism_score: this.calculateAverageScore(data.data || [])
            };
        } catch (error) {
            console.warn('⚠️ No se pudo obtener datos reales, usando fallback');
            return this.getFallbackMetrics();
        }
    }

    async analyzeCurrentSituation(currentData) {
        const prompt = `Analiza la situación turística actual en Catalunya:
        
        Métricas actuales:
        ${JSON.stringify(currentData)}
        
        Evalúa:
        1. Estado general del sistema turístico
        2. Áreas de preocupación inmediata
        3. Tendencias preocupantes
        4. Necesidad de intervención
        
        Responde en JSON:
        {
            "overall_status": "normal/alerta/crítico",
            "immediate_concerns": ["preocupación1", "preocupación2"],
            "intervention_needed": true/false,
            "priority_areas": ["área1", "área2"],
            "summary": "resumen de la situación"
        }`;

        try {
            const analysis = await this.llm.call(prompt);
            return JSON.parse(analysis);
        } catch (error) {
            console.error('Error en análisis:', error);
            return this.getFallbackAnalysis();
        }
    }

    async detectAnomalies(currentData, analysis) {
        const prompt = `Detecta anomalías en estos datos turísticos:
        
        Datos actuales: ${JSON.stringify(currentData)}
        Análisis: ${JSON.stringify(analysis)}
        
        Busca:
        1. Picos inusuales de actividad
        2. Caídas anómalas en métricas
        3. Patrones fuera de lo normal
        4. Correlaciones sospechosas
        
        Responde en JSON:
        {
            "anomalies_detected": true/false,
            "anomaly_list": [
                {
                    "type": "tipo de anomalía",
                    "severity": "baja/media/alta",
                    "description": "descripción",
                    "affected_areas": ["área1", "área2"],
                    "recommended_action": "acción sugerida"
                }
            ],
            "anomaly_score": número_0_100
        }`;

        try {
            const anomalies = await this.llm.call(prompt);
            return JSON.parse(anomalies);
        } catch (error) {
            console.error('Error detectando anomalías:', error);
            return { anomalies_detected: false, anomaly_list: [], anomaly_score: 0 };
        }
    }

    async evaluateAlerts(anomalies) {
        const activeAlerts = [];

        if (anomalies.anomalies_detected) {
            for (const anomaly of anomalies.anomaly_list) {
                if (anomaly.severity === 'alta' || anomaly.severity === 'crítica') {
                    const alert = {
                        id: this.generateAlertId(),
                        timestamp: new Date(),
                        type: 'anomaly_detected',
                        severity: anomaly.severity,
                        title: `Anomalía detectada: ${anomaly.type}`,
                        description: anomaly.description,
                        affected_areas: anomaly.affected_areas,
                        recommended_action: anomaly.recommended_action,
                        status: 'active',
                        auto_generated: true
                    };

                    activeAlerts.push(alert);
                    this.alerts.push(alert);
                }
            }
        }

        return activeAlerts;
    }

    async executeAutomaticActions(alerts) {
        for (const alert of alerts) {
            console.log(`🚨 Ejecutando acción automática para: ${alert.title}`);
            
            const action = {
                id: this.generateActionId(),
                timestamp: new Date(),
                alert_id: alert.id,
                type: 'automatic_response',
                action: this.determineAutomaticAction(alert),
                status: 'executed'
            };

            this.autoActions.push(action);
            
            // Aquí se ejecutarían las acciones reales:
            // - Enviar notificaciones
            // - Actualizar dashboards
            // - Activar protocolos de emergencia
            // - Contactar autoridades
            
            console.log(`✅ Acción ejecutada: ${action.action}`);
        }
    }

    determineAutomaticAction(alert) {
        const actionMap = {
            alta: 'Notificar a supervisores y actualizar dashboard',
            crítica: 'Activar protocolo de emergencia y contactar autoridades',
            media: 'Registrar en log y monitorear evolución'
        };

        return actionMap[alert.severity] || 'Acción por defecto: registrar y monitorear';
    }

    calculateAverageScore(municipalities) {
        if (!municipalities.length) return 0;
        const total = municipalities.reduce((sum, m) => sum + (m.tourism_score || 0), 0);
        return Math.round(total / municipalities.length);
    }

    getFallbackMetrics() {
        return {
            total_municipalities: 0,
            timestamp: new Date(),
            high_risk_count: 0,
            critical_count: 0,
            average_tourism_score: 0,
            status: 'fallback_mode'
        };
    }

    getFallbackAnalysis() {
        return {
            overall_status: 'normal',
            immediate_concerns: ['Sistema en modo fallback'],
            intervention_needed: false,
            priority_areas: [],
            summary: 'Análisis no disponible temporalmente'
        };
    }

    generateAlertId() {
        return `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    generateActionId() {
        return `action_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    logMonitoringActivity(activity) {
        // En producción, esto se guardaría en base de datos
        console.log('📝 Actividad registrada:', {
            timestamp: activity.timestamp,
            status: activity.status,
            alerts: activity.alerts?.length || 0
        });
    }

    // Métodos de consulta
    getActiveAlerts() {
        return this.alerts.filter(alert => alert.status === 'active');
    }

    getRecentActions() {
        return this.autoActions.slice(-10); // Últimas 10 acciones
    }

    getMonitoringStatus() {
        return {
            is_active: this.isActive,
            total_alerts: this.alerts.length,
            active_alerts: this.getActiveAlerts().length,
            recent_actions: this.autoActions.length,
            thresholds: this.alertThresholds
        };
    }

    // Configuración
    updateThresholds(newThresholds) {
        this.alertThresholds = { ...this.alertThresholds, ...newThresholds };
        console.log('🔧 Umbrales actualizados:', this.alertThresholds);
    }
}