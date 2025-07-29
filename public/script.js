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
        console.log('🔥 Creando heatmap...');
        
        // Limpiar eventos anteriores
        this.map.off('zoomend');
        
        // Remover heatmap anterior
        if (this.heatmapLayer) {
            this.map.removeLayer(this.heatmapLayer);
        }
        
        // SOLUCIÓN: Usar SOLO coordenadas válidas de municipios (sin aleatorias)
        const puntos = [];
        
        this.allMunicipalities.forEach(m => {
            if (m.latitude && m.longitude) {
                // Validación CRÍTICA: Solo coordenadas dentro de Catalunya
                if (m.latitude >= 40.5 && m.latitude <= 42.9 && 
                    m.longitude >= 0.1 && m.longitude <= 3.4) {
                    
                    // Calcular intensidad basada en datos del municipio
                    let intensidad = 0.3; // Base
                    
                    // Intensidad por tourism_score del API
                    if (m.tourism_score) {
                        intensidad = Math.min(1.0, m.tourism_score / 100);
                    }
                    
                    // Intensidad por densidad
                    if (m.density) {
                        intensidad += Math.min(0.3, m.density / 1000);
                    }
                    
                    // FIXED: Solo 3-5 puntos cerca del centro del municipio (no aleatorios)
                    const numPuntos = 4; // Fijo para consistencia
                    
                    for (let i = 0; i < numPuntos; i++) {
                        // Micro-variación MÍNIMA (solo 0.01 grados = ~1km)
                        const latOffset = (Math.random() - 0.5) * 0.01;
                        const lngOffset = (Math.random() - 0.5) * 0.01;
                        
                        const finalLat = m.latitude + latOffset;
                        const finalLng = m.longitude + lngOffset;
                        
                        // Validación final: asegurar que sigue dentro de Catalunya
                        if (finalLat >= 40.5 && finalLat <= 42.9 && 
                            finalLng >= 0.1 && finalLng <= 3.4) {
                            
                            puntos.push([
                                finalLat, 
                                finalLng, 
                                Math.min(1.0, intensidad)
                            ]);
                        }
                    }
                }
            }
        });
        
        console.log(`🗺️ Generando heatmap con ${puntos.length} puntos VALIDADOS`);
        
        // Crear heatmap con configuración optimizada
        this.heatmapLayer = L.heatLayer(puntos, {
            radius: 25,        // Reducido para mayor precisión
            blur: 15,          // Reducido para menos difusión
            maxZoom: 18,
            max: 1.0,
            minOpacity: 0.3,
            gradient: {
                0.0: 'rgba(0,100,0,0)',      // Verde transparente
                0.2: 'rgba(0,255,0,0.4)',    // Verde
                0.4: 'rgba(255,255,0,0.6)',  // Amarillo  
                0.6: 'rgba(255,165,0,0.8)',  // Naranja
                0.8: 'rgba(255,100,0,0.9)',  // Rojo-naranja
                1.0: 'rgba(255,0,0,1.0)'     // Rojo
            }
        }).addTo(this.map);
        
        console.log('✅ Heatmap creado correctamente SIN puntos fuera de Catalunya');
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
        // Actualización cada 5 minutos
        setInterval(() => {
            this.refreshData();
        }, 5 * 60 * 1000);
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