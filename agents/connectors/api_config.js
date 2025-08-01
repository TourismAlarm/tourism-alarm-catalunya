// Configuración de APIs externas para Tourism Alarm
export const API_CONFIG = {
    // OpenWeatherMap - GRATIS hasta 1000 llamadas/día
    // Regístrate en: https://openweathermap.org/api
    OPENWEATHER_API_KEY: process.env.OPENWEATHER_API_KEY || 'TU_API_KEY_AQUI',
    
    // Ticketmaster - GRATIS hasta 5000 llamadas/día  
    // Regístrate en: https://developer.ticketmaster.com/
    TICKETMASTER_API_KEY: process.env.TICKETMASTER_API_KEY || 'TU_API_KEY_AQUI',
    
    // TomTom Traffic - GRATIS hasta 2500 llamadas/día
    // Regístrate en: https://developer.tomtom.com/
    TOMTOM_API_KEY: process.env.TOMTOM_API_KEY || 'TU_API_KEY_AQUI',
    
    // Configuración de cache (en minutos)
    CACHE_DURATION: {
        weather: 60,        // 1 hora
        events: 720,        // 12 horas  
        traffic: 15         // 15 minutos
    },
    
    // Configuración de rate limiting
    RATE_LIMITS: {
        weather: 50,        // Por hora
        events: 100,        // Por hora
        traffic: 200        // Por hora
    }
};

// Función helper para validar configuración
export function validateAPIConfig() {
    const missingKeys = [];
    
    if (API_CONFIG.OPENWEATHER_API_KEY === 'TU_API_KEY_AQUI') {
        missingKeys.push('OPENWEATHER_API_KEY');
    }
    
    if (API_CONFIG.TICKETMASTER_API_KEY === 'TU_API_KEY_AQUI') {
        missingKeys.push('TICKETMASTER_API_KEY');
    }
    
    if (API_CONFIG.TOMTOM_API_KEY === 'TU_API_KEY_AQUI') {
        missingKeys.push('TOMTOM_API_KEY');
    }
    
    if (missingKeys.length > 0) {
        console.warn('⚠️ APIs sin configurar:', missingKeys);
        console.log('💡 Para obtener APIs gratuitas:');
        console.log('   🌤️ OpenWeather: https://openweathermap.org/api');
        console.log('   🎫 Ticketmaster: https://developer.ticketmaster.com/');
        console.log('   🚦 TomTom: https://developer.tomtom.com/');
        return false;
    }
    
    console.log('✅ Todas las APIs configuradas correctamente');
    return true;
}

export default API_CONFIG;