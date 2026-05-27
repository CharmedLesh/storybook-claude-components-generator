export const AVAILABLE_MODELS = [
  {
    id: 'claude-opus-4-7',
    label: 'Opus 4.7',
    description: 'Highest quality. Best for complex components.',
  },
  {
    id: 'claude-sonnet-4-6',
    label: 'Sonnet 4.6',
    description: 'Balanced speed and quality. Good default.',
  },
  {
    id: 'claude-haiku-4-5',
    label: 'Haiku 4.5',
    description: 'Fastest and cheapest. Good for small tweaks.',
  },
] as const;

export type ModelId = (typeof AVAILABLE_MODELS)[number]['id'];

export const DEFAULT_MODEL: ModelId = 'claude-sonnet-4-6';
