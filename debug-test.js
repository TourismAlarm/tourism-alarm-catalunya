import { APIDebuggerAgent } from './agents/debugger.js';
import { askMistral }        from './tools/ai-helper.js';

(async () => {
  const debuggerAgent = new APIDebuggerAgent();

  // Ejemplo de debug con CodeLlama
  const apiCode = `
async function fetchData() {
  const response = await fetch(url);
  return response.data;
}`;
  const errorMsg = "TypeError: Cannot read property 'data' of undefined";
  const expected = "Objeto JSON con campo 'data'";

  const fix = await debuggerAgent.debugAPICall(apiCode, errorMsg, expected);
  console.log('🔧 CodeLlama fix:\n', fix);

  // Ejemplo de consulta general con Mistral
  const advice = await askMistral(
    "¿Cómo estructuro correctamente una llamada GET a una API REST con fetch en JS?"
  );
  console.log('💡 Mistral advice:\n', advice);
})();
