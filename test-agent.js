import { TourismCollectorAgent } from './agents/collectors/tourism_collector.js';

const agent = new TourismCollectorAgent();
const testData = {
    name: 'Barcelona',
    tourism_score: 95,
    population: 1620000
};

const result = await agent.analyzeMunicipality(testData);
console.log('Análisis:', result);