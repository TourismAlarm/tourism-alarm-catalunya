// =================================================================
// TOURISM ALARM - APLICACIÓN PRINCIPAL PARA VERCEL
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
    ? 'http://localhost:3000/api'     // API local para desarrollo
    : window.location.origin + '/api'; // API Vercel para producción

// Log para verificar qué API estamos usando
console.log('🔌 Usando API:', this.apiBase);
        this.state = {
            currentMetric: 'density',
            selectedPrediction: '48',
            isLoading: false,
            apiStatus: 'connecting'
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
                document.getElementById('loadingOverlay').style.display = 'none';
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
        this.map.on('zoomend', () => {
            setTimeout(() => this.createHeatmap(), 100);
        });
    }

    setupEventListeners() {
        document.getElementById('metricSelect').addEventListener('change', (e) => {
            this.state.currentMetric = e.target.value;
            this.createHeatmap();
        });
        
        document.getElementById('predictionSelect').addEventListener('change', (e) => {
            this.state.selectedPrediction = e.target.value;
            this.updatePredictions();
        });
        
        const searchInput = document.getElementById('searchInput');
        searchInput.addEventListener('input', () => this.handleSearch());
        
        document.getElementById('refreshBtn').addEventListener('click', () => {
            this.refreshData();
        });
        
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.search-input')) {
                this.hideSearchResults();
            }
        });
    }

    async loadMunicipalitiesData() {
        try {
            this.setApiStatus('connecting');
            const response = await fetch(`${this.apiBase}/municipios`);
            const result = await response.json();
            
            if (result.success && result.data) {
                this.allMunicipalities = result.data;
                this.setApiStatus('online');
                document.getElementById('municipalitiesLoaded').textContent = `${result.data.length}/947`;
                console.log(`✅ Loaded ${result.data.length} municipalities`);
                return result.data;
            } else {
                throw new Error(result.error || 'No data received');
            }
        } catch (error) {
            console.error('❌ Error loading municipalities:', error);
            this.setApiStatus('offline');
            this.allMunicipalities = this.getFallbackData();
            document.getElementById('dataSourceType').textContent = 'Datos de respaldo';
            return this.allMunicipalities;
        }
    }

    async createHeatmap() {
        if (!this.allMunicipalities || this.allMunicipalities.length === 0) return;

        try {
            if (this.heatmapLayer) this.map.removeLayer(this.heatmapLayer);
            this.markersLayer.clearLayers();

            const points = this.generateHeatmapPoints();
            
            this.heatmapLayer = L.heatLayer(points, {
                radius: this.map.getZoom() > 10 ? 25 : 35,
                blur: this.map.getZoom() > 10 ? 15 : 25,
                maxZoom: 18,
                max: 1.0,
                minOpacity: 0.1,
                gradient: this.getGradientForMetric(this.state.currentMetric)
            }).addTo(this.map);

            if (this.map.getZoom() >= 8) this.addMunicipalityMarkers();
            this.updateLegend();
            this.updateStats();
            document.getElementById('gridPoints').textContent = points.length;
        } catch (error) {
            console.error('❌ Error creating heatmap:', error);
        }
    }

    generateHeatmapPoints() {
        const points = [];
        this.allMunicipalities.forEach(municipality => {
            const realtimeData = this.calculateRealTimeData(municipality);
            this.municipalitiesData[municipality.name] = realtimeData;
            
            let value = this.getMetricValue(municipality, realtimeData);
            let intensity = this.normalizeIntensity(value);
            
            const numPoints = Math.max(3, Math.min(15, Math.floor((municipality.area_km2 || 50) / 10)));
            const radius = Math.sqrt(municipality.area_km2 || 50) * 0.002;
            
            for (let i = 0; i < numPoints; i++) {
                const angle = Math.random() * 2 * Math.PI;
                const distance = Math.random() * radius;
                const pointLat = municipality.latitude + Math.cos(angle) * distance;
                const pointLng = municipality.longitude + Math.sin(angle) * distance;
                
                if (this.isPointInCatalunya(pointLat, pointLng)) {
                    const variation = 0.8 + Math.random() * 0.4;
                    points.push([pointLat, pointLng, intensity * variation]);
                }
            }
        });
        return points;
    }

    getMetricValue(municipality, realtimeData) {
        switch (this.state.currentMetric) {
            case 'sustainability': return realtimeData.sustainability;
            case 'population': return municipality.density || 0;
            case 'tourism_potential': return municipality.tourism_score || 5;
            default: return realtimeData.density;
        }
    }

    normalizeIntensity(value) {
        switch (this.state.currentMetric) {
            case 'sustainability': return (10 - value) / 10;
            case 'population': return Math.min(1.0, Math.log10((value || 1) + 1) / 4);
            case 'tourism_potential': return (value || 5) / 10;
            default: return (value || 50) / 100;
        }
    }

    calculateRealTimeData(municipality) {
        const hour = new Date().getHours();
        const day = new Date().getDay();
        let baseDensity = (municipality.tourism_score || 5) * 8;
        
        if (hour >= 10 && hour <= 14) baseDensity *= 1.3;
        else if (hour >= 18 && hour <= 22) baseDensity *= 1.2;
        else if (hour >= 6 && hour <= 9) baseDensity *= 0.8;
        else baseDensity *= 0.4;
        
        if (day === 0 || day === 6) baseDensity *= 1.4;
        else if (day === 5) baseDensity *= 1.2;
        else baseDensity *= 0.9;
        
        if (municipality.coastal) baseDensity *= 1.2;
        if (municipality.mountain) baseDensity *= 0.9;
        if ((municipality.population || 0) > 100000) baseDensity *= 1.1;
        
        baseDensity += (Math.random() - 0.5) * 12;
        baseDensity = Math.max(5, Math.min(98, baseDensity));
        
        const sustainability = Math.max(1.0, Math.min(10.0, 8.0 - (baseDensity - 50) / 25));
        
        return {
            density: Math.round(baseDensity),
            sustainability: Math.round(sustainability * 10) / 10,
            temperature: 15 + Math.random() * 15,
            status: baseDensity > 85 ? 'CRÍTICO' : baseDensity > 70 ? 'ALTO' : 'NORMAL',
            timestamp: Date.now()
        };
    }

    getGradientForMetric(metric) {
        const gradients = {
            density: {
                0.0: 'rgba(0, 100, 0, 0.4)', 0.2: 'rgba(50, 205, 50, 0.6)',
                0.4: 'rgba(255, 215, 0, 0.7)', 0.6: 'rgba(255, 140, 0, 0.8)',
                0.8: 'rgba(255, 69, 0, 0.9)', 1.0: 'rgba(220, 20, 60, 1.0)'
            }
        };
        return gradients[metric] || gradients.density;
    }

    updateLegend() {
        const legends = {
            density: {
                title: '🎨 Densidad Turística',
                items: [
                    { color: '#006400', text: 'Muy Baja (&lt;20%)' },
                    { color: '#32CD32', text: 'Baja (20-40%)' },
                    { color: '#FFD700', text: 'Media (40-60%)' },
                    { color: '#FF8C00', text: 'Alta (60-80%)' },
                    { color: '#FF4500', text: 'Muy Alta (80-90%)' },
                    { color: '#DC143C', text: 'Crítica (&gt;90%)' }
                ]
            }
        };
        
        const currentLegend = legends[this.state.currentMetric] || legends.density;
        document.getElementById('legendTitle').textContent = currentLegend.title;
        document.getElementById('legendContent').innerHTML = currentLegend.items.map(item => `
            <div class="legend-item">
                <div class="legend-color" style="background: ${item.color};"></div>
                <span>${item.text}</span>
            </div>
        `).join('');
    }

    updateStats() {
        const now = new Date();
        document.getElementById('lastUpdate').textContent = now.toLocaleTimeString('es-ES');
        this.updatePredictions();
    }

    updatePredictions() {
        const selectedHours = parseInt(this.state.selectedPrediction);
        document.getElementById('predictionTitle').textContent = `🤖 Predicción IA - Próximas ${selectedHours}h`;

        const predictions = {
            barcelona: { change: 5 + Math.random() * 10, trend: 'aumento' },
            costa: { change: -3 + Math.random() * 8, trend: 'estable' },
            pirineos: { change: 2 + Math.random() * 6, trend: 'ligero aumento' }
        };

        document.getElementById('predBarcelona').textContent = `↑ ${Math.round(predictions.barcelona.change)}% ${predictions.barcelona.trend}`;
        document.getElementById('predCosta').textContent = `→ ${Math.round(Math.abs(predictions.costa.change))}% ${predictions.costa.trend}`;
        document.getElementById('predPirineos').textContent = `↑ ${Math.round(predictions.pirineos.change)}% ${predictions.pirineos.trend}`;

        const avgChange = (predictions.barcelona.change + predictions.costa.change + predictions.pirineos.change) / 3;
        const generalTrend = avgChange > 3 ? '↑ Aumentando' : avgChange < -3 ? '↓ Disminuyendo' : '→ Estable';
        document.getElementById('generalTrend').textContent = generalTrend;
    }

    setupRealTimeUpdates() {
        setInterval(() => this.updatePredictions(), 120000);
        setInterval(() => this.updateStats(), 60000);
        setInterval(() => this.checkApiHealth(), 300000);
    }

async checkApiHealth() {
    try {
        // Añadir un timeout para no esperar mucho si la API local no responde
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);
        
        const response = await fetch(`${this.apiBase}/health`, {
            signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        if (response.ok) this.setApiStatus('online');
        else this.setApiStatus('offline');
    } catch (error) {
        console.warn('API no disponible, usando modo offline');
        this.setApiStatus('offline');
    }
}

    setApiStatus(status) {
        this.state.apiStatus = status;
        const statusElement = document.getElementById('apiStatus');
        const statusText = document.getElementById('apiStatusText');
        const footerStatus = document.getElementById('footerStatus');
        
        statusElement.className = `api-status ${status}`;
        
        switch (status) {
            case 'online':
                statusText.textContent = 'API Conectada';
                footerStatus.textContent = 'En línea';
                break;
            case 'offline':
                statusText.textContent = 'API Desconectada';
                footerStatus.textContent = 'Modo offline';
                break;
            default:
                statusText.textContent = 'Conectando...';
                footerStatus.textContent = 'Conectando';
        }
    }

    updateLoadingProgress(percentage, text) {
        const progressFill = document.getElementById('progressFill');
        const loadingText = document.getElementById('loadingText');
        
        if (progressFill) progressFill.style.width = percentage + '%';
        if (loadingText) loadingText.textContent = text;
    }

    showError(message) {
        const errorDiv = document.createElement('div');
        errorDiv.style.cssText = `
            position: fixed; top: 20px; right: 20px; z-index: 10000;
            background: #f8d7da; color: #721c24; padding: 12px 16px;
            border: 1px solid #f5c6cb; border-radius: 4px;
            font-size: 14px; max-width: 300px;
        `;
        errorDiv.textContent = message;
        document.body.appendChild(errorDiv);
        setTimeout(() => document.body.removeChild(errorDiv), 5000);
    }

    isPointInCatalunya(lat, lng) {
        return lat >= 40.5 && lat <= 42.9 && lng >= 0.15 && lng <= 3.35;
    }

    getFallbackData() {
        return [
            { id: '080193', name: 'Barcelona', population: 1620343, area_km2: 101.4, density: 15979, latitude: 41.3851, longitude: 2.1734, tourism_score: 9.8, coastal: false, mountain: false, comarca: 'Barcelonès', province: 'Barcelona' },
            { id: '170079', name: 'Girona', population: 103369, area_km2: 39.1, density: 2644, latitude: 41.9794, longitude: 2.8214, tourism_score: 7.2, coastal: false, mountain: false, comarca: 'Gironès', province: 'Girona' }
        ];
    }

    async refreshData() {
        const refreshBtn = document.getElementById('refreshBtn');
        const refreshIcon = document.getElementById('refreshIcon');
        
        refreshBtn.disabled = true;
        refreshIcon.style.animation = 'spin 1s linear infinite';
        
        try {
            await this.loadMunicipalitiesData();
            await this.createHeatmap();
            this.updatePredictions();
            this.updateStats();
        } catch (error) {
            console.error('❌ Error refreshing data:', error);
            this.showError('Error actualizando datos: ' + error.message);
        } finally {
            refreshBtn.disabled = false;
            refreshIcon.style.animation = '';
        }
    }

    handleSearch() {
        // Implementación básica de búsqueda
        console.log('Search functionality - to be implemented');
    }

    hideSearchResults() {
        const results = document.getElementById('searchResults');
        if (results) results.style.display = 'none';
    }

    addMunicipalityMarkers() {
        // Implementación básica de marcadores
        console.log('Municipality markers - to be implemented');
    }
}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.app = new TourismAlarmApp();
});