// Script para testear la nueva API directamente
import handler from './api/municipalities.js';

// Mock del objeto request y response
const mockReq = {
  query: {
    limit: 947,
    offset: 0,
    region: 'catalunya'
  }
};

const mockRes = {
  status: function(code) {
    this.statusCode = code;
    return this;
  },
  json: function(data) {
    console.log(`\n🔍 RESULTADO DEL TEST:`);
    console.log(`Status: ${this.statusCode}`);
    console.log(`Total municipios: ${data.pagination?.total || 'N/A'}`);
    console.log(`Municipios devueltos: ${data.data?.length || 'N/A'}`);
    console.log(`Arquitectura: ${data.metadata?.architecture || 'N/A'}`);
    
    if (data.data && data.data.length > 0) {
      console.log(`\n📍 Primeros 3 municipios:`);
      data.data.slice(0, 3).forEach(m => {
        console.log(`  ${m.id}: ${m.name} [${m.latitude}, ${m.longitude}] - Score: ${m.tourism_score}`);
      });
    }
    
    if (data.success) {
      console.log(`\n✅ TEST EXITOSO - La refactorización funciona correctamente!`);
      console.log(`🎯 OBJETIVO CUMPLIDO: ${data.pagination.total} municipios generados`);
    } else {
      console.log(`\n❌ TEST FALLIDO:`, data.error);
    }
  }
};

console.log('🧪 Iniciando test de la nueva arquitectura...');

// Ejecutar el handler
handler(mockReq, mockRes).catch(error => {
  console.error('❌ Error en el test:', error);
});