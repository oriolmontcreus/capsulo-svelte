#!/usr/bin/env node
// @ts-check
import * as p from "@clack/prompts";

const HELP = `capsulo <command>

Commands:
  deploy   Create the Cloudflare resources, build and deploy (safe to re-run)
  users    Manage the people who can sign in to the CMS
  pull     Snapshot published content for the static build (runs before \`astro build\`)

Run \`capsulo <command> --help\` for details.`;

const [command, ...args] = process.argv.slice(2);

/** @type {Record<string, () => Promise<(argv: string[]) => Promise<void>>>} */
const commands = {
	deploy: async () => (await import("../src/commands/deploy.js")).deployCommand,
	users: async () => (await import("../src/commands/users.js")).usersCommand,
	pull: async () => (await import("../src/commands/pull.js")).pullCommand,
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
		process.exitCode = 1;
	}
}
