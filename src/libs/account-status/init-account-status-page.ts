import { getApiAdapter } from '../api/adapters/api.adapter.ts';
import { getErrorMessage } from '../api/auth/session.ts';

interface AccountStatusState {
	title?: string;
	message?: string;
	side?: string;
	showForm: boolean;
	mode: 'info' | 'verify-email' | 'reset-password';
}

type AccountStatusKey =
	| 'pending_verification'
	| 'EMAIL_VERIFICATION_REQUIRED'
	| 'pending_approval'
	| 'ACCOUNT_PENDING_APPROVAL'
	| 'disabled'
	| 'ACCOUNT_DISABLED'
	| 'active';

function getNamedInput(form: HTMLFormElement, name: string) {
	const field = form.elements.namedItem(name);
	return field instanceof HTMLInputElement ? field : null;
}

function buildUrl(path: string, searchParams?: Record<string, string | undefined>) {
	const nextUrl = new URL(path, window.location.origin);

	if (searchParams) {
		for (const [key, value] of Object.entries(searchParams)) {
			if (typeof value === 'string' && value) {
				nextUrl.searchParams.set(key, value);
			}
		}
	}

	return nextUrl;
}

export function initAccountStatusPage() {
	const page = document.querySelector('[data-account-status-page]');
	const title = document.querySelector('[data-account-status-title]');
	const message = document.querySelector('[data-account-status-message]');
	const sideMessage = document.querySelector('[data-account-status-side-message]');
	const form = document.querySelector('[data-account-status-form]');
	const keyLabel = document.querySelector('[data-key-label]');
	const keyInput = document.querySelector('[data-key-input]');
	const passwordField = document.querySelector('[data-password-field]');
	const submitButton = document.querySelector('[data-submit-button]');
	const resendButton = document.querySelector('[data-resend-button]');
	const loginLink = document.querySelector('[data-login-link]');
	const status = document.querySelector('[data-auth-status]');
	const statusText = document.querySelector('[data-auth-status-text]');

	if (
		!(page instanceof HTMLElement) ||
		!(title instanceof HTMLElement) ||
		!(message instanceof HTMLElement) ||
		!(sideMessage instanceof HTMLElement) ||
		!(form instanceof HTMLFormElement) ||
		!(keyLabel instanceof HTMLElement) ||
		!(keyInput instanceof HTMLInputElement) ||
		!(passwordField instanceof HTMLElement) ||
		!(submitButton instanceof HTMLButtonElement) ||
		!(resendButton instanceof HTMLButtonElement) ||
		!(loginLink instanceof HTMLAnchorElement) ||
		!(status instanceof HTMLElement) ||
		!(statusText instanceof HTMLElement)
	) {
		return;
	}

	const params = new URLSearchParams(window.location.search);
	const rawStatus = params.get('status') || '';
	const rawCode = params.get('code') || '';
	const mode = params.get('mode') || '';
	const email = params.get('email') || '';
	const key = params.get('key') || email;
	const token = params.get('token') || params.get('verifyCode') || '';
	const loginUrl = page.dataset.loginUrl || '/';
	const homeUrl = page.dataset.homeUrl || '/';
	const statusUrl = page.dataset.statusUrl || '/';
	const profileUrl = page.dataset.profileUrl || homeUrl;
	const pendingMessage = page.dataset.pendingMessage || 'Submitting request';
	const errorMessage = page.dataset.errorMessage || 'Request failed.';
	const verifySuccessMessage = page.dataset.verifySuccessMessage || 'Verification completed.';
	const resendSuccessMessage = page.dataset.resendSuccessMessage || 'Verification email sent.';
	const resetSuccessMessage = page.dataset.resetSuccessMessage || 'Password updated.';
	const verifyLabel = page.dataset.verifyLabel || 'Verify';
	const resetLabel = page.dataset.resetLabel || 'Reset password';
	const resendLabel = page.dataset.resendLabel || 'Resend verification';

	const statusMap: Record<AccountStatusKey, AccountStatusState> = {
		pending_verification: {
			title: page.dataset.emailVerificationTitle,
			message: page.dataset.emailVerificationMessage,
			side: page.dataset.emailVerificationMessage,
			showForm: true,
			mode: 'verify-email',
		},
		EMAIL_VERIFICATION_REQUIRED: {
			title: page.dataset.emailVerificationTitle,
			message: page.dataset.emailVerificationMessage,
			side: page.dataset.emailVerificationMessage,
			showForm: true,
			mode: 'verify-email',
		},
		pending_approval: {
			title: page.dataset.pendingApprovalTitle,
			message: page.dataset.pendingApprovalMessage,
			side: page.dataset.pendingApprovalMessage,
			showForm: false,
			mode: 'info',
		},
		ACCOUNT_PENDING_APPROVAL: {
			title: page.dataset.pendingApprovalTitle,
			message: page.dataset.pendingApprovalMessage,
			side: page.dataset.pendingApprovalMessage,
			showForm: false,
			mode: 'info',
		},
		disabled: {
			title: page.dataset.disabledTitle,
			message: page.dataset.disabledMessage,
			side: page.dataset.disabledMessage,
			showForm: false,
			mode: 'info',
		},
		ACCOUNT_DISABLED: {
			title: page.dataset.disabledTitle,
			message: page.dataset.disabledMessage,
			side: page.dataset.disabledMessage,
			showForm: false,
			mode: 'info',
		},
		active: {
			title: page.dataset.activeTitle,
			message: page.dataset.activeMessage,
			side: page.dataset.activeMessage,
			showForm: false,
			mode: 'info',
		},
	};

	const resolveStatusState = (candidate: string) => {
		return candidate && candidate in statusMap ? statusMap[candidate as AccountStatusKey] : null;
	};

	const isResetPasswordMode = mode === 'reset-password';
	const hasPrefilledEmail = Boolean(email);
	const shouldAutoVerify =
		!isResetPasswordMode &&
		Boolean(token) &&
		Boolean(key) &&
		(mode === 'verify-email' || rawStatus === 'pending_verification' || rawCode === 'EMAIL_VERIFICATION_REQUIRED');

	const resolvedState: AccountStatusState =
		isResetPasswordMode
			? {
					title: page.dataset.resetTitle,
					message: page.dataset.resetMessage,
					side: page.dataset.resetMessage,
					showForm: true,
					mode: 'reset-password',
				}
			: resolveStatusState(rawStatus) ||
				resolveStatusState(rawCode) || {
					title: page.dataset.defaultState,
					message: page.dataset.defaultMessage,
					side: page.dataset.defaultMessage,
					showForm: false,
					mode: 'info',
				};

	const setStatus = (state: string, text: string) => {
		status.dataset.state = state;
		statusText.textContent = text;
	};

	const setPending = (pending: boolean, label: string) => {
		submitButton.disabled = pending;
		resendButton.disabled = pending;
		submitButton.textContent = pending ? pendingMessage : label;
	};

	title.textContent = resolvedState.title || '';
	message.textContent = resolvedState.message || '';
	sideMessage.textContent = resolvedState.side || '';

	if (!resolvedState.showForm) {
		form.hidden = true;
		loginLink.href = rawStatus === 'active' ? homeUrl : loginUrl;
		return;
	}

	form.hidden = false;
	keyInput.value = key;
	keyInput.readOnly = hasPrefilledEmail;
	const tokenInput = getNamedInput(form, 'token');
	if (tokenInput) {
		tokenInput.value = token;
	}
	keyLabel.textContent = page.dataset.emailLabel || 'Email';

	if (resolvedState.mode === 'reset-password') {
		passwordField.hidden = false;
		keyInput.autocomplete = 'email';
		submitButton.textContent = resetLabel;
		const passwordInput = getNamedInput(form, 'password');
		if (passwordInput) {
			passwordInput.required = true;
		}
	} else {
		passwordField.hidden = true;
		submitButton.textContent = verifyLabel;
		resendButton.hidden = !email;
	}

	const redirectAfterVerify = (nextStatus: 'pending_approval' | 'active', nextEmail: string) => {
		if (nextStatus === 'active') {
			window.location.href = buildUrl(profileUrl).toString();
			return;
		}

		window.location.href = buildUrl(statusUrl, {
			status: nextStatus,
			email: nextEmail,
		}).toString();
	};

	const handleSubmit = async () => {
		const formData = new FormData(form);
		const currentKey = String(formData.get('key') || '').trim();
		const currentToken = String(formData.get('token') || '').trim();
		const currentPassword = String(formData.get('password') || '');

		setPending(true, resolvedState.mode === 'reset-password' ? resetLabel : verifyLabel);
		setStatus('pending', pendingMessage);

		try {
			if (resolvedState.mode === 'reset-password') {
				await getApiAdapter().resetPassword({
					key: currentKey,
					token: currentToken,
					password: currentPassword,
				});
				setStatus('success', resetSuccessMessage);
				return;
			}

			const response = await getApiAdapter().verifyEmail({
				key: currentKey,
				token: currentToken,
			});

			setStatus('success', response.message || verifySuccessMessage);
			redirectAfterVerify(response.status, response.email || currentKey);
		} catch (error) {
			setStatus('error', getErrorMessage(error, errorMessage));
		} finally {
			setPending(false, resolvedState.mode === 'reset-password' ? resetLabel : verifyLabel);
		}
	};

	form.addEventListener('submit', async (event) => {
		event.preventDefault();
		await handleSubmit();
	});

	resendButton.addEventListener('click', async () => {
		if (!email) {
			return;
		}

		setPending(true, verifyLabel);
		setStatus('pending', pendingMessage);

		try {
			const response = await getApiAdapter().resendVerificationEmail({ email });
			setStatus('success', response.message || resendSuccessMessage);
		} catch (error) {
			setStatus('error', getErrorMessage(error, errorMessage));
		} finally {
			setPending(false, verifyLabel);
		}
	});

	if (shouldAutoVerify) {
		void handleSubmit();
	}
}
