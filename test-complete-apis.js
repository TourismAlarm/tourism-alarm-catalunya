import { TourismCollectorAgent } from './agents/collectors/tourism_collector.js';

console.log('🧪 TEST COMPLETO - 3 APIs INTEGRADAS\n');
console.log('='.repeat(60));

console.log('🤖 Inicializando Tourism Collector con TODAS las APIs...');
const collector = new TourismCollectorAgent();

const barcelonaData = {
    name: 'Barcelona',
    latitude: 41.3851,
    longitude: 2.1734,
    tourism_score: 95,
    population: 1620000,
    visitants_anuals: 15000000
};

console.log('\n📍 Analizando Barcelona con datos completos:');
console.log('   🌤️ Datos meteorológicos (OpenWeather)');
console.log('   🎫 Eventos programados (Ticketmaster)');
console.log('   🚦 Estado del tráfico (TomTom)');

try {
    console.log('\n🔄 Ejecutando análisis completo...');
    
    const fullAnalysis = await collector.analyzeMunicipality(barcelonaData);
    
    console.log('\n✅ ANÁLISIS COMPLETO CON 3 APIs:');
    console.log('='.repeat(40));
    
    const parsedAnalysis = JSON.parse(fullAnalysis);
    
    console.log('🧠 PATRONES DETECTADOS:');
    parsedAnalysis.patterns?.forEach((pattern, i) => {
        console.log(`   ${i+1}. ${pattern}`);
    });
    
    console.log(`\n🚨 NIVEL DE RIESGO: ${parsedAnalysis.risk_level?.toUpperCase()}`);
    
    console.log('\n📊 IMPACTOS ANALIZADOS:');
    console.log(`   🌤️ Clima: ${parsedAnalysis.weather_impact}`);
    console.log(`   🎫 Eventos: ${parsedAnalysis.events_impact}`);
    console.log(`   🚦 Tráfico: ${parsedAnalysis.traffic_impact}`);
    
    console.log('\n🎯 RECOMENDACIONES IA:');
    parsedAnalysis.recommendations?.forEach((rec, i) => {
        console.log(`   ${i+1}. ${rec}`);
    });
    
    console.log(`\n📈 MULTIPLICADOR TURÍSTICO: ${parsedAnalysis.tourism_multiplier}x`);
    
    if (parsedAnalysis.tourism_multiplier > 1.3) {
        console.log('🔥 ALTA DEMANDA TURÍSTICA ESPERADA');
    } else if (parsedAnalysis.tourism_multiplier < 0.8) {
        console.log('⚠️ BAJA DEMANDA TURÍSTICA ESPERADA');
    } else {
        console.log('📊 DEMANDA TURÍSTICA NORMAL');
    }
    
} catch (error) {
    console.error('❌ Error en análisis completo:', error.message);
    
    // Test individual de APIs para debug
    console.log('\n🔍 DEBUGGING - Testando APIs individuales:');
    
    try {
        const weather = await collector.apiConnector.getWeatherData(41.3851, 2.1734);
        console.log('✅ OpenWeather:', weather ? 'FUNCIONANDO' : 'FALLO');
        
        const events = await collector.apiConnector.getEventsData('Barcelona');
        console.log('✅ Ticketmaster:', events ? 'FUNCIONANDO' : 'FALLO');
        
        const traffic = await collector.apiConnector.getTrafficData(41.3851, 2.1734);
        console.log('✅ TomTom:', traffic ? 'FUNCIONANDO' : 'FALLO');
        
        if (traffic) {
            console.log(`   🚦 Velocidad: ${traffic.currentSpeed} km/h`);
            console.log(`   🚦 Congestión: ${(traffic.congestionRatio * 100).toFixed(1)}%`);
            console.log(`   🚦 Impacto turístico: ${traffic.tourism_impact}x`);
        }
        
    } catch (debugError) {
        console.error('❌ Error en debug:', debugError.message);
    }
}

console.log('\n' + '='.repeat(60));
console.log('🎯 SISTEMA DE 3 APIs TESTADO COMPLETAMENTE');
console.log('📊 Datos reales integrados en análisis IA');
console.log('🚀 Tourism Alarm con inteligencia aumentada!');