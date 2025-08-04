import { TourismCollectorAgent } from './agents/collectors/tourism_collector.js';

console.log('🧪 TEST - HEATMAP PREDICCIONES TEMPORALES\n');
console.log('='.repeat(60));

const collector = new TourismCollectorAgent();

const barcelonaData = {
    name: 'Barcelona',
    latitude: 41.3851,
    longitude: 2.1734,
    tourism_score: 95,
    population: 1620000,
    visitants_anuals: 15000000
};

async function testTimeWindow(window, hours) {
    console.log(`\n🕐 TESTEANDO: ${hours} (${window}h)`);
    console.log('-'.repeat(40));
    
    const testData = {
        ...barcelonaData,
        prediction_window: window
    };
    
    try {
        const analysis = await collector.analyzeMunicipality(testData);
        const parsed = JSON.parse(analysis);
        
        console.log(`📊 Multiplicador turístico: ${parsed.tourism_multiplier}x`);
        console.log(`🚨 Nivel de riesgo: ${parsed.risk_level}`);
        console.log(`⏰ Ventana temporal: ${parsed.prediction_timeframe || 'No especificada'}`);
        
        if (parsed.patterns && parsed.patterns.length > 0) {
            console.log(`🧠 Patrón detectado: ${parsed.patterns[0]}`);
        }
        
        return parsed.tourism_multiplier;
        
    } catch (error) {
        console.error(`❌ Error: ${error.message}`);
        return null;
    }
}

console.log('🎯 Comparando multiplicadores según ventana temporal...\n');

try {
    const multiplier24h = await testTimeWindow('24', '24 horas');
    await new Promise(resolve => setTimeout(resolve, 3000)); // Pausa
    
    const multiplier48h = await testTimeWindow('48', '48 horas');  
    await new Promise(resolve => setTimeout(resolve, 3000)); // Pausa
    
    const multiplier168h = await testTimeWindow('168', '1 semana');
    
    console.log('\n' + '='.repeat(60));
    console.log('📈 RESUMEN DE MULTIPLICADORES:');
    console.log(`   ⚡ 24h: ${multiplier24h}x`);
    console.log(`   🔮 48h: ${multiplier48h}x`);
    console.log(`   📅 1 semana: ${multiplier168h}x`);
    
    if (multiplier24h && multiplier48h && multiplier168h) {
        console.log('\n🎯 ANÁLISIS:');
        if (multiplier24h !== multiplier48h || multiplier48h !== multiplier168h) {
            console.log('✅ Los multiplicadores CAMBIAN según ventana temporal');
            console.log('✅ El heatmap DEBERÍA cambiar al seleccionar diferentes períodos');
        } else {
            console.log('⚠️ Los multiplicadores son IGUALES - El heatmap NO cambiará');
        }
    }
    
} catch (error) {
    console.error('❌ Error en test:', error.message);
}

console.log('\n🚀 Test completado - Ahora prueba cambiar el selector en la UI');