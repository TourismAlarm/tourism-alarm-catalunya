import { TourismCollectorAgent } from './agents/collectors/tourism_collector.js';
import { TourismPredictorAgent } from './agents/predictors/tourism_predictor.js';

console.log('🧪 Testeando agentes IA con APIs externas...\n');

// Test del collector enriquecido
console.log('📊 Test 1: Collector con datos meteorológicos y eventos');
const collector = new TourismCollectorAgent();

const testMunicipalityData = {
    name: 'Barcelona',
    latitude: 41.3851,
    longitude: 2.1734,
    tourism_score: 95,
    population: 1620000,
    visitants_anuals: 15000000
};

try {
    console.log('🔍 Analizando Barcelona con datos externos...');
    const enrichedAnalysis = await collector.analyzeMunicipality(testMunicipalityData);
    console.log('✅ Análisis enriquecido completado:');
    console.log(JSON.stringify(JSON.parse(enrichedAnalysis), null, 2));
} catch (error) {
    console.error('❌ Error en análisis enriquecido:', error.message);
}

console.log('\n' + '='.repeat(60) + '\n');

// Test del predictor con datos externos
console.log('🔮 Test 2: Predictor con datos meteorológicos');
const predictor = new TourismPredictorAgent();

const mockHistoricalData = [
    { municipality: 'Barcelona', timestamp: new Date(), tourists: 50000 },
    { municipality: 'Girona', timestamp: new Date(), tourists: 15000 },
    { municipality: 'Tarragona', timestamp: new Date(), tourists: 20000 }
];

try {
    console.log('🌤️ Generando predicción con datos meteorológicos...');
    const weatherPrediction = await predictor.predictTourismFlow(mockHistoricalData, '24h');
    console.log('✅ Predicción con clima completada:');
    console.log(JSON.stringify(weatherPrediction, null, 2));
} catch (error) {
    console.error('❌ Error en predicción meteorológica:', error.message);
}

console.log('\n🎯 Tests completados. Los agentes ahora usan datos reales!');