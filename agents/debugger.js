import { Ollama } from '@langchain/community/llms/ollama';

export class APIDebuggerAgent {
  constructor({
    model = 'codellama:7b',
    baseUrl = 'http://127.0.0.1:11435'
  } = {}) {
    this.model = new Ollama({ baseUrl, model, temperature: 0.1 });
  }

  async debugAPICall(apiCode, errorMessage, expectedResult) {
    const prompt = `
Soy un experto en APIs y debugging. Analiza este problema:

CÓDIGO ACTUAL:
${apiCode}

ERROR RECIBIDO:
${errorMessage}

RESULTADO ESPERADO:
${expectedResult}

Por favor:
1. Identifica el problema
2. Explica por qué falla
3. Dame el código corregido
4. Sugiere mejoras adicionales
`;
    return await this.model.call(prompt);
  }
}
