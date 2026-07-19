/** Browser-safe assistant metadata — no API keys. */

export type PublicAssistant = {
  id: 'personaai-guide' | 'serp' | 'texniki' | 'satis';
  name: string;
  description: string;
  image: string;
  supportsTaskMode: boolean;
};

export const PUBLIC_ASSISTANTS: PublicAssistant[] = [
  {
    id: 'personaai-guide',
    name: process.env.NEXT_PUBLIC_ASSISTANT_NAME?.trim() || 'PersonaAI Guide',
    description:
      process.env.NEXT_PUBLIC_ASSISTANT_DESCRIPTION?.trim() || 'PersonaAI söhbət köməkçisi',
    image: '/assistants/assistant-purple.png',
    supportsTaskMode: true,
  },
  {
    id: 'serp',
    name: 'SERP dəstək',
    description: 'SERP sualları',
    image: '/assistants/assistant-green.png',
    supportsTaskMode: false,
  },
  {
    id: 'texniki',
    name: 'Texniki Kömək',
    description: 'Texniki dəstək',
    image: '/assistants/assistant-pink.png',
    supportsTaskMode: false,
  },
  {
    id: 'satis',
    name: 'Satış',
    description: 'Məhsul məlumatı',
    image: '/assistants/assistant-orange.png',
    supportsTaskMode: false,
  },
];

export const WIDGET_DEFAULTS = {
  assistantId: 'personaai-guide' as const,
  title: process.env.NEXT_PUBLIC_WIDGET_TITLE?.trim() || 'PersonaAI',
  subtitle: process.env.NEXT_PUBLIC_WIDGET_SUBTITLE?.trim() || 'Ask us anything',
  greeting: process.env.NEXT_PUBLIC_WIDGET_GREETING?.trim() || 'Hi! How can I help?',
  primaryColor: process.env.NEXT_PUBLIC_WIDGET_PRIMARY_COLOR?.trim() || '#4F46E5',
  accentColor: process.env.NEXT_PUBLIC_WIDGET_ACCENT_COLOR?.trim() || '#10B981',
  position: (process.env.NEXT_PUBLIC_WIDGET_POSITION?.trim() || 'bottom-right') as
    | 'bottom-right'
    | 'bottom-left',
  language: (process.env.NEXT_PUBLIC_WIDGET_LANGUAGE?.trim() || 'auto') as
    | 'auto'
    | 'az'
    | 'en'
    | 'ru',
};
