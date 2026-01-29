
import { GoogleGenAI, Type } from "@google/genai";
import { Player, StoryNode } from "../types";

const SYSTEM_PROMPT = `VOCÊ É O MESTRE SUPREMO DO BATTLE ROYALE. 
Sua missão é narrar uma partida competitiva e criar desafios técnicos de elite.
Cada rodada deve conter um QUIZ TÉCNICO sobre táticas de combate, armas (M4A1, AK47, AWM) ou mecânicas de jogo.
O tom deve ser épico, adrenalina pura e focado em Esports.
JSON SCHEMA: { "text": "Descrição cinemática do momento", "choices": ["Opção Tática 1", "Opção Tática 2", "Opção Tática 3"], "correctAnswerIndex": 0-2 }`;

export const generateGameNode = async (players: Player[], history: StoryNode[], lastChoiceIndex?: number): Promise<{ node: StoryNode, imageUrl: string }> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const isInitial = history.length === 0;
  const currentPlayerIndex = history.length % players.length;
  const currentPlayer = players[currentPlayerIndex];

  const prompt = isInitial 
    ? `Squad pronto: ${players.map(p => p.name).join(', ')}. Estão no avião sobrevoando o mapa Bermuda. Comece o salto.`
    : `O jogador anterior escolheu a opção ${lastChoiceIndex}. O resultado foi ${lastChoiceIndex === history[history.length-1].correctAnswerIndex ? 'SUCESSO (BOOYAH!)' : 'FALHA (DANO RECEBIDO)'}. Agora é a vez de ${currentPlayer.name}.`;

  // 1. Text Generation with Thinking (since it's a complex quiz/narrative task)
  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: prompt,
    config: {
      systemInstruction: SYSTEM_PROMPT,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          text: { type: Type.STRING },
          choices: { type: Type.ARRAY, items: { type: Type.STRING } },
          correctAnswerIndex: { type: Type.INTEGER }
        },
        required: ["text", "choices", "correctAnswerIndex"]
      },
      thinkingConfig: { thinkingBudget: 1000 }
    }
  });

  const data = JSON.parse(response.text || '{}');

  // 2. Image Generation
  const imgRes = await ai.models.generateContent({
    model: 'gemini-2.5-flash-image',
    contents: `Battle Royale competitive game scene, professional esports style, dramatic lighting, orange and blue accents: ${data.text}`,
    config: {
      imageConfig: {
        aspectRatio: "16:9"
      }
    }
  });

  let imageUrl = '';
  for (const part of imgRes.candidates[0].content.parts) {
    if (part.inlineData) {
      imageUrl = `data:image/png;base64,${part.inlineData.data}`;
      break;
    }
  }

  return {
    node: {
      ...data,
      currentPlayerId: currentPlayer.id
    },
    imageUrl
  };
};
