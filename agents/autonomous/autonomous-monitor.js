import { Ollama } from '@langchain/community/llms/ollama';

export class AutonomousMonitor {
  constructor(config = {}) {
    this.ollamaUrl = config.ollamaUrl || 'http://localhost:11434';
    this.modelName = config.modelName || 'mistral';
    this.recentIssues = [];
    
    // NUEVAS PROPIEDADES
    this.requests = [];
    this.errorPatterns = new Map();
    this.endpointStats = new Map();
    this.criticalErrors = [];
    this.lastAnalysis = null;

    // Inicializar LLM
    this.llm = new Ollama({
      baseUrl: this.ollamaUrl,
      model: this.modelName,
    });
  }

  async startMonitoring() {
    console.log('🚀 [AutonomousMonitor] Iniciando monitoreo autónomo...');
    
    // Health check cada 30 segundos
    setInterval(() => this.performHealthCheck(), 30000);
    
    // Análisis profundo cada 5 minutos
    setInterval(() => this.performDeepAnalysis(), 300000);
    
    // Aprendizaje cada hora
    setInterval(() => this.learnFromPatterns(), 3600000);
  }

  async performHealthCheck() {
    const health = {
      timestamp: new Date(),
      memory: process.memoryUsage(),
      uptime: process.uptime(),
      errors: this.recentIssues.length,
    };
    
    console.log(`❤️ [HealthCheck] Memoria: ${Math.round(health.memory.heapUsed / 1024 / 1024)}MB, Errores recientes: ${health.errors}`);
    
    if (health.memory.heapUsed > 500 * 1024 * 1024) {
      this.recordIssue({
        type: 'high_memory',
        memory: health.memory,
        severity: 'warning'
      });
    }
  }

  recordIssue(issue) {
    console.log(`🚨 [AutonomousMonitor] Problema registrado: ${issue.type}`);
    
    this.recentIssues.push({
      ...issue,
      timestamp: new Date(),
      id: Date.now()
    });
    
    // Mantener solo últimos 100 issues
    if (this.recentIssues.length > 100) {
      this.recentIssues.shift();
    }
    
    // Si es crítico, análisis inmediato
    if (issue.severity === 'critical') {
      this.performDeepAnalysis();
    }
  }

  // NUEVO MÉTODO: Registrar requests
  recordRequest(requestData) {
    this.requests.push(requestData);
    if (this.requests.length > 1000) this.requests.shift();
    
    const stats = this.endpointStats.get(requestData.path) || {
      totalRequests: 0,
      totalErrors: 0,
      avgResponseTime: 0
    };
    
    stats.totalRequests++;
    stats.avgResponseTime = (
      (stats.avgResponseTime * (stats.totalRequests - 1) + requestData.responseTime) 
      / stats.totalRequests
    );
    
    if (requestData.statusCode >= 400) stats.totalErrors++;
    
    this.endpointStats.set(requestData.path, stats);
  }

  async performDeepAnalysis() {
    console.log('🧠 [AutonomousMonitor] Análisis profundo con datos REALES...');
    
    if (this.recentIssues.length === 0) {
      console.log('✅ Sin errores recientes');
      return;
    }
    
    const errorCategories = {};
    this.recentIssues.forEach(issue => {
      const category = this.detectErrorCategory(issue);
      errorCategories[category] = (errorCategories[category] || 0) + 1;
    });
    
    const prompt = `
    Errores de Tourism Alarm Catalunya API:
    Total: ${this.recentIssues.length}
    Categorías: ${JSON.stringify(errorCategories)}
    
    Últimos 3 errores:
    ${JSON.stringify(this.recentIssues.slice(-3), null, 2)}
    
    Proporciona:
    1. Causa raíz probable
    2. Solución inmediata
    3. Prevención futura
    `;
    
    try {
      const analysis = await this.llm.invoke(prompt);
      console.log('\n🤖 Análisis IA:', analysis);
      this.lastAnalysis = analysis;
    } catch (error) {
      console.error('Error en análisis:', error);
    }
  }

  detectErrorCategory(issue) {
    const error = issue.error?.toLowerCase() || '';
    
    if (error.includes('timeout')) return 'TIMEOUT';
    if (error.includes('econnrefused')) return 'CONNECTION';
    if (error.includes('404')) return 'NOT_FOUND';
    if (error.includes('idescat')) return 'EXTERNAL_API';
    if (error.includes('rate limit')) return 'RATE_LIMIT';
    
    return 'OTHER';
  }

  async learnFromPatterns() {
    console.log('📚 [AutonomousMonitor] Aprendiendo de patrones...');
    
    const patterns = this.analyzePatterns();
    
    if (patterns.length > 0) {
      const prompt = `
      Basándote en estos patrones de errores, sugiere mejoras:
      ${JSON.stringify(patterns)}
      `;
      
      try {
        const suggestions = await this.llm.invoke(prompt);
        console.log('💡 Sugerencias de mejora:', suggestions);
      } catch (error) {
        console.error('Error en aprendizaje:', error);
      }
    }
  }

  analyzePatterns() {
    const patterns = [];
    
    // Buscar endpoints más problemáticos
    this.endpointStats.forEach((stats, endpoint) => {
      if (stats.totalErrors > 5) {
        patterns.push({
          type: 'problematic_endpoint',
          endpoint,
          errorRate: (stats.totalErrors / stats.totalRequests * 100).toFixed(2) + '%'
        });
      }
    });
    
    return patterns;
  }

  getStatus() {
    return {
      monitoring: true,
      uptime: process.uptime(),
      recentIssues: this.recentIssues.length,
      totalRequests: this.requests.length,
      endpointStats: Array.from(this.endpointStats.entries()),
      lastAnalysis: this.lastAnalysis
    };
  }

  stopMonitoring() {
    console.log('🛑 [AutonomousMonitor] Deteniendo monitoreo...');
    clearInterval(this.healthCheckInterval);
    clearInterval(this.deepAnalysisInterval);
    clearInterval(this.learningInterval);
  }
}