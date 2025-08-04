import { API_CONFIG } from './agents/connectors/api_config.js';

console.log('🚦 TESTING TOMTOM API - Traffic Data\n');
console.log('='.repeat(50));

const TOMTOM_API_KEY = API_CONFIG.TOMTOM_API_KEY;
console.log('🔑 API Key:', TOMTOM_API_KEY.substring(0, 8) + '...');

// Test 1: Verificar endpoint básico de TomTom
console.log('\n📍 Test 1: Traffic Flow Data - Barcelona Centro');

const barcelonaPoint = {
    lat: 41.3851,
    lon: 2.1734,
    zoom: 10
};

const tomtomUrl = `https://api.tomtom.com/traffic/services/4/flowSegmentData/absolute/10/json?point=${barcelonaPoint.lat},${barcelonaPoint.lon}&key=${TOMTOM_API_KEY}`;

console.log('🌐 URL de prueba:', tomtomUrl.replace(TOMTOM_API_KEY, 'API_KEY_HIDDEN'));

try {
    console.log('🔄 Llamando a TomTom API...');
    
    const response = await fetch(tomtomUrl);
    console.log('📡 Status:', response.status, response.statusText);
    
    if (!response.ok) {
        console.log('❌ Error HTTP:', response.status);
        const errorText = await response.text();
        console.log('📝 Error details:', errorText);
    } else {
        const data = await response.json();
        console.log('✅ TomTom API funcionando:');
        console.log('📊 Datos recibidos:', JSON.stringify(data, null, 2));
        
        if (data.flowSegmentData) {
            const traffic = data.flowSegmentData;
            console.log('\n🚦 Información de tráfico:');
            console.log(`   🛣️ Velocidad actual: ${traffic.currentSpeed} km/h`);
            console.log(`   ⚡ Velocidad libre: ${traffic.freeFlowSpeed} km/h`);
            console.log(`   📈 Ratio tráfico: ${(traffic.currentSpeed / traffic.freeFlowSpeed * 100).toFixed(1)}%`);
            console.log(`   🚨 Nivel congestión: ${traffic.roadClosure ? 'CERRADA' : 'ABIERTA'}`);
        }
    }
    
} catch (error) {
    console.log('❌ Error de conexión:', error.message);
}

console.log('\n' + '-'.repeat(40));

// Test 2: Endpoint alternativo de TomTom - Traffic Incidents
console.log('\n🚨 Test 2: Traffic Incidents - Barcelona área');

const incidentsUrl = `https://api.tomtom.com/traffic/services/5/incidentDetails?key=${TOMTOM_API_KEY}&bbox=2.0537,41.3200,2.2280,41.4695&fields=incidents%7Btype%2Cgeometry%7Btype%2Ccoordinates%7D%2Cproperties%7Bid%2CiconCategory%2Cmagnitude%2Cdelay%2Croadnumbers%2Cdescription%7D%7D&language=es-ES&categoryFilter=0,1,2,3,4,5,6,7,8,9,10,11,14`;

console.log('🌐 Testing incidents endpoint...');

try {
    const response = await fetch(incidentsUrl);
    console.log('📡 Status:', response.status, response.statusText);
    
    if (!response.ok) {
        console.log('❌ Error HTTP:', response.status);
        const errorText = await response.text();
        console.log('📝 Error details:', errorText.substring(0, 500));
    } else {
        const data = await response.json();
        console.log('✅ TomTom Incidents API funcionando:');
        
        if (data.incidents && data.incidents.length > 0) {
            console.log(`🚨 ${data.incidents.length} incidentes encontrados:`);
            data.incidents.slice(0, 3).forEach((incident, i) => {
                console.log(`   ${i+1}. ${incident.properties.description}`);
                console.log(`      Magnitud: ${incident.properties.magnitude}`);
                console.log(`      Delay: ${incident.properties.delay} segundos`);
            });
        } else {
            console.log('ℹ️ No hay incidentes de tráfico reportados');
        }
    }
    
} catch (error) {
    console.log('❌ Error:', error.message);
}

console.log('\n' + '='.repeat(50));

// Test 3: Verificar límites de API
console.log('\n📊 Test 3: Verificando información de la cuenta');

const accountUrl = `https://api.tomtom.com/traffic/services/4/flowSegmentData/absolute/10/json?point=41.3851,2.1734&key=${TOMTOM_API_KEY}`;

try {
    const response = await fetch(accountUrl, { method: 'HEAD' });
    console.log('📡 Headers de respuesta:');
    
    for (const [key, value] of response.headers.entries()) {
        if (key.toLowerCase().includes('rate') || 
            key.toLowerCase().includes('limit') || 
            key.toLowerCase().includes('quota') ||
            key.toLowerCase().includes('remaining')) {
            console.log(`   ${key}: ${value}`);
        }
    }
    
} catch (error) {
    console.log('⚠️ No se pudieron obtener headers:', error.message);
}

console.log('\n🎯 CONCLUSIÓN:');
if (response && response.ok) {
    console.log('✅ TomTom API está funcionando correctamente');
    console.log('✅ Key válida y con límites disponibles');
} else {
    console.log('❌ TomTom API tiene problemas');
    console.log('💡 Posibles causas:');
    console.log('   - API key inválida o expirada');
    console.log('   - Límites de rate excedidos');
    console.log('   - Endpoint incorrecto');
    console.log('   - Problemas de conectividad');
}