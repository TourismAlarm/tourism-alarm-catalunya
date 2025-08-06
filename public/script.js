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
        
        // LÍMITES DE ZOOM - Solo limitar ZOOM IN máximo
        this.map.options.maxZoom = 11; // Límite máximo zoom in
        // NO limitar zoom out - que se pueda hacer zoom out libremente
        
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors'
        }).addTo(this.map);
        this.markersLayer = L.layerGroup().addTo(this.map);
    }

    // NUEVA FUNCIÓN: Verificar si coordenadas están en el mar
    isInSea(lat, lng) {
        // Definir áreas marítimas aproximadas para excluir
        const seaAreas = [
            // Mar Mediterráneo frente a Barcelona
            { minLat: 41.2, maxLat: 41.5, minLng: 2.5, maxLng: 3.5 },
            // Mar frente a Tarragona  
            { minLat: 40.8, maxLat: 41.2, minLng: 1.5, maxLng: 2.5 },
            // Mar frente a Girona/Costa Brava
            { minLat: 41.5, maxLat: 42.5, minLng: 3.0, maxLng: 3.5 },
            // Área general marítima
            { minLat: 40.5, maxLat: 43.0, minLng: 3.22, maxLng: 4.0 }
        ];
        
        return seaAreas.some(area => 
            lat >= area.minLat && lat <= area.maxLat &&
            lng >= area.minLng && lng <= area.maxLng
        );
    }

    // NUEVA FUNCIÓN: Verificar si coordenadas están en Catalunya tierra firme
    isValidCataluniaCoordinate(lat, lng) {
        // Límites más estrictos para Catalunya (sin mar)
        const withinBounds = lat >= 40.52 && lat <= 42.86 && 
                            lng >= 0.16 && lng <= 3.22; // Límite este reducido
        
        const notInSea = !this.isInSea(lat, lng);
        
        // Verificaciones adicionales para zonas problemáticas
        const notInFrance = !(lat > 42.6 && lng > 2.8); // Evitar sur de Francia
        const notInAragon = !(lng < 0.3); // Evitar Aragón occidental
        
        return withinBounds && notInSea && notInFrance && notInAragon;
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
            
            // Mapear coordenadas de la API (lat/lng) a formato interno (latitude/longitude)
            this.allMunicipalities = result.data.map(municipality => {
                // PRIORIDAD 1: Usar coordenadas de la API si están disponibles
                if (municipality.lat && municipality.lng) {
                    return {
                        ...municipality,
                        latitude: municipality.lat,
                        longitude: municipality.lng,
                        hasCoordinates: true
                    };
                }
                
                // PRIORIDAD 2: Fallback al diccionario COORDS para municipios sin coordenadas en API
                const coords = this.COORDS[municipality.id];
                if (coords) {
                    return {
                        ...municipality,
                        latitude: coords[0],
                        longitude: coords[1],
                        hasCoordinates: true
                    };
                }
                
                // Si no hay coordenadas, marcarlo pero no descartar
                return {
                    ...municipality,
                    hasCoordinates: false
                };
            });
            
            // Log estadísticas de coordenadas
            const withCoords = this.allMunicipalities.filter(m => m.hasCoordinates).length;
            const totalMunicipalities = this.allMunicipalities.length;
            console.log(`📍 Coordenadas: ${withCoords}/${totalMunicipalities} municipios tienen coordenadas`);
            
            if (withCoords < totalMunicipalities * 0.9) {
                console.warn(`⚠️ Muchos municipios SIN coordenadas: ${totalMunicipalities - withCoords}`);
            }
            
            // DEBUGGING: Mostrar muestra de municipios para verificar coordenadas
            console.log('🔍 MUESTRA DE MUNICIPIOS Y SUS COORDENADAS:');
            this.allMunicipalities.slice(0, 5).forEach(m => {
                console.log(`  ${m.name}: lat=${m.latitude}, lng=${m.longitude}, hasCoords=${m.hasCoordinates}`);
            });
            
            // Verificar si tenemos coordenadas de Catalunya
            const coordMunicipalities = this.allMunicipalities.filter(m => m.latitude && m.longitude);
            if (coordMunicipalities.length > 0) {
                const lats = coordMunicipalities.map(m => m.latitude);
                const lngs = coordMunicipalities.map(m => m.longitude);
                const dataBounds = {
                    north: Math.max(...lats),
                    south: Math.min(...lats),
                    east: Math.max(...lngs),
                    west: Math.min(...lngs)
                };
                
                console.log('📍 BOUNDS DE LOS DATOS DE MUNICIPIOS:');
                console.log(`  Norte: ${dataBounds.north.toFixed(4)}`);
                console.log(`  Sur: ${dataBounds.south.toFixed(4)}`);
                console.log(`  Este: ${dataBounds.east.toFixed(4)}`);
                console.log(`  Oeste: ${dataBounds.west.toFixed(4)}`);
            }
            
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
            console.log('🔥 Creando HEATMAP REAL con datos oficiales + IA...');
            
            // Limpiar capa anterior
            if (this.heatmapLayer) {
                this.map.removeLayer(this.heatmapLayer);
            }
            
            // Obtener análisis IA enriquecido para determinar intensidades
            const realPredictions = await this.enrichMunicipalitiesWithAI();
            
            // Actualizar UI con predicciones reales obtenidas
            if (realPredictions) {
                this.updatePredictionsUI(realPredictions);
            }
            
            // GENERAR PUNTOS PARA HEATMAP CONTINUO
            const heatmapPoints = [];
            let municipiosProcessados = 0;
            let municipiosSinCoords = 0;
            
            this.allMunicipalities.forEach(municipality => {
                // Verificar coordenadas válidas
                if (municipality.latitude && municipality.longitude && 
                    !isNaN(municipality.latitude) && !isNaN(municipality.longitude)) {
                    
                    municipiosProcessados++;
                    
                    // Calcular intensidad IA para este municipio
                    const aiIntensity = this.calculateAIIntensity(municipality);
                    
                    // Validar coordenadas dentro de Catalunya
                    const lat = municipality.latitude;
                    const lng = municipality.longitude;
                    
                    if (lat >= 40.5 && lat <= 42.9 && lng >= 0.1 && lng <= 3.3) {
                        // Generar múltiples puntos alrededor del municipio para heatmap suave
                        const numPoints = Math.max(3, Math.floor(aiIntensity * 20) + 5);
                        
                        for (let i = 0; i < numPoints; i++) {
                            // Variación pequeña para crear gradiente suave
                            const variation = 0.01; // ~1km de variación
                            const pointLat = lat + (Math.random() - 0.5) * variation;
                            const pointLng = lng + (Math.random() - 0.5) * variation;
                            
                            // Intensidad con variación para suavizado natural
                            const pointIntensity = aiIntensity * (0.8 + Math.random() * 0.4);
                            
                            // Añadir punto al heatmap: [lat, lng, intensity]
                            heatmapPoints.push([pointLat, pointLng, pointIntensity]);
                        }
                        
                        // Log para municipios principales
                        if (['Barcelona', 'Girona', 'Tarragona', 'Lleida', 'Lloret de Mar', 'Salou'].includes(municipality.name)) {
                            console.log(`🎯 ${municipality.name}: lat=${lat.toFixed(4)}, lng=${lng.toFixed(4)}, intensidad=${aiIntensity.toFixed(3)}, puntos=${numPoints}`);
                        }
                    }
                } else {
                    municipiosSinCoords++;
                }
            });
            
            console.log(`📊 Procesados: ${municipiosProcessados} municipios, ${municipiosSinCoords} sin coordenadas`);
            console.log(`🔥 Puntos heatmap generados: ${heatmapPoints.length}`);
            
            // DEBUGGING: Mostrar muestra de coordenadas para verificar que son correctas
            if (heatmapPoints.length > 0) {
                console.log('🔍 MUESTRA DE COORDENADAS PARA DEBUG:');
                heatmapPoints.slice(0, 10).forEach((point, i) => {
                    console.log(`  ${i+1}. lat=${point[0].toFixed(4)}, lng=${point[1].toFixed(4)}, intensity=${point[2].toFixed(3)}`);
                });
                
                // Calcular bounds para verificar que cubren Catalunya
                const lats = heatmapPoints.map(p => p[0]);
                const lngs = heatmapPoints.map(p => p[1]);
                const bounds = {
                    north: Math.max(...lats),
                    south: Math.min(...lats),
                    east: Math.max(...lngs),
                    west: Math.min(...lngs)
                };
                
                console.log('📍 BOUNDS DEL HEATMAP:');
                console.log(`  Norte: ${bounds.north.toFixed(4)} (debería ser ~42.9)`);
                console.log(`  Sur: ${bounds.south.toFixed(4)} (debería ser ~40.5)`);
                console.log(`  Este: ${bounds.east.toFixed(4)} (debería ser ~3.3)`);
                console.log(`  Oeste: ${bounds.west.toFixed(4)} (debería ser ~0.1)`);
                
                // Verificar si parece Catalunya
                const isValidBounds = bounds.north <= 42.9 && bounds.south >= 40.5 && 
                                     bounds.east <= 3.3 && bounds.west >= 0.1;
                                     
                if (isValidBounds) {
                    console.log('✅ Las coordenadas parecen estar en Catalunya');
                } else {
                    console.warn('⚠️ LAS COORDENADAS NO PARECEN SER DE CATALUNYA!');
                    console.warn('   Esto explicaría por qué se ve como un cuadrado');
                }
            }
            
            if (heatmapPoints.length === 0) {
                throw new Error('No se pudieron generar puntos para el heatmap');
            }
            
            // CONFIGURACIÓN HEATMAP PROFESIONAL (tipo meteorológico)
            const heatmapConfig = {
                radius: 25,          // Radio de influencia de cada punto
                blur: 20,            // Difuminado suave para gradiente continuo
                minOpacity: 0.1,     // Transparencia mínima
                maxZoom: 18,         // Funciona en todos los zooms
                max: 1.0,            // Intensidad máxima normalizada
                gradient: {
                    // Gradiente estilo meteorológico profesional
                    0.0: 'rgba(0, 255, 0, 0)',      // Transparente
                    0.1: '#00FF00',                   // Verde bajo riesgo
                    0.3: '#7FFF00',                   // Verde-amarillo
                    0.5: '#FFFF00',                   // Amarillo medio
                    0.7: '#FFA500',                   // Naranja alto
                    0.85: '#FF4500',                  // Rojo-naranja crítico  
                    1.0: '#FF0000'                    // Rojo máximo
                }
            };
            
            console.log('📊 Configuración heatmap meteorológico:', {
                puntos: heatmapPoints.length,
                municipios: municipiosProcessados,
                radius: heatmapConfig.radius,
                blur: heatmapConfig.blur
            });
            
            // CREAR HEATMAP CONTINUO CON L.heatLayer
            this.heatmapLayer = L.heatLayer(heatmapPoints, heatmapConfig).addTo(this.map);
            
            console.log('✅ HEATMAP REAL creado - Difuminado continuo tipo meteorológico');
            
            // Control de visibilidad según zoom (opcional)
            this.map.off('zoomend'); // Limpiar eventos anteriores
            this.map.on('zoomend', () => {
                const zoom = this.map.getZoom();
                if (zoom < 5) {
                    // Ocultar en zoom muy alejado para performance
                    if (this.map.hasLayer(this.heatmapLayer)) {
                        this.map.removeLayer(this.heatmapLayer);
                    }
                } else {
                    // Mostrar heatmap en zoom normal
                    if (!this.map.hasLayer(this.heatmapLayer)) {
                        this.heatmapLayer.addTo(this.map);
                    }
                }
            });
            
            this.updateStats();
            
        } catch (error) {
            console.error('❌ Error creating heatmap:', error);
            this.showError('Error creando heatmap: ' + error.message);
            
            // Fallback básico con coordenadas conocidas
            this.createFallbackHeatmap();
        }
    }
    
    createFallbackHeatmap() {
        console.log('🔧 Creando heatmap fallback con municipios conocidos...');
        
        const fallbackPoints = [];
        
        // Usar municipios con coordenadas conocidas del diccionario COORDS
        Object.keys(this.COORDS).forEach(municipalityId => {
            const coords = this.COORDS[municipalityId];
            const municipality = this.allMunicipalities.find(m => m.id === municipalityId);
            
            if (municipality) {
                const intensity = this.calculateAIIntensity(municipality);
                const numPoints = Math.floor(intensity * 15) + 3;
                
                for (let i = 0; i < numPoints; i++) {
                    const variation = 0.008;
                    fallbackPoints.push([
                        coords[0] + (Math.random() - 0.5) * variation,
                        coords[1] + (Math.random() - 0.5) * variation,
                        intensity * (0.9 + Math.random() * 0.2)
                    ]);
                }
            }
        });
        
        if (fallbackPoints.length > 0) {
            const config = {
                radius: 30,
                blur: 25,
                minOpacity: 0.2,
                max: 1.0,
                gradient: {
                    0.0: 'rgba(0, 255, 0, 0)',
                    0.2: '#00FF00',
                    0.4: '#7FFF00', 
                    0.6: '#FFFF00',
                    0.8: '#FFA500',
                    1.0: '#FF0000'
                }
            };
            
            this.heatmapLayer = L.heatLayer(fallbackPoints, config).addTo(this.map);
            console.log(`✅ Heatmap fallback creado con ${fallbackPoints.length} puntos`);
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
        console.log('⏰ Configurando actualizaciones optimizadas para MVP...');
        
        // Actualización completa cada 6 horas (datos + geometrías)
        const dataUpdateInterval = 6 * 60 * 60 * 1000; // 6 horas
        setInterval(async () => {
            console.log('🔄 Actualización completa cada 6h - Recargando datos y geometrías...');
            try {
                await this.loadMunicipalitiesData();
                await this.createHeatmap();
                this.showNotification('🔄 Datos actualizados automáticamente', 'success');
                console.log('✅ Actualización completa de 6h completada');
            } catch (error) {
                console.error('❌ Error en actualización de 6h:', error);
                this.showNotification('⚠️ Error actualizando datos', 'error');
            }
        }, dataUpdateInterval);
        
        // Actualización de predicciones IA cada 1 hora (solo cálculos)
        const predictionUpdateInterval = 60 * 60 * 1000; // 1 hora
        setInterval(() => {
            console.log('🧠 Actualización predicciones IA cada 1h...');
            this.refreshData();
        }, predictionUpdateInterval);
        
        // Análisis IA profundo cada 3 horas para municipios clave
        const deepAnalysisInterval = 3 * 60 * 60 * 1000; // 3 horas
        setInterval(() => {
            console.log('🔬 Análisis IA profundo cada 3h...');
            this.runDeepAIAnalysis();
        }, deepAnalysisInterval);
        
        console.log('✅ Actualizaciones configuradas: datos/geometrías cada 6h, predicciones cada 1h, análisis profundo cada 3h');
    }
    
    showNotification(message, type = 'info') {
        // Crear notification element si no existe
        let notification = document.getElementById('systemNotification');
        if (!notification) {
            notification = document.createElement('div');
            notification.id = 'systemNotification';
            notification.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                background: #2c3e50;
                color: white;
                padding: 10px 20px;
                border-radius: 5px;
                z-index: 9999;
                font-family: 'Segoe UI', sans-serif;
                box-shadow: 0 4px 6px rgba(0,0,0,0.1);
                opacity: 0;
                transition: opacity 0.3s ease;
                max-width: 300px;
            `;
            document.body.appendChild(notification);
        }
        
        // Actualizar mensaje y mostrar
        notification.textContent = message;
        notification.style.background = type === 'error' ? '#e74c3c' : 
                                       type === 'success' ? '#27ae60' : '#2c3e50';
        notification.style.opacity = '1';
        
        // Auto-hide después de 4 segundos
        setTimeout(() => {
            notification.style.opacity = '0';
        }, 4000);
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
        console.log('🎯 Actualizando UI con predicciones:', predictions);
        
        // Actualizar predicciones IA en la interfaz
        const predBarcelona = document.getElementById('predBarcelona');
        const predCosta = document.getElementById('predCosta');
        const predPirineos = document.getElementById('predPirineos');
        const generalTrend = document.getElementById('generalTrend');

        // PRIMERA PRIORIDAD: Usar predicciones reales de la API si están disponibles
        if (predictions && predictions.predictions && predictions.predictions.length > 0) {
            console.log('📊 Usando predicciones REALES de la API');
            
            const apiPredictions = predictions.predictions;
            
            // Buscar predicciones específicas en datos reales
            const barcelonaPred = apiPredictions.find(p => 
                p.municipality && p.municipality.toLowerCase().includes('barcelona')
            );
            const costaPred = apiPredictions.find(p => 
                p.municipality && ['lloret', 'blanes', 'roses', 'salou', 'cambrils'].some(city => 
                    p.municipality.toLowerCase().includes(city)
                )
            );
            const pirineosPred = apiPredictions.find(p => 
                p.municipality && ['lleida', 'girona', 'puigcerdà'].some(city => 
                    p.municipality.toLowerCase().includes(city)
                )
            );
            
            if (predBarcelona && barcelonaPred) {
                predBarcelona.textContent = `${barcelonaPred.expected_flow} (${barcelonaPred.saturation_probability}%)`;
                predBarcelona.className = `prediction-value ${barcelonaPred.risk_level}`;
            }
            
            if (predCosta && costaPred) {
                predCosta.textContent = `${costaPred.expected_flow} (${costaPred.saturation_probability}%)`;
                predCosta.className = `prediction-value ${costaPred.risk_level}`;
            } else if (predCosta) {
                // Usar promedio de las predicciones disponibles para costa
                const avgSaturation = Math.floor(apiPredictions.reduce((acc, p) => acc + p.saturation_probability, 0) / apiPredictions.length);
                predCosta.textContent = `Medio (${avgSaturation}%)`;
                predCosta.className = `prediction-value medio`;
            }
            
            if (predPirineos && pirineosPred) {
                predPirineos.textContent = `${pirineosPred.expected_flow} (${pirineosPred.saturation_probability}%)`;
                predPirineos.className = `prediction-value ${pirineosPred.risk_level}`;
            } else if (predPirineos) {
                // Usar datos más conservadores para Pirineos
                const avgSaturation = Math.floor(apiPredictions.reduce((acc, p) => acc + p.saturation_probability, 0) / apiPredictions.length * 0.7);
                predPirineos.textContent = `Bajo (${avgSaturation}%)`;
                predPirineos.className = `prediction-value bajo`;
            }
            
            if (generalTrend && predictions.global_trends) {
                generalTrend.textContent = `${predictions.global_trends.overall_risk} - IA Real (${Math.floor(predictions.confidence * 100)}%)`;
                generalTrend.className = `prediction-value ${predictions.global_trends.overall_risk}`;
            }
            
            console.log('✅ UI actualizada con predicciones REALES de la API');
            return;
        }

        // SEGUNDA PRIORIDAD: Obtener predicciones del heatmap actual (si las hay)
        const currentPredictions = this.getCurrentPredictionsFromMunicipalities();
        
        if (currentPredictions && currentPredictions.length > 0) {
            console.log('📊 Usando predicciones del heatmap actual');
            
            // Buscar predicciones específicas del sistema actual
            const barcelonaPred = currentPredictions.find(p => 
                p.municipality && p.municipality.toLowerCase().includes('barcelona')
            );
            const costaPred = currentPredictions.find(p => 
                p.municipality && ['lloret', 'blanes', 'roses'].some(city => 
                    p.municipality.toLowerCase().includes(city)
                )
            );
            const pirineosPred = currentPredictions.find(p => 
                p.municipality && ['lleida', 'girona'].some(city => 
                    p.municipality.toLowerCase().includes(city)
                )
            );
            
            if (predBarcelona && barcelonaPred) {
                predBarcelona.textContent = `${barcelonaPred.expected_flow} (${barcelonaPred.saturation_probability}%)`;
                predBarcelona.className = `prediction-value ${barcelonaPred.risk_level}`;
            } else if (predBarcelona) {
                predBarcelona.textContent = 'Calculando...';
            }
            
            if (predCosta && costaPred) {
                predCosta.textContent = `${costaPred.expected_flow} (${costaPred.saturation_probability}%)`;
                predCosta.className = `prediction-value ${costaPred.risk_level}`;
            } else if (predCosta) {
                predCosta.textContent = 'Calculando...';
            }
            
            if (predPirineos && pirineosPred) {
                predPirineos.textContent = `${pirineosPred.expected_flow} (${pirineosPred.saturation_probability}%)`;
                predPirineos.className = `prediction-value ${pirineosPred.risk_level}`;
            } else if (predPirineos) {
                predPirineos.textContent = 'Calculando...';
            }
            
            // Tendencia general basada en municipios con predicciones
            if (generalTrend) {
                const riskLevels = currentPredictions.map(p => p.risk_level);
                const avgRisk = this.calculateAverageRisk(riskLevels);
                const avgConfidence = Math.floor(currentPredictions.length / this.allMunicipalities.length * 100);
                
                generalTrend.textContent = `${avgRisk} - Cobertura: ${avgConfidence}%`;
                generalTrend.className = `prediction-value ${avgRisk}`;
            }
            
        } else if (predictions && (predictions.next_48h || predictions.predictions)) {
            // Fallback al formato original
            console.log('📊 Usando formato de predicciones original');
            const pred48h = predictions.next_48h || predictions;
            
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
        } else {
            console.log('⚠️ No hay predicciones disponibles, generando fallback...');
            
            // FALLBACK: Generar predicciones básicas cuando no hay datos IA
            const currentWindow = this.state.selectedPrediction || '48';
            const timeLabels = {
                '24': { multiplier: 1.2, base: 'Alto' },
                '48': { multiplier: 1.0, base: 'Medio' },
                '168': { multiplier: 0.8, base: 'Medio-Bajo' }
            };
            const timeConfig = timeLabels[currentWindow] || timeLabels['48'];
            
            if (predBarcelona) {
                predBarcelona.textContent = `${timeConfig.base} (${Math.floor(45 * timeConfig.multiplier)}%)`;
                predBarcelona.className = `prediction-value medio`;
            }
            
            if (predCosta) {
                predCosta.textContent = `${timeConfig.base} (${Math.floor(55 * timeConfig.multiplier)}%)`;
                predCosta.className = `prediction-value alto`;
            }
            
            if (predPirineos) {
                predPirineos.textContent = `${timeConfig.base} (${Math.floor(35 * timeConfig.multiplier)}%)`;
                predPirineos.className = `prediction-value bajo`;
            }
            
            if (generalTrend) {
                generalTrend.textContent = `${timeConfig.base} - Estimación temporal`;
                generalTrend.className = `prediction-value medio`;
            }
            
            console.log(`📊 Fallback aplicado para ventana ${currentWindow}h`);
        }
    }

    getCurrentPredictionsFromMunicipalities() {
        // Extraer predicciones de municipios que las tienen
        const predictions = [];
        
        this.allMunicipalities.forEach(municipality => {
            if (municipality.aiPrediction) {
                predictions.push(municipality.aiPrediction);
            }
        });
        
        return predictions;
    }

    calculateAverageRisk(riskLevels) {
        const riskWeights = { 'bajo': 1, 'medio': 2, 'alto': 3, 'crítico': 4 };
        const validRisks = riskLevels.filter(r => riskWeights[r]);
        
        if (validRisks.length === 0) return 'medio';
        
        const avgWeight = validRisks.reduce((sum, risk) => sum + riskWeights[risk], 0) / validRisks.length;
        
        if (avgWeight <= 1.5) return 'bajo';
        if (avgWeight <= 2.5) return 'medio';
        if (avgWeight <= 3.5) return 'alto';
        return 'crítico';
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
            console.log('🤖 Obteniendo predicciones IA reales...');
            
            const timeframe = this.state.selectedPrediction || '48';
            const timeframeSuffix = timeframe + 'h';
            
            // Obtener predicciones reales del sistema IA
            const predictions = await this.getPredictionsFromAI(timeframeSuffix);
            
            if (predictions && predictions.predictions) {
                console.log(`🔮 Aplicando ${predictions.predictions.length} predicciones para ${timeframeSuffix}`);
                
                // Aplicar predicciones reales a municipios
                this.allMunicipalities.forEach(municipality => {
                    const prediction = predictions.predictions.find(pred => 
                        pred.municipality && pred.municipality.toLowerCase().includes(municipality.name.toLowerCase())
                    );
                    
                    if (prediction) {
                        municipality.aiPrediction = prediction;
                        municipality.predicted_intensity = prediction.saturation_probability / 100;
                        municipality.ai_risk_level = prediction.risk_level;
                        municipality.predictionWindow = timeframe;
                        console.log(`✅ Predicción aplicada: ${municipality.name} - Saturación: ${prediction.saturation_probability}%`);
                    }
                });
                
                // Aplicar tendencias globales para municipios sin predicción específica
                if (predictions.global_trends) {
                    this.applyGlobalTrends(predictions.global_trends);
                }
                
                // Asegurar que todos los municipios tengan predicciones
                this.ensureMunicipalitiesHavePredictions();
                
                // Devolver las predicciones obtenidas para la UI
                return predictions;
                
            } else {
                console.log('ℹ️ Usando análisis individual de municipios clave...');
                await this.fallbackToIndividualAnalysis();
            }
            
        } catch (error) {
            console.log('ℹ️ Predicciones IA no disponibles, usando datos estáticos');
            await this.fallbackToIndividualAnalysis();
            
            // Asegurar que TODOS los municipios tengan al menos predicción básica
            this.ensureMunicipalitiesHavePredictions();
        }
        
        // Devolver null si no hay predicciones reales
        return null;
    }

    async getPredictionsFromAI(timeframe) {
        try {
            console.log(`🧠 Solicitando análisis IA para muestra de municipios...`);
            
            // Usar una muestra representativa de municipios para evitar timeout
            const sampleMunicipalities = this.allMunicipalities
                .filter(m => m.hasCoordinates)
                .sort((a, b) => (b.visitants_anuals || 0) - (a.visitants_anuals || 0))
                .slice(0, 100); // Top 100 municipios más importantes
            
            const response = await fetch('/api/ai-predictions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    timeframe,
                    municipalities: sampleMunicipalities
                })
            });
            
            if (response.ok) {
                const result = await response.json();
                console.log(`📊 Recibidas ${result.data?.predictions?.length || 0} predicciones IA para ${timeframe}`);
                
                // Si obtenemos predicciones válidas, devolver
                if (result.success && result.data && result.data.predictions) {
                    return result.data;
                }
            }
        } catch (error) {
            console.log('⚠️ Error obteniendo predicciones IA:', error.message);
        }
        return null;
    }

    applyGlobalTrends(globalTrends) {
        const riskMultipliers = {
            'bajo': 0.6,
            'medio': 1.0,
            'alto': 1.4,
            'crítico': 1.8
        };
        
        const globalRiskMultiplier = riskMultipliers[globalTrends.overall_risk] || 1.0;
        
        this.allMunicipalities.forEach(municipality => {
            if (!municipality.aiPrediction) {
                // Aplicar tendencia global con variación aleatoria
                const baseIntensity = 0.5;
                const variation = (Math.random() - 0.5) * 0.3;
                municipality.predicted_intensity = Math.max(0.1, Math.min(1.0, 
                    (baseIntensity + variation) * globalRiskMultiplier
                ));
                municipality.ai_risk_level = globalTrends.overall_risk;
            }
        });
    }

    async fallbackToIndividualAnalysis() {
        // Fallback al sistema anterior para municipios clave
        const keyMunicipalities = this.allMunicipalities.filter(m => 
            m.hasCoordinates && (m.visitants_anuals > 500000 || m.poblacio > 100000)
        );
        
        const promises = keyMunicipalities.slice(0, 10).map(async municipality => {
            try {
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
                    }
                }
            } catch (error) {
                console.log(`⚠️ IA no disponible para ${municipality.name}`);
            }
            return municipality;
        });
        
        await Promise.all(promises);
    }

    ensureMunicipalitiesHavePredictions() {
        const currentWindow = this.state.selectedPrediction || '48';
        let predictionsGenerated = 0;
        
        this.allMunicipalities.forEach(municipality => {
            if (!municipality.aiPrediction && !municipality.aiAnalysis && municipality.hasCoordinates) {
                // Generar predicción básica basada en datos del municipio
                let riskLevel = 'bajo';
                let saturationProb = 25;
                
                if (municipality.visitants_anuals > 5000000) {
                    riskLevel = 'alto';
                    saturationProb = 65;
                } else if (municipality.visitants_anuals > 1000000) {
                    riskLevel = 'medio'; 
                    saturationProb = 45;
                } else if (municipality.visitants_anuals > 500000) {
                    riskLevel = 'medio';
                    saturationProb = 35;
                }
                
                // Aplicar variación temporal
                const timeHours = parseInt(currentWindow);
                if (timeHours <= 24) {
                    saturationProb = Math.min(90, Math.floor(saturationProb * 1.2));
                } else if (timeHours >= 168) {
                    saturationProb = Math.max(10, Math.floor(saturationProb * 0.8));
                }
                
                municipality.aiPrediction = {
                    municipality: municipality.name,
                    expected_flow: riskLevel,
                    saturation_probability: saturationProb,
                    risk_level: riskLevel,
                    data_source: 'statistical_fallback'
                };
                
                municipality.predicted_intensity = saturationProb / 100;
                municipality.ai_risk_level = riskLevel;
                municipality.predictionWindow = currentWindow;
                
                predictionsGenerated++;
            }
        });
        
        console.log(`📊 Generadas ${predictionsGenerated} predicciones de fallback para ventana ${currentWindow}h`);
    }

    calculateAIIntensity(municipality) {
        let intensidad = 0;
        const currentPredictionWindow = this.state.selectedPrediction || '48';
        
        // PRIORIDAD 1: Usar predicciones reales de IA si están disponibles
        if (municipality.aiPrediction && municipality.predicted_intensity !== undefined) {
            intensidad = municipality.predicted_intensity; // Ya normalizado 0-1
            
            // Log de predicción real
            if (municipality.name && ['Barcelona', 'Lloret de Mar', 'Salou'].includes(municipality.name)) {
                console.log(`🔮 ${municipality.name} (${currentPredictionWindow}h): Predicción IA real - Saturación ${(intensidad * 100).toFixed(0)}% (${municipality.aiPrediction.expected_flow})`);
            }
            
        // PRIORIDAD 2: Usar análisis individual IA (fallback)
        } else if (municipality.aiAnalysis && municipality.aiAnalysis.tourism_multiplier) {
            const multiplier = municipality.aiAnalysis.tourism_multiplier;
            intensidad = Math.min(1.0, multiplier / 2.0); // Normalizar a 0-1
            
            // Ajustar por nivel de riesgo IA
            if (municipality.aiAnalysis.risk_level === 'crítico') intensidad = Math.min(1.0, intensidad + 0.3);
            else if (municipality.aiAnalysis.risk_level === 'alto') intensidad = Math.min(1.0, intensidad + 0.2);
            else if (municipality.aiAnalysis.risk_level === 'medio') intensidad = Math.min(1.0, intensidad + 0.1);
            
            if (municipality.name && ['Barcelona', 'Lloret de Mar', 'Salou'].includes(municipality.name)) {
                console.log(`🤖 ${municipality.name} (${currentPredictionWindow}h): Análisis IA individual - Multiplicador ${multiplier}x`);
            }
            
        // PRIORIDAD 3: Tendencias globales aplicadas
        } else if (municipality.ai_risk_level) {
            const riskIntensities = {
                'bajo': 0.3,
                'medio': 0.6,
                'alto': 0.8,
                'crítico': 1.0
            };
            intensidad = riskIntensities[municipality.ai_risk_level] || 0.5;
            
            if (municipality.name && ['Barcelona', 'Lloret de Mar', 'Salou'].includes(municipality.name)) {
                console.log(`🌍 ${municipality.name} (${currentPredictionWindow}h): Tendencia global - Riesgo ${municipality.ai_risk_level}`);
            }
            
        // PRIORIDAD 4: Fallback a datos estáticos (último recurso)
        } else {
            if (municipality.alertLevel === 'critical') intensidad = 1.0;
            else if (municipality.alertLevel === 'high') intensidad = 0.75;
            else if (municipality.alertLevel === 'medium') intensidad = 0.5;
            else intensidad = 0.25;
            
            // Simulación de variación temporal para datos estáticos
            const timeVariations = {
                '24': 1.3,  // 30% más intenso a corto plazo
                '48': 1.0,  // Normal
                '168': 0.7  // 30% menos intenso a largo plazo
            };
            intensidad *= (timeVariations[currentPredictionWindow] || 1.0);
            
            if (municipality.name && ['Barcelona', 'Lloret de Mar', 'Salou'].includes(municipality.name)) {
                console.log(`📊 ${municipality.name} (${currentPredictionWindow}h): Datos estáticos - Nivel ${municipality.alertLevel || 'normal'}`);
            }
        }
        
        // Bonus por volumen de turistas (aplicar solo si no es predicción real)
        if (!municipality.aiPrediction) {
            if (municipality.visitants_anuals >= 10000000) intensidad = Math.min(1.0, intensidad + 0.3);
            else if (municipality.visitants_anuals >= 2000000) intensidad = Math.min(1.0, intensidad + 0.2);
            else if (municipality.visitants_anuals >= 1000000) intensidad = Math.min(1.0, intensidad + 0.1);
        }
        
        // Asegurar que no exceda 1.0
        return Math.min(1.0, Math.max(0.1, intensidad));
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