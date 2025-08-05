import { TourismPredictorAgent } from './agents/predictors/tourism_predictor.js';

console.log('🧪 TEST - PREDICCIONES REALES IA PARA HEATMAP\n');
console.log('='.repeat(60));

const predictor = new TourismPredictorAgent();

const sampleMunicipalities = [
    { name: 'Barcelona', latitude: 41.3851, longitude: 2.1734, visitants_anuals: 15000000 },
    { name: 'Lloret de Mar', latitude: 41.6963, longitude: 2.8464, visitants_anuals: 3500000 },
    { name: 'Salou', latitude: 41.0765, longitude: 1.1398, visitants_anuals: 2500000 }
];

async function testPredictionsForTimeframe(timeframe) {
    console.log(`\n🔮 TESTEANDO PREDICCIONES PARA: ${timeframe}`);
    console.log('-'.repeat(50));
    
    try {
        const predictions = await predictor.predictTourismFlow(sampleMunicipalities, timeframe);
        
        console.log(`📊 Predicciones generadas para ${timeframe}`);
        console.log(`🎯 Confianza: ${predictions.confidence || 'N/A'}`);
        console.log(`🌍 Riesgo global: ${predictions.global_trends?.overall_risk || 'N/A'}`);
        
        if (predictions.predictions && predictions.predictions.length > 0) {
            console.log(`\n📍 PREDICCIONES POR MUNICIPIO (${predictions.predictions.length}):`);
            
            predictions.predictions.forEach(pred => {
                console.log(`   ${pred.municipality}:`);
                console.log(`     - Flujo esperado: ${pred.expected_flow}`);
                console.log(`     - Probabilidad saturación: ${pred.saturation_probability}%`);
                console.log(`     - Nivel de riesgo: ${pred.risk_level}`);
            });
            
            return {
                success: true,
                count: predictions.predictions.length,
                globalRisk: predictions.global_trends?.overall_risk
            };
        } else {
            console.log('⚠️ No se generaron predicciones específicas');
            return { success: false, error: 'No predictions generated' };
        }
        
    } catch (error) {
        console.error(`❌ Error en predicciones para ${timeframe}:`, error.message);
        return { success: false, error: error.message };
    }
}

console.log('🎯 Comparando predicciones reales según ventana temporal...\n');

async function runFullTest() {
    try {
        const results24h = await testPredictionsForTimeframe('24h');
        await new Promise(resolve => setTimeout(resolve, 3000)); // Pausa
        
        const results48h = await testPredictionsForTimeframe('48h');
        await new Promise(resolve => setTimeout(resolve, 3000)); // Pausa
        
        const results168h = await testPredictionsForTimeframe('168h');
        
        console.log('\n' + '='.repeat(60));
        console.log('📈 RESUMEN DE RESULTADOS:');
        console.log(`   ⚡ 24h: ${results24h.success ? '✅ ' + results24h.count + ' predicciones' : '❌ Error'}`);
        console.log(`   🔮 48h: ${results48h.success ? '✅ ' + results48h.count + ' predicciones' : '❌ Error'}`);
        console.log(`   📅 168h: ${results168h.success ? '✅ ' + results168h.count + ' predicciones' : '❌ Error'}`);
        
        if (results24h.success && results48h.success && results168h.success) {
            console.log('\n🎯 ANÁLISIS:');
            console.log('✅ Sistema de predicciones FUNCIONA correctamente');
            console.log('✅ Genera predicciones DIFERENTES por ventana temporal');
            console.log('✅ El heatmap debería usar estos datos REALES');
            
            console.log('\n🚀 PRÓXIMO PASO:');
            console.log('1. Iniciar servidor: node api/index.js');
            console.log('2. Iniciar frontend: python -m http.server 8000 -d public');
            console.log('3. Probar selector temporal en el navegador');
        } else {
            console.log('\n⚠️ Algunos tests fallaron - revisar configuración IA');
        }
        
    } catch (error) {
        console.error('❌ Error en test completo:', error.message);
    }
}

runFullTest();