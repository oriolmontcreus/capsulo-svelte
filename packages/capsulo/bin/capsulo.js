#!/usr/bin/env node
// @ts-check
import * as p from "@clack/prompts";

import { ExecError, isVerbose, tail } from "../src/lib/exec.js";

const HELP = `capsulo <command>

Commands:
  deploy   Create the Cloudflare resources, build and deploy (safe to re-run)
  users    Manage the people who can sign in to the CMS
  pull     Snapshot published content for the static build (runs before \`astro build\`)
  storage  Show where uploads are stored, or move them from KV to R2 (\`capsulo storage r2\`)

Run \`capsulo <command> --help\` for details.`;

const [command, ...args] = process.argv.slice(2);

/** @type {Record<string, () => Promise<(argv: string[]) => Promise<void>>>} */
const commands = {
	deploy: async () => (await import("../src/commands/deploy.js")).deployCommand,
	users: async () => (await import("../src/commands/users.js")).usersCommand,
	pull: async () => (await import("../src/commands/pull.js")).pullCommand,
	storage: async () => (await import("../src/commands/storage.js")).storageCommand,
};

if (!command || command === "--help" || command === "-h" || command === "help") {
	console.log(HELP);
} else if (!commands[command]) {
	console.error(`Unknown command "${command}".\n\n${HELP}`);
	process.exitCode = 1;
} else {
	try {
		const run = await commands[command]();
		await run(args);
	} catch (error) {
		p.log.error(error instanceof Error ? error.message : String(error));
		// Output of hidden steps is only shown when they fail.
		if (error instanceof ExecError && error.log.trim() && !isVerbose()) {
			console.error(`\n${tail(error.log)}\n`);
			p.log.info("Re-run with --verbose to see the full output.");
		}
		process.exitCode = 1;
	}
}
