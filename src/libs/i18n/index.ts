import { en } from './context/en';
import { ja } from './context/ja';
import { zh_tw } from './context/zh-tw';
import { langKeys, type LangKey } from './context/langKeys';

export type I18nSchema = typeof en;

const translations: Record<LangKey, I18nSchema> = {
	'zh-tw': zh_tw,
	ja,
	en,
};

export const defaultLang: LangKey = 'zh-tw';

export function getI18n(lang: string) {
	return translations[lang as LangKey] || translations[defaultLang];
}

export function getLangFromUrl(url: URL): LangKey {
	const [, lang] = url.pathname.split('/');

	if ((langKeys as readonly string[]).includes(lang)) {
		return lang as LangKey;
	}

	return defaultLang;
}
