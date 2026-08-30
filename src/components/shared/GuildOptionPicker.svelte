<script lang="ts">
	import IconOptionPicker, { type IconOptionPickerItem } from './IconOptionPicker.svelte';

	export type GuildOptionPickerItem = IconOptionPickerItem;

	export let items: GuildOptionPickerItem[] = [];
	export let value = '';
	export let placeholder = '';
	export let searchPlaceholder = '';
	export let emptyLabel = 'No matches found.';
	export let disabled = false;
	export let error = false;
	export let ariaLabel = 'Guild picker';
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
	theme="guild"
	on:change
/>
