// @ts-check
/**
 * Assert-based self-check for the password scheme shared by the CLI, the Worker and
 * the login form. No test framework.
 *
 * Run with:  node packages/cli/src/password.test-manual.js
 */
import assert from "node:assert/strict";

import {
	createPasswordRecord,
	fakeSaltFor,
	generatePassword,
	stretchPassword,
	timingSafeEqualHex,
	verifierForKey,
} from "./password.js";

// Low iteration count keeps the check fast; the scheme is the same at 600k.
const ITERATIONS = 1_000;

// 1. The CLI's stored verifier matches what the Worker computes from the browser's key.
const record = await createPasswordRecord("correct horse battery staple", ITERATIONS);
const browserKey = await stretchPassword("correct horse battery staple", record.salt, record.kdf_iterations);
const workerVerifier = await verifierForKey(browserKey);
assert.ok(workerVerifier && timingSafeEqualHex(workerVerifier, record.verifier), "right password must verify");

// 2. A wrong password (same salt) does not.
const wrongKey = await stretchPassword("correct horse battery stapl", record.salt, record.kdf_iterations);
assert.equal(timingSafeEqualHex(/** @type {string} */ (await verifierForKey(wrongKey)), record.verifier), false);

// 3. Unicode passwords are normalized, so the same text typed on different devices matches.
const composed = await stretchPassword("contraseña-segura", record.salt, ITERATIONS);
const decomposed = await stretchPassword("contraseña-segura", record.salt, ITERATIONS);
assert.equal(composed, decomposed);

// 4. Malformed keys are rejected before any comparison.
assert.equal(await verifierForKey("not base64 !!"), null);
assert.equal(await verifierForKey("AAAA"), null);

// 5. Fake salts for unknown logins are stable, case-insensitive and secret-dependent.
assert.equal(await fakeSaltFor("s", " Jane@Acme.com"), await fakeSaltFor("s", "jane@acme.com"));
assert.notEqual(await fakeSaltFor("s1", "jane"), await fakeSaltFor("s2", "jane"));
assert.equal((await fakeSaltFor("s", "jane")).length, record.salt.length);

// 6. Generated passwords have the requested length and no ambiguous characters.
const generated = generatePassword();
assert.equal(generated.length, 20);
assert.doesNotMatch(generated, /[0O1lI]/);
assert.notEqual(generatePassword(), generated);

// 7. Salts are unique per record, so equal passwords get different verifiers.
const again = await createPasswordRecord("correct horse battery staple", ITERATIONS);
assert.notEqual(again.salt, record.salt);
assert.notEqual(again.verifier, record.verifier);

console.log("password.test-manual: all checks passed");
