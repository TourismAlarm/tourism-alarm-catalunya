import { API_CONFIG, validateAPIConfig } from './api_config.js';

export class APIConnector {
    constructor() {
        this.apis = {
            weather: {
                url: 'https://api.openweathermap.org/data/2.5/weather',
                key: API_CONFIG.OPENWEATHER_API_KEY
            },
            events: {
                url: 'https://app.ticketmaster.com/discovery/v2/events',
                key: API_CONFIG.TICKETMASTER_API_KEY
            },
            traffic: {
                url: 'https://api.tomtom.com/traffic/services/4/flowSegmentData',
                key: API_CONFIG.TOMTOM_API_KEY
            }
        };
        this.cache = new Map();
        this.rateLimiter = new Map();
        
        // Validar configuración al inicializar
        this.isConfigured = validateAPIConfig();
        console.log(this.isConfigured 
            ? '🌐 APIConnector inicializado con APIs externas'
            : '⚠️ APIConnector en modo degradado - configurar APIs para funcionalidad completa'
        );
    }

    async getWeatherData(lat, lon) {
        const cached = this.getCached(`weather_${lat}_${lon}`);
        if (cached) return cached;

        try {
            const response = await fetch(
                `${this.apis.weather.url}?lat=${lat}&lon=${lon}&appid=${this.apis.weather.key}&units=metric`
            );
            const data = await response.json();
            
            const weatherInfo = {
                temp: data.main.temp,
                description: data.weather[0].description,
                humidity: data.main.humidity,
                tourism_impact: this.calculateWeatherImpact(data)
            };
            
            this.setCache(`weather_${lat}_${lon}`, weatherInfo);
            return weatherInfo;
        } catch (error) {
            console.error('Error fetching weather:', error);
            return null;
        }
    }

    async getEventsData(city) {
        const cached = this.getCached(`events_${city}`);
        if (cached) return cached;

        try {
            const response = await fetch(
                `${this.apis.events.url}?city=${city}&countryCode=ES&apikey=${this.apis.events.key}`
            );
            const data = await response.json();
            
            const events = {
                total: data._embedded?.events?.length || 0,
                major_events: data._embedded?.events?.filter(e => 
                    e.classifications?.[0]?.segment?.name === 'Sports' || 
                    e.classifications?.[0]?.segment?.name === 'Music'
                ).length || 0,
                tourism_impact: this.calculateEventImpact(data)
            };
            
            this.setCache(`events_${city}`, events);
            return events;
        } catch (error) {
            console.error('Error fetching events:', error);
            return null;
        }
    }

    calculateWeatherImpact(weather) {
        // Sol = más turismo, lluvia = menos
        const condition = weather.weather[0].main.toLowerCase();
        if (condition.includes('clear') || condition.includes('sun')) return 1.2;
        if (condition.includes('rain') || condition.includes('storm')) return 0.6;
        return 1.0;
    }

    calculateEventImpact(events) {
        const count = events._embedded?.events?.length || 0;
        if (count > 10) return 1.5; // Muchos eventos = más turismo
        if (count > 5) return 1.2;
        return 1.0;
    }

    getCached(key) {
        const cached = this.cache.get(key);
        if (cached && Date.now() - cached.timestamp < 3600000) { // 1 hora
            return cached.data;
        }
        return null;
    }

    setCache(key, data) {
        this.cache.set(key, {
            data,
            timestamp: Date.now()
        });
    }
}