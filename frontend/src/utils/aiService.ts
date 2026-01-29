// Service AI pour les réponses rapides avec Emergent LLM Key
import Constants from 'expo-constants';

const API_URL = Constants.expoConfig?.extra?.EXPO_PUBLIC_BACKEND_URL ||
                process.env.EXPO_PUBLIC_BACKEND_URL ||
                '';

export interface QuickReply {
  id: string;
  text: string;
  tone: 'formal' | 'friendly' | 'brief';
}

export interface AIReplyContext {
  channelType: string;
  lastMessages: string[];
  senderRole: string;
}

// Generate AI quick reply suggestions
export const generateQuickReplies = async (context: AIReplyContext): Promise<QuickReply[]> => {
  try {
    const response = await fetch(`${API_URL}/api/ai/quick-replies`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(context),
    });

    if (!response.ok) {
      throw new Error('Failed to generate replies');
    }

    const data = await response.json();
    return data.replies || [];
  } catch (error) {
    console.error('AI reply generation error:', error);
    // Return fallback suggestions
    return getFallbackReplies(context);
  }
};

// Fallback replies when AI is unavailable
const getFallbackReplies = (context: AIReplyContext): QuickReply[] => {
  const { channelType, lastMessages } = context;
  const lastMessage = lastMessages[lastMessages.length - 1]?.toLowerCase() || '';

  // Context-aware fallbacks
  if (lastMessage.includes('rdv') || lastMessage.includes('rendez-vous') || lastMessage.includes('confirmé')) {
    return [
      { id: 'f1', text: 'Parfait, merci pour la confirmation !', tone: 'friendly' },
      { id: 'f2', text: 'Bien noté, j\'y serai.', tone: 'brief' },
      { id: 'f3', text: 'Excellent, je confirme ma présence.', tone: 'formal' },
    ];
  }

  if (lastMessage.includes('question') || lastMessage.includes('?')) {
    return [
      { id: 'f1', text: 'Je te réponds dès que possible.', tone: 'friendly' },
      { id: 'f2', text: 'Bonne question, laisse-moi vérifier.', tone: 'friendly' },
      { id: 'f3', text: 'Je reviens vers vous rapidement.', tone: 'formal' },
    ];
  }

  // Channel-specific defaults
  if (channelType === 'medical') {
    return [
      { id: 'f1', text: 'Merci, je serai là.', tone: 'brief' },
      { id: 'f2', text: 'Bien noté, à demain.', tone: 'friendly' },
      { id: 'f3', text: 'Parfait, merci pour l\'info.', tone: 'friendly' },
    ];
  }

  if (channelType === 'technical' || channelType === 'training') {
    return [
      { id: 'f1', text: 'Super, on fait comme ça !', tone: 'friendly' },
      { id: 'f2', text: 'Merci Coach 💪', tone: 'friendly' },
      { id: 'f3', text: 'Bien reçu, prêt pour la session.', tone: 'formal' },
    ];
  }

  if (channelType === 'agent') {
    return [
      { id: 'f1', text: 'Merci pour le suivi !', tone: 'friendly' },
      { id: 'f2', text: 'Parfait, on en reparle.', tone: 'friendly' },
      { id: 'f3', text: 'Bien noté, merci.', tone: 'brief' },
    ];
  }

  // Generic fallbacks
  return [
    { id: 'f1', text: 'Merci !', tone: 'brief' },
    { id: 'f2', text: 'Parfait, merci pour l\'info.', tone: 'friendly' },
    { id: 'f3', text: 'Bien reçu, je reviens vers vous.', tone: 'formal' },
  ];
};

export default {
  generateQuickReplies,
};
