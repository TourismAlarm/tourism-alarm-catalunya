import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Middleware básico
app.use(express.json());

// Test ruta básica
app.get('/', (req, res) => {
  console.log('🔥 Ruta raíz accedida');
  res.send('<h1>Servidor funcionando!</h1><p>Ve a: <a href="/api/test">/api/test</a></p>');
});

// Test API
app.get('/api/test', (req, res) => {
  console.log('🔥 API test accedida');
  res.json({ 
    success: true, 
    message: 'API funcionando correctamente',
    timestamp: new Date()
  });
});

// Municipios test
app.get('/api/municipalities', (req, res) => {
  console.log('🔥 Municipios solicitados');
  res.json({
    success: true,
    data: [
      { id: '1', name: 'Barcelona', visitants_anuals: 15000000 },
      { id: '2', name: 'Girona', visitants_anuals: 2000000 }
    ],
    message: 'Test municipalities'
  });
});

const PORT = 3000;

app.listen(PORT, () => {
  console.log(`🚀 TEST SERVER RUNNING: http://localhost:${PORT}`);
  console.log(`📍 Test routes:`);
  console.log(`   GET  /`);
  console.log(`   GET  /api/test`);
  console.log(`   GET  /api/municipalities`);
});