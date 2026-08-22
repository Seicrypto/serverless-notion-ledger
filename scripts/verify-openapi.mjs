import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');
const trackedFiles = [
	'src/libs/api/openapi/openapi.json',
	'src/libs/api/openapi/generated/schema.d.ts',
	'src/libs/api/openapi/generated/client.ts',
];

async function readTrackedFiles() {
	const entries = await Promise.all(
		trackedFiles.map(async (filePath) => [filePath, await readFile(path.join(projectRoot, filePath), 'utf8')]),
	);

	return new Map(entries);
}

function runGenerator() {
	const result = spawnSync(process.execPath, ['./scripts/generate-openapi.mjs'], {
		cwd: projectRoot,
		stdio: 'inherit',
	});

	if (result.status !== 0) {
		process.exit(result.status ?? 1);
	}
}

async function main() {
	const before = await readTrackedFiles();
	runGenerator();
	const after = await readTrackedFiles();

	const changedFiles = trackedFiles.filter((filePath) => before.get(filePath) !== after.get(filePath));
	if (changedFiles.length > 0) {
		console.error('OpenAPI artifacts are out of date. Run `npm run generate:openapi` and commit the result.');
		for (const filePath of changedFiles) {
			console.error(`- ${filePath}`);
		}
		process.exitCode = 1;
		return;
	}

	console.log('OpenAPI artifacts are in sync.');
}

main().catch((error) => {
	console.error(error);
	process.exitCode = 1;
});
