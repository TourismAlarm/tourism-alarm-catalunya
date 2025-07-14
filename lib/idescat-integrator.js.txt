// IDESCAT Integration Library
import axios from 'axios';
import xml2js from 'xml2js';

export class IdescatIntegrator {
  constructor() {
    this.baseUrl = process.env.IDESCAT_BASE_URL || 'https://api.idescat.cat/emex/v1';
    this.rateLimiter = {
      requests: 0,
      resetTime: Date.now() + 60000
    };
  }

  async checkRateLimit() {
    const now = Date.now();
    if (now > this.rateLimiter.resetTime) {
      this.rateLimiter.requests = 0;
      this.rateLimiter.resetTime = now + 60000;
    }

    if (this.rateLimiter.requests >= 80) {
      const waitTime = this.rateLimiter.resetTime - now;
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }

    this.rateLimiter.requests++;
  }

  async makeRequest(endpoint, retries = 3) {
    await this.checkRateLimit();
    
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const response = await axios.get(`${this.baseUrl}${endpoint}`, {
          timeout: 10000,
          headers: {
            'User-Agent': 'Tourism-Alarm-Catalunya/1.0'
          }
        });
        
        return response.data;
      } catch (error) {
        if (attempt === retries) throw error;
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
      }
    }
  }

  async parseXML(xmlData) {
    const parser = new xml2js.Parser({ explicitArray: false });
    return await parser.parseStringPromise(xmlData);
  }

  async getAllMunicipalities() {
    try {
      // Get list of municipalities
      const nodesData = await this.makeRequest('/nodes?tipus=mun&lang=es');
      const parsed = await this.parseXML(nodesData);
      
      const municipalities = [];
      
      if (parsed.fitxes && parsed.fitxes.v) {
        const nodes = Array.isArray(parsed.fitxes.v) ? parsed.fitxes.v : [parsed.fitxes.v];
        
        // Process first 50 municipalities for Vercel function limits
        const limitedNodes = nodes.slice(0, 50);
        
        for (const node of limitedNodes) {
          if (node.$ && node.$.scheme === 'mun') {
            try {
              const municipalityData = await this.getMunicipalityData(node.$.id);
              municipalities.push({
                id: node.$.id,
                name: node._ || node,
                ...municipalityData
              });
            } catch (error) {
              console.error(`Error processing municipality ${node.$.id}:`, error.message);
            }
          }
        }
      }
      
      return municipalities;
    } catch (error) {
      console.error('Error getting municipalities:', error);
      // Return fallback data
      return this.getFallbackMunicipalities();
    }
  }

  async getMunicipality(id) {
    try {
      const data = await this.getMunicipalityData(id);
      return {
        id,
        ...data
      };
    } catch (error) {
      throw new Error(`Municipality ${id} not found: ${error.message}`);
    }
  }

  async getMunicipalityData(id) {
    try {
      const detailData = await this.makeRequest(`/dades/${id}?lang=es`);
      const parsed = await this.parseXML(detailData);
      
      return this.parseMunicipalityData(parsed);
    } catch (error) {
      return this.generateMockData(id);
    }
  }

  parseMunicipalityData(data) {
    const indicators = new Map();
    
    // Extract indicators from XML
    if (data.fitxes && data.fitxes.f) {
      const facts = Array.isArray(data.fitxes.f) ? data.fitx