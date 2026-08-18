export const langKeys = ['zh-tw', 'ja', 'en'] as const;

export type LangKey = (typeof langKeys)[number];
