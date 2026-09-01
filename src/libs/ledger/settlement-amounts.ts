export type SettlementFeeMode = 'none' | 'percent' | 'fixed' | 'rule';

export interface SettlementAmountState {
	grossAmount: string;
	netAmount: string;
	feeMode: SettlementFeeMode;
	feePercent: string;
	feeAmount: string;
	feeRuleKey: string;
}

export function normalizeNumericInput(value: string) {
	return value.replace(/,/g, '').replace(/[^\d.]/g, '').replace(/^(\d*\.?\d*).*$/, '$1');
}

export function parseAmountValue(value: string | number | null | undefined) {
	if (value === null || value === undefined) {
		return null;
	}

	if (typeof value === 'number') {
		return Number.isFinite(value) ? value : Number.NaN;
	}

	const normalized = normalizeNumericInput(value).trim();
	if (!normalized) {
		return null;
	}

	const parsed = Number(normalized);
	return Number.isFinite(parsed) ? parsed : Number.NaN;
}

export function formatAmountDisplay(value: string | number | null | undefined) {
	const parsed = parseAmountValue(value);
	if (parsed === null || Number.isNaN(parsed)) {
		return '';
	}

	return new Intl.NumberFormat('en-US', {
		maximumFractionDigits: 2,
		minimumFractionDigits: Number.isInteger(parsed) ? 0 : 2,
	}).format(parsed);
}

export function calculateSettlementNetAmount(state: Pick<SettlementAmountState, 'grossAmount' | 'feeMode' | 'feePercent' | 'feeAmount'>) {
	const gross = parseAmountValue(state.grossAmount);
	if (gross === null || Number.isNaN(gross) || gross < 0) {
		return '';
	}

	let nextNet = gross;
	if (state.feeMode === 'percent') {
		const percent = parseAmountValue(state.feePercent);
		if (percent !== null && !Number.isNaN(percent)) {
			nextNet = gross - gross * (percent / 100);
		}
	} else if (state.feeMode === 'fixed' || state.feeMode === 'rule') {
		const fee = parseAmountValue(state.feeAmount);
		if (fee !== null && !Number.isNaN(fee)) {
			nextNet = gross - fee;
		}
	}

	return String(Math.max(0, Number(nextNet.toFixed(2))));
}
