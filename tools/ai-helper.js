// tools/ai-helper.js
// Usa Mistral para consultas generales
export async function askMistral(question, {
  baseUrl = 'http://127.0.0.1:11435',
  model   = 'mistral'
} = {}) {
  const res = await fetch(`${baseUrl}/api/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model, prompt: question, stream: false })
  });
  const data = await res.json();
  return data.response;
}
