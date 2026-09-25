// @ts-check
import * as p from "@clack/prompts";

import { ExecError } from "./exec.js";
import { runWrangler } from "./wrangler.js";

/** Cloudflare's error when R2 has not been enabled (it needs a payment method on file). */
const R2_NOT_ENABLED = /10042|enable R2/i;

/**
 * @param {string} root
 * @returns {Promise<string[] | null>} bucket names, or null when R2 is not enabled yet
 */
async function listBuckets(root) {
	try {
		const output = await runWrangler(root, ["r2", "bucket", "list"], { json: true });
		return [...output.matchAll(/^name:\s+(\S+)/gm)].map((match) => match[1]);
	} catch (error) {
		if (error instanceof ExecError && R2_NOT_ENABLED.test(error.log)) return null;
		throw error;
	}
}

/**
 * Makes sure R2 is enabled on the account and the bucket exists. Enabling R2 asks for a
 * payment method in the dashboard even when usage stays inside the free tier, so that
 * one step is guided and waits for the user.
 * @param {string} root
 * @param {{ accountId: string, bucketName: string, yes: boolean }} options
 */
export async function ensureR2Bucket(root, { accountId, bucketName, yes }) {
	let buckets = await listBuckets(root);
	while (buckets === null) {
		p.note(
			[
				"R2 is not enabled on this Cloudflare account yet. Cloudflare asks for a",
				"payment method once, even to use only the free tier (10 GB of storage).",
				"",
				`1. Open https://dash.cloudflare.com/${accountId}/r2/overview`,
				"2. Follow the steps to enable R2 (this is where the payment method is added).",
			].join("\n"),
			"Enable R2",
		);
		if (yes || (await p.confirm({ message: "Done? Check again" })) !== true) {
			throw new Error("R2 is not enabled on this account. Enable it in the dashboard, then run this again.");
		}
		buckets = await listBuckets(root);
	}

	if (buckets.includes(bucketName)) {
		p.log.info(`Using the existing R2 bucket "${bucketName}".`);
		return;
	}
	await runWrangler(root, ["r2", "bucket", "create", bucketName, "--update-config=false"]);
	p.log.success(`R2 bucket "${bucketName}" created`);
}
