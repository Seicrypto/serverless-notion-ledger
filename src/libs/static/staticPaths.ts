import { langKeys } from '../i18n/context/langKeys';

export function getStaticPaths() {
	return langKeys.map((lang) => ({ params: { lang } }));
}
