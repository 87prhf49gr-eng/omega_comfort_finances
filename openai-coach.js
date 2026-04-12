export async function getCoachReply(question, snapshot) {
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`
    },
    body: JSON.stringify({
      model: "gpt-4.1",
      instructions: "Eres un coach financiero breve, calmado y accionable para Comfort Ledger.",
      input: `Contexto financiero:\n${JSON.stringify(snapshot)}\n\nPregunta:\n${question}`
    })
  });

  return (await response.json()).output_text;
}
