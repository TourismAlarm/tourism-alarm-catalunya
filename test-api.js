import handler from './api/municipalities.js';

const req = { query: { limit: '947' } };
const res = {
  json: (data) => {
    console.log('Total municipios:', data.data.length);
    console.log('Primeros 5:');
    data.data.slice(0, 5).forEach(m => {
      console.log('  ' + m.name + ': lat=' + m.lat + ', lng=' + m.lng + ', comarca=' + m.comarca);
    });
    console.log('Últimos 5:');
    data.data.slice(-5).forEach(m => {
      console.log('  ' + m.name + ': lat=' + m.lat + ', lng=' + m.lng + ', comarca=' + m.comarca);
    });
    
    // Distribución por comarcas
    const porComarcas = {};
    data.data.forEach(m => {
      if (\!porComarcas[m.comarca]) porComarcas[m.comarca] = 0;
      porComarcas[m.comarca]++;
    });
    
    console.log('\nDistribución por comarca:');
    Object.entries(porComarcas).sort((a, b) => b[1] - a[1]).slice(0, 15).forEach(([comarca, count]) => {
      console.log('  ' + comarca + ': ' + count + ' municipios');
    });
    
    console.log('\nTotal comarcas diferentes: ' + Object.keys(porComarcas).length);
    
    // Análisis de coordenadas
    const lats = data.data.map(m => m.lat).filter(lat => lat);
    const lngs = data.data.map(m => m.lng).filter(lng => lng);
    
    console.log('\nRango coordenadas:');
    console.log('  Latitud: ' + Math.min(...lats).toFixed(4) + ' - ' + Math.max(...lats).toFixed(4));
    console.log('  Longitud: ' + Math.min(...lngs).toFixed(4) + ' - ' + Math.max(...lngs).toFixed(4));
  }
};

await handler(req, res);
EOF < /dev/null
