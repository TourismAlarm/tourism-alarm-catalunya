import { Ollama } from '@langchain/community/llms/ollama';
import { ChromaClient } from 'chromadb';

export class TourismCollectorAgent {
    constructor() {
        this.llm = new Ollama({
            baseUrl: 'http://localhost:11434',
            model: 'mistral:7b-instruct'
        });
        this.memory = [];
        console.log('🤖 Agente Recolector iniciado');
    }

    async analyzeMunicipality(municipalityData) {
        const prompt = `Analiza estos datos turísticos y extrae patrones:
        ${JSON.stringify(municipalityData)}
        
        Responde en JSON con: patterns, risk_level, recommendations`;
        
        return await this.llm.call(prompt);
    }

    async collectRealTimeData() {
        try {
            const response = await fetch('/api/municipalities?limit=947');
            const data = await response.json();
            
            for (const municipality of data.data) {
                const analysis = await this.analyzeMunicipality(municipality);
                this.memory.push({
                    timestamp: new Date(),
                    municipality: municipality.name,
                    analysis: JSON.parse(analysis)
                });
            }
            
            console.log(`✅ Analizados ${data.data.length} municipios`);
            return this.memory;
        } catch (error) {
            console.error('Error collecting data:', error);
        }
    }
}