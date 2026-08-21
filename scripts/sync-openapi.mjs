import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');
const localSpecPath = path.join(projectRoot, 'src/libs/api/openapi/openapi.json');

function parseArgs(argv) {
	const args = new Map();

	for (let index = 0; index < argv.length; index += 1) {
		const token = argv[index];
		if (!token.startsWith('--')) {
			continue;
		}

		const key = token.slice(2);
		const next = argv[index + 1];
		if (!next || next.startsWith('--')) {
			args.set(key, 'true');
			continue;
		}

		args.set(key, next);
		index += 1;
	}

	return args;
}

async function readSource(source) {
	if (/^https?:\/\//.test(source)) {
		const response = await fetch(source);
		if (!response.ok) {
			throw new Error(`Failed to fetch OpenAPI source: ${response.status} ${response.statusText}`);
		}

		return response.text();
	}

	return readFile(path.resolve(projectRoot, source), 'utf8');
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
	const args = parseArgs(process.argv.slice(2));
	const source = args.get('source') ?? process.env.OPENAPI_SOURCE;

	if (!source) {
		throw new Error('Missing OpenAPI source. Use --source <path-or-url> or set OPENAPI_SOURCE.');
	}

	const [remoteSpec, localSpec] = await Promise.all([readSource(source), readFile(localSpecPath, 'utf8')]);

	if (remoteSpec !== localSpec) {
		await writeFile(localSpecPath, remoteSpec, 'utf8');
		console.log(`Updated ${path.relative(projectRoot, localSpecPath)} from ${source}`);
	} else {
		console.log('OpenAPI spec already matches source.');
	}

	runGenerator();
}

main().catch((error) => {
	console.error(error);
	process.exitCode = 1;
});
