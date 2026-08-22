import type { I18nSchema } from './index';

export function buildLayoutLabels(t: I18nSchema) {
	return {
		switchLanguage: t.common.switch_language,
		changeTheme: t.common.change_theme,
		login: t.common.login,
		register: t.common.register,
		logout: t.common.logout,
		profile: t.common.profile,
		loading: t.common.loading,
		home: t.common.nav_home,
		openNavigation: t.common.open_navigation,
		closeNavigation: t.common.close_navigation,
		navigation: t.common.navigation,
		navOverview: t.common.nav_overview,
		navMy: t.common.nav_my,
		navOrgs: t.common.nav_orgs,
		navDrops: t.common.nav_drops,
		navPayouts: t.common.nav_payouts,
		navMembers: t.common.nav_members,
		navItems: t.common.nav_items,
		userStatus: t.common.user_status,
		guest: t.common.guest,
		themeLight: t.common.mode_light,
		themeDark: t.common.mode_dark,
		themeSystem: t.common.mode_system,
	};
}
