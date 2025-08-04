// =================================================================
// TOURISM ALARM - SCRIPT.JS QUE SÍ FUNCIONA
// =================================================================

class TourismAlarmApp {
    constructor() {
        this.map = null;
        this.heatmapLayer = null;
        this.markersLayer = null;
        this.allMunicipalities = [];
        this.municipalitiesData = {};
        
        // Sistema híbrido: API local en desarrollo, Vercel en producción
        this.apiBase = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
            ? 'http://localhost:3000/api'
            : window.location.origin + '/api';

        console.log('🔌 Usando API:', this.apiBase);
        
        this.state = {
            currentMetric: 'density',
            selectedPrediction: '48',
            isLoading: false,
            apiStatus: 'connecting'
        };
        
        // Coordenadas que funcionaron
        this.COORDS = {
            "080193": [41.3851, 2.1734], // Barcelona
            "170792": [41.9794, 2.8214], // Girona
            "431481": [41.1189, 1.2445], // Tarragona
            "250907": [41.6176, 0.6200], // Lleida
            "081691": [41.5433, 2.1095], // Sabadell
            "082009": [41.5641, 2.0116], // Terrassa
            "080736": [41.4502, 2.2436], // Badalona
            "081013": [41.3580, 2.0966], // L'Hospitalet
            "081234": [41.5334, 2.4445], // Mataró
            "432038": [41.1560, 1.1068], // Reus
            "171521": [42.2619, 3.1765], // Roses
            "170235": [41.6705, 2.7972], // Blanes
            "170629": [41.8167, 3.0333], // Castell-Platja d'Aro
            "171032": [41.6963, 2.8464], // Lloret de Mar
            "171394": [41.9169, 3.1634], // Palafrugell
            "172023": [41.7209, 2.9309], // Tossa de Mar
            "170266": [41.9573, 3.2071], // Begur
            "170481": [42.2887, 3.2790], // Cadaqués
            "431713": [41.0765, 1.1398], // Salou
            "430385": [41.0695, 1.0648], // Cambrils
        };
        
        this.init();
        
        // Inicializar sistema IA si Ollama está disponible
        this.checkAndInitAI();
    }

    async init() {
        try {
            this.updateLoadingProgress(5, "Inicializando Tourism Alarm...");
            this.initMap();
            this.updateLoadingProgress(20, "Mapa inicializado...");
            this.setupEventListeners();
            this.updateLoadingProgress(40, "Cargando municipios de Catalunya...");
            await this.loadMunicipalitiesData();
            this.updateLoadingProgress(70, "Generando heatmap...");
            await this.createHeatmap();
            this.updateLoadingProgress(85, "Configurando actualizaciones...");
            this.setupRealTimeUpdates();
            this.updateLoadingProgress(100, "¡Sistema cargado!");
            
            setTimeout(() => {
                const overlay = document.getElementById('loadingOverlay');
                if (overlay) overlay.style.display = 'none';
            }, 500);
            
            console.log('✅ Tourism Alarm initialized successfully');
        } catch (error) {
            console.error('❌ Error initializing app:', error);
            this.showError('Error inicializando la aplicación: ' + error.message);
        }
    }

    initMap() {
        this.map = L.map('map').setView([41.8, 1.8], 8);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors'
        }).addTo(this.map);
        this.markersLayer = L.layerGroup().addTo(this.map);
    }

    setupEventListeners() {
        const metricSelect = document.getElementById('metricSelect');
        if (metricSelect) {
            metricSelect.addEventListener('change', (e) => {
                this.state.currentMetric = e.target.value;
                this.createHeatmap();
            });
        }
        
        // NUEVO: Listener para selector de predicciones temporales
        const predictionSelect = document.getElementById('predictionSelect');
        if (predictionSelect) {
            predictionSelect.addEventListener('change', (e) => {
                this.state.selectedPrediction = e.target.value;
                console.log(`🕐 Cambiando predicción a ${e.target.value} horas`);
                
                // Actualizar título de predicciones y status visual
                const predTitle = document.getElementById('predictionTitle');
                const predStatus = document.getElementById('predictionStatusText');
                
                const timeLabels = {
                    '24': 'Próximas 24h',
                    '48': 'Próximas 48h', 
                    '168': 'Próxima semana'
                };
                
                const statusLabels = {
                    '24': '⚡ Predicción para 24 horas',
                    '48': '🔮 Predicción para 48 horas',
                    '168': '📅 Predicción para 1 semana'
                };
                
                if (predTitle) {
                    predTitle.textContent = `🤖 Predicción IA - ${timeLabels[e.target.value]}`;
                }
                
                if (predStatus) {
                    predStatus.textContent = statusLabels[e.target.value];
                    // Añadir efecto visual de cambio
                    predStatus.style.animation = 'pulse 0.5s ease-in-out';
                    setTimeout(() => {
                        predStatus.style.animation = '';
                    }, 500);
                }
                
                // Regenerar heatmap con nueva ventana temporal
                this.createHeatmap();
            });
        }
        
        const refreshBtn = document.getElementById('refreshBtn');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => {
                this.refreshData();
            });
        }
    }

    async loadMunicipalitiesData() {
        try {
            console.log('🔄 Cargando datos de municipios...');
            this.setApiStatus('connecting');
            
            const response = await fetch(`${this.apiBase}/municipalities?limit=947`);
            const result = await response.json();
            
            if (!result.success || !result.data) {
                throw new Error('No se pudieron cargar los datos');
            }

            console.log(`✅ Cargados ${result.data.length} municipios`);
            
            // Añadir coordenadas a los datos
            this.allMunicipalities = result.data.map(municipality => {
                const coords = this.COORDS[municipality.id];
                if (coords) {
                    return {
                        ...municipality,
                        latitude: coords[0],
                        longitude: coords[1],
                        hasCoordinates: true
                    };
                }
                return municipality;
            });
            
            this.setApiStatus('online');
            this.updateStats();
            
            return this.allMunicipalities;
            
        } catch (error) {
            console.error('❌ Error loading municipalities:', error);
            this.setApiStatus('offline');
            this.allMunicipalities = this.getFallbackData();
            return this.allMunicipalities;
        }
    }

    async createHeatmap() {
        if (!this.allMunicipalities || this.allMunicipalities.length === 0) {
            console.warn('⚠️ No hay datos para crear heatmap');
            return;
        }

        try {
            console.log('🔥 Creando heatmap con análisis IA...');
            
            // Limpiar eventos anteriores
            this.map.off('zoomend');
            
            // Remover heatmap anterior
            if (this.heatmapLayer) {
                this.map.removeLayer(this.heatmapLayer);
            }
            
            // Obtener análisis IA enriquecido para municipios clave
            await this.enrichMunicipalitiesWithAI();
            
            // Generar puntos para heatmap
            const puntos = [];
            
            this.allMunicipalities.forEach(m => {
                if (m.latitude && m.longitude) {
                    // Calcular intensidad basada en análisis IA + datos estáticos
                    let intensidad = this.calculateAIIntensity(m);
                    
                    // Generar múltiples puntos por municipio
                    const numPuntos = Math.floor(intensidad * 50) + 10;
                    for (let i = 0; i < numPuntos; i++) {
                        const finalLat = m.latitude + (Math.random() - 0.5) * 0.08;
                        const finalLng = m.longitude + (Math.random() - 0.5) * 0.08;
                        
                        // Límites más estrictos
                        if (finalLat >= 40.52 && finalLat <= 42.86 && 
                            finalLng >= 0.16 && finalLng <= 3.32) {
                            const variacion = 0.8 + Math.random() * 0.4;
                            puntos.push([finalLat, finalLng, intensidad * variacion]);
                        }
                    }
                }
            });
            
            console.log(`🗺️ Generando heatmap con ${puntos.length} puntos`);
            
            // Crear heatmap
            this.heatmapLayer = L.heatLayer(puntos, {
                radius: this.map.getZoom() < 10 ? 35 : 25,
                blur: this.map.getZoom() < 10 ? 25 : 15,
                minOpacity: 0.1,
                maxZoom: 16,
                max: 0.9,
                gradient: {
                    0.0: '#00ff00',  // Verde
                    0.3: '#80ff00',  
                    0.5: '#ffff00',  // Amarillo
                    0.7: '#ff8000',  // Naranja
                    1.0: '#ff0000'   // Rojo
                }
            }).addTo(this.map);
            
            console.log('✅ Heatmap creado correctamente');
            
            // Ocultar heatmap cuando zoom < 7
            this.map.on('zoomend', () => {
                const zoom = this.map.getZoom();
                if (zoom < 7) {
                    this.map.removeLayer(this.heatmapLayer);
                } else if (!this.map.hasLayer(this.heatmapLayer)) {
                    this.heatmapLayer.addTo(this.map);
                }
            });
            
            this.updateStats();
            
        } catch (error) {
            console.error('❌ Error creating heatmap:', error);
            this.showError('Error creando heatmap: ' + error.message);
        }
    }

    // Funciones auxiliares
    setApiStatus(status) {
        this.state.apiStatus = status;
        const statusElement = document.getElementById('apiStatusText');
        if (statusElement) {
            const statusMap = {
                'connecting': 'Conectando...',
                'online': 'En línea',
                'offline': 'Sin conexión'
            };
            statusElement.textContent = statusMap[status] || status;
        }
    }

    updateLoadingProgress(percent, text) {
        const progressFill = document.getElementById('progressFill');
        const loadingText = document.getElementById('loadingText');
        
        if (progressFill) {
            progressFill.style.width = percent + '%';
        }
        if (loadingText) {
            loadingText.textContent = text;
        }
    }

    updateStats() {
        const totalMunicipalities = this.allMunicipalities ? this.allMunicipalities.length : 0;
        const loadedElement = document.getElementById('municipalitiesLoaded');
        
        if (loadedElement) {
            loadedElement.textContent = `${totalMunicipalities}/947`;
        }
        
        console.log(`📊 Estadísticas: ${totalMunicipalities} municipios cargados`);
    }

    setupRealTimeUpdates() {
        // Actualización cada 5 minutos con análisis IA
        setInterval(() => {
            console.log('🔄 Actualización automática con análisis IA...');
            this.refreshData();
        }, 5 * 60 * 1000);
        
        // Análisis IA más profundo cada 15 minutos
        setInterval(() => {
            console.log('🧠 Análisis IA profundo programado...');
            this.runDeepAIAnalysis();
        }, 15 * 60 * 1000);
    }

    async runDeepAIAnalysis() {
        try {
            const keyMunicipalities = this.allMunicipalities.filter(m => 
                m.hasCoordinates && m.visitants_anuals > 1000000
            ).slice(0, 5);
            
            console.log(`🧠 Ejecutando análisis IA profundo en ${keyMunicipalities.length} municipios...`);
            
            for (const municipality of keyMunicipalities) {
                try {
                    // Incluir ventana temporal en el análisis profundo
                    const requestData = {
                        ...municipality,
                        prediction_window: this.state.selectedPrediction || '48'
                    };
                    
                    const response = await fetch('/api/ai-analysis', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(requestData)
                    });
                    
                    if (response.ok) {
                        const result = await response.json();
                        if (result.success) {
                            municipality.aiAnalysis = result.data;
                            municipality.aiEnriched = true;
                            municipality.predictionWindow = this.state.selectedPrediction || '48';
                            municipality.lastAIUpdate = new Date();
                            console.log(`🧠 IA profundo: ${municipality.name} (${municipality.predictionWindow}h)`);
                        }
                    }
                } catch (error) {
                    console.log(`⚠️ Error análisis IA ${municipality.name}:`, error.message);
                }
                
                // Pausa entre análisis para no sobrecargar APIs
                await new Promise(resolve => setTimeout(resolve, 2000));
            }
            
            // Actualizar heatmap con nuevos datos IA
            await this.createHeatmap();
            console.log('✅ Análisis IA profundo completado');
            
        } catch (error) {
            console.error('❌ Error en análisis IA profundo:', error);
        }
    }

    async refreshData() {
        const refreshBtn = document.getElementById('refreshBtn');
        const refreshIcon = document.getElementById('refreshIcon');
        
        if (refreshBtn) refreshBtn.disabled = true;
        if (refreshIcon) refreshIcon.style.animation = 'spin 1s linear infinite';
        
        try {
            await this.loadMunicipalitiesData();
            await this.createHeatmap();
        } catch (error) {
            console.error('❌ Error refreshing data:', error);
            this.showError('Error actualizando datos: ' + error.message);
        } finally {
            if (refreshBtn) refreshBtn.disabled = false;
            if (refreshIcon) refreshIcon.style.animation = '';
        }
    }

    showError(message) {
        console.error('🚨 Error:', message);
    }

    async checkAndInitAI() {
        try {
            const { AIOrchestrator } = await import('../agents/orchestrator.js');
            this.ai = new AIOrchestrator();
            console.log('🤖 Sistema IA inicializado');
            
            // Ejecutar análisis inicial
            setTimeout(() => this.runAIAnalysis(), 5000);
        } catch (error) {
            console.log('ℹ️ Sistema IA no disponible:', error.message);
        }
    }

    async runAIAnalysis() {
        if (!this.ai) {
            console.log('⚠️ Sistema IA no disponible');
            return;
        }
        
        try {
            console.log('🧠 Ejecutando análisis IA...');
            const results = await this.ai.runFullAnalysis();
            
            // Actualizar UI con predicciones
            this.updatePredictionsUI(results.predictions);
            
            // Actualizar estadísticas
            this.updateAIStats(results);
            
            console.log('✅ Análisis IA completado');
        } catch (error) {
            console.error('❌ Error en análisis IA:', error);
        }
    }

    updatePredictionsUI(predictions) {
        // Actualizar predicciones IA en la interfaz
        const predBarcelona = document.getElementById('predBarcelona');
        const predCosta = document.getElementById('predCosta');
        const predPirineos = document.getElementById('predPirineos');
        const generalTrend = document.getElementById('generalTrend');

        if (predictions && predictions.next_48h) {
            const pred48h = predictions.next_48h;
            
            // Buscar predicciones específicas
            const barcelonaPred = this.findMunicipalityPrediction(pred48h, 'Barcelona');
            const costaPred = this.findRegionPrediction(pred48h, 'costa');
            const pirineosPred = this.findRegionPrediction(pred48h, 'pirineos');
            
            if (predBarcelona && barcelonaPred) {
                predBarcelona.textContent = `${barcelonaPred.expected_flow} (${barcelonaPred.saturation_probability}%)`;
                predBarcelona.className = `prediction-value ${barcelonaPred.risk_level}`;
            }
            
            if (predCosta && costaPred) {
                predCosta.textContent = `${costaPred.expected_flow} (${costaPred.saturation_probability}%)`;
                predCosta.className = `prediction-value ${costaPred.risk_level}`;
            }
            
            if (predPirineos && pirineosPred) {
                predPirineos.textContent = `${pirineosPred.expected_flow} (${pirineosPred.saturation_probability}%)`;
                predPirineos.className = `prediction-value ${pirineosPred.risk_level}`;
            }
            
            if (generalTrend && pred48h.global_trends) {
                generalTrend.textContent = `${pred48h.global_trends.overall_risk} - Confianza: ${pred48h.confidence || 'N/A'}%`;
                generalTrend.className = `prediction-value ${pred48h.global_trends.overall_risk}`;
            }
        }
    }

    findMunicipalityPrediction(prediction, municipalityName) {
        if (!prediction.predictions) return null;
        return prediction.predictions.find(p => 
            p.municipality && p.municipality.toLowerCase().includes(municipalityName.toLowerCase())
        );
    }

    findRegionPrediction(prediction, region) {
        if (!prediction.predictions) return null;
        
        // Mapeo de municipios por región
        const regionMunicipalities = {
            costa: ['lloret', 'blanes', 'roses', 'cadaqués', 'begur', 'tossa'],
            pirineos: ['puigcerdà', 'la seu', 'sort', 'vielha', 'baqueira']
        };
        
        const municipalities = regionMunicipalities[region] || [];
        
        for (const municipality of municipalities) {
            const pred = prediction.predictions.find(p => 
                p.municipality && p.municipality.toLowerCase().includes(municipality)
            );
            if (pred) return pred;
        }
        
        // Si no encuentra específico, devolver promedio de la región
        return {
            expected_flow: 'medio',
            saturation_probability: 45,
            risk_level: 'medio'
        };
    }

    updateAIStats(results) {
        // Actualizar estadísticas del sistema IA
        const aiStatus = document.getElementById('aiStatus');
        if (aiStatus) {
            const health = results.system_health.overall_health;
            aiStatus.textContent = `IA: ${health}`;
            aiStatus.className = `ai-status ${health}`;
        }
        
        // Actualizar última actualización con análisis IA
        const lastUpdate = document.getElementById('lastUpdate');
        if (lastUpdate) {
            const now = new Date();
            lastUpdate.textContent = `${now.getHours()}:${now.getMinutes().toString().padStart(2, '0')} (IA)`;
        }
        
        console.log('📊 UI actualizada con datos IA');
    }

    async enrichMunicipalitiesWithAI() {
        try {
            console.log('🤖 Enriqueciendo datos con análisis IA...');
            
            // Obtener municipios clave para análisis IA
            const keyMunicipalities = this.allMunicipalities.filter(m => 
                m.hasCoordinates && (m.visitants_anuals > 500000 || m.poblacio > 100000)
            );
            
            const promises = keyMunicipalities.slice(0, 10).map(async municipality => {
                try {
                    // Enviar datos con ventana temporal actual
                    const requestData = {
                        ...municipality,
                        prediction_window: this.state.selectedPrediction || '48'
                    };
                    
                    const response = await fetch('/api/ai-analysis', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(requestData)
                    });
                    
                    if (response.ok) {
                        const result = await response.json();
                        if (result.success) {
                            municipality.aiAnalysis = result.data;
                            municipality.aiEnriched = true;
                            municipality.predictionWindow = this.state.selectedPrediction || '48';
                            console.log(`✅ IA analizado: ${municipality.name} (${municipality.predictionWindow}h) - Multiplicador: ${result.data.tourism_multiplier}x`);
                        }
                    }
                } catch (error) {
                    console.log(`⚠️ IA no disponible para ${municipality.name}`);
                }
                return municipality;
            });
            
            await Promise.all(promises);
            console.log(`🧠 ${keyMunicipalities.filter(m => m.aiEnriched).length} municipios analizados con IA`);
            
        } catch (error) {
            console.log('ℹ️ Análisis IA no disponible, usando datos estáticos');
        }
    }

    calculateAIIntensity(municipality) {
        let intensidad = 0;
        const currentPredictionWindow = this.state.selectedPrediction || '48';
        
        // Si tiene análisis IA, usar multiplicador turístico
        if (municipality.aiAnalysis && municipality.aiAnalysis.tourism_multiplier) {
            const multiplier = municipality.aiAnalysis.tourism_multiplier;
            intensidad = Math.min(1.0, multiplier / 2.0); // Normalizar a 0-1
            
            // Ajustar por nivel de riesgo IA
            if (municipality.aiAnalysis.risk_level === 'crítico') intensidad = Math.min(1.0, intensidad + 0.3);
            else if (municipality.aiAnalysis.risk_level === 'alto') intensidad = Math.min(1.0, intensidad + 0.2);
            else if (municipality.aiAnalysis.risk_level === 'medio') intensidad = Math.min(1.0, intensidad + 0.1);
            
            // Ajustar intensidad según ventana temporal
            const timeMultipliers = {
                '24': 1.2,  // Mayor intensidad para predicciones a corto plazo
                '48': 1.0,  // Base normal
                '168': 0.8  // Menor intensidad para predicciones a largo plazo
            };
            intensidad *= (timeMultipliers[currentPredictionWindow] || 1.0);
            
        } else {
            // Fallback a datos estáticos con variación temporal más dramática
            if (municipality.alertLevel === 'critical') intensidad = 1.0;
            else if (municipality.alertLevel === 'high') intensidad = 0.75;
            else if (municipality.alertLevel === 'medium') intensidad = 0.5;
            else intensidad = 0.25;
            
            // Simulación de variación temporal MÁS VISIBLE para datos estáticos
            const timeVariations = {
                '24': 1.3,  // 30% más intenso a corto plazo
                '48': 1.0,  // Normal
                '168': 0.7  // 30% menos intenso a largo plazo
            };
            intensidad *= (timeVariations[currentPredictionWindow] || 1.0);
            
            // Bonus extra para municipios turísticos según ventana temporal
            if (municipality.visitants_anuals >= 5000000) {
                const extraBonus = {
                    '24': 0.2,  // Más urgencia en 24h
                    '48': 0.1,  // Bonus normal
                    '168': 0.05 // Menos urgencia en 1 semana
                };
                intensidad += (extraBonus[currentPredictionWindow] || 0);
            }
        }
        
        // Bonus por volumen de turistas
        if (municipality.visitants_anuals >= 10000000) intensidad = Math.min(1.0, intensidad + 0.4);
        else if (municipality.visitants_anuals >= 2000000) intensidad = Math.min(1.0, intensidad + 0.2);
        else if (municipality.visitants_anuals >= 1000000) intensidad = Math.min(1.0, intensidad + 0.1);
        
        // Asegurar que no exceda 1.0
        const finalIntensity = Math.min(1.0, intensidad);
        
        // Log para debug - mostrar cambios de intensidad
        if (municipality.name && ['Barcelona', 'Lloret de Mar', 'Salou'].includes(municipality.name)) {
            console.log(`🎯 ${municipality.name} (${currentPredictionWindow}h): Intensidad ${finalIntensity.toFixed(2)}`);
        }
        
        return finalIntensity;
    }

    getFallbackData() {
        return [
            { 
                id: '080193', name: 'Barcelona', comarca: 'Barcelonès', 
                poblacio: 1620343, visitants_anuals: 15000000, ratio_turistes: 9.25, 
                alertLevel: 'critical', latitude: 41.3851, longitude: 2.1734, hasCoordinates: true 
            },
            { 
                id: '171032', name: 'Lloret de Mar', comarca: 'Selva', 
                poblacio: 40942, visitants_anuals: 3500000, ratio_turistes: 85.5, 
                alertLevel: 'critical', latitude: 41.6963, longitude: 2.8464, hasCoordinates: true 
            },
            { 
                id: '431713', name: 'Salou', comarca: 'Tarragonès', 
                poblacio: 28563, visitants_anuals: 2500000, ratio_turistes: 87.52, 
                alertLevel: 'critical', latitude: 41.0765, longitude: 1.1398, hasCoordinates: true 
            }
        ];
    }
}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 Inicializando Tourism Alarm App...');
    window.app = new TourismAlarmApp();
});