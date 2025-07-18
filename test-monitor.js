import AutonomousMonitor from "./agents/autonomous/autonomous-monitor.js";

// Configuración del monitor
const monitor = new AutonomousMonitor({
  ollamaUrl: "http://127.0.0.1:11435",
  modelName: "codellama:7b",
  // chromaUrl ya no se usa porque escribimos en memoria
});

// Arrancamos el monitoreo
monitor.startMonitoring();
console.log("🚀 Monitor autónomo iniciado. Observa la consola para logs cada 30s, 5min y 1h.");

// —— Simulación automática de un error y análisis inmediato ——
setTimeout(async () => {
  console.log("[Prueba] Registrando error de prueba...");
  await monitor.recordIssue("Error de prueba de integración");
  console.log("[Prueba] Ejecutando análisis profundo manual...");
  await monitor.performDeepAnalysis();
}, 2000);
