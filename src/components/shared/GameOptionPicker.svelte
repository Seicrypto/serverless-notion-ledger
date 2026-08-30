<script lang="ts">
	import IconOptionPicker, { type IconOptionPickerItem } from './IconOptionPicker.svelte';

	export type GameOptionPickerItem = IconOptionPickerItem;

	export let items: GameOptionPickerItem[] = [];
	export let value = '';
	export let placeholder = '';
	export let searchPlaceholder = '';
	export let emptyLabel = 'No matches found.';
	export let disabled = false;
	export let error = false;
	export let ariaLabel = 'Game picker';
</script>

<IconOptionPicker
	items={items}
	value={value}
	placeholder={placeholder}
	searchPlaceholder={searchPlaceholder}
	emptyLabel={emptyLabel}
	disabled={disabled}
	error={error}
	ariaLabel={ariaLabel}
	theme="game"
	on:change
/>
