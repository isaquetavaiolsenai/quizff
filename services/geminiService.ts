import { StoryNode, DifficultyLevel, GameMode } from "../types.ts";

const DEFAULT_TOPICS = [
  "Free Fire: Personagens e Habilidades",
  "Free Fire: Mapas e Estratégias",
  "Free Fire: Atributos de Armas",
  "Free Fire: Lore e Curiosidades"
];

export const generateGameQuestion = async (
  roundNumber: number, 
  difficulty: DifficultyLevel = 'Médio',
  gameMode: GameMode = 'Quiz',
  customTopic: string | null = null
): Promise<{ node: StoryNode, imageUrl: string }> => {
  // Access the API key from the environment
  const apiKey = process.env.API_KEY || "";
  
  const isCustom = !!customTopic && customTopic.trim().length > 0;
  const activeTopic = isCustom ? customTopic.trim() : DEFAULT_TOPICS[Math.floor(Math.random() * DEFAULT_TOPICS.length)];
  const isTF = gameMode === 'TrueFalse';

  const systemInstruction = `Você é um motor de jogo de Quiz inteligente e rápido. 
    ${isCustom ? `O tema atual é: "${activeTopic}".` : `O tema é Free Fire. Use termos técnicos do jogo.`}
    REGRAS:
    - Nível de dificuldade: ${difficulty}.
    - Se modo Verdadeiro/Falso, escolhas devem ser ["VERDADEIRO", "FALSO"].
    - Responda OBRIGATORIAMENTE em JSON puro no formato:
    { "text": "pergunta", "choices": ["opção1", "opção2", ...], "correctAnswerIndex": 0 }
  `;

  try {
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": window.location.origin,
        "X-Title": "Quiz Squad Battle"
      },
      body: JSON.stringify({
        model: "z-ai/glm-4.5-air:free",
        messages: [
          { role: "system", content: systemInstruction },
          { role: "user", content: `Gere uma pergunta de ${isTF ? 'Verdadeiro ou Falso' : 'múltipla escolha'} sobre: ${activeTopic}.` }
        ],
        response_format: { type: "json_object" }
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error?.message || `Status HTTP: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    
    if (!content) throw new Error("A IA retornou um conteúdo vazio.");
    
    const questionNode = JSON.parse(content);
    
    if (isTF) questionNode.choices = ["VERDADEIRO", "FALSO"];

    return { node: questionNode, imageUrl: '' };

  } catch (err: any) {
    console.error("OpenRouter API Error:", err);
    return {
      node: {
        text: `Erro de conexão com OpenRouter: ${err.message}. Certifique-se de que a chave API está configurada corretamente.`,
        choices: ["TENTAR NOVAMENTE", "CANCELAR"],
        correctAnswerIndex: 0
      },
      imageUrl: ''
    };
  }
};