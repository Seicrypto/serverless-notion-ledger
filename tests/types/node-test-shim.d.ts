declare module 'node:test' {
	type TestFn = () => void | Promise<void>;

	export default function test(name: string, fn: TestFn): void;
}

declare module 'node:assert/strict' {
	interface AssertModule {
		deepEqual(actual: unknown, expected: unknown, message?: string): void;
		equal(actual: unknown, expected: unknown, message?: string): void;
		notEqual(actual: unknown, expected: unknown, message?: string): void;
	}

	const assert: AssertModule;
	export default assert;
}
