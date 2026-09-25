// @ts-check
/**
 * Password scheme shared by the browser (login form), the Worker (login endpoint)
 * and the CLI (`capsulo users`). Uses only WebCrypto, so it runs unchanged in all three.
 *
 * The expensive part (PBKDF2) runs where CPU is free: in the browser at login and in
 * Node when the CLI creates a user. The Worker only hashes the stretched key once
 * with SHA-256, which keeps logins inside the Workers free plan's 10 ms CPU budget.
 * A leaked database still costs an attacker one full PBKDF2 per password guess.
 */

/** OWASP (2023) recommendation for PBKDF2-HMAC-SHA256. Stored per user, so it can be raised later. */
export const DEFAULT_KDF_ITERATIONS = 600_000;

const KEY_BYTES = 32;
const SALT_BYTES = 16;
const PASSWORD_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";

/** @param {Uint8Array} bytes */
export function bytesToHex(bytes) {
	return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

/** @param {string} hex */
function hexToBytes(hex) {
	if (!/^(?:[0-9a-f]{2})*$/i.test(hex)) throw new Error("Invalid hex string.");
	const bytes = new Uint8Array(hex.length / 2);
	for (let index = 0; index < bytes.length; index++) {
		bytes[index] = Number.parseInt(hex.slice(index * 2, index * 2 + 2), 16);
	}
	return bytes;
}

/** @param {Uint8Array} bytes */
export function bytesToBase64Url(bytes) {
	let binary = "";
	for (const byte of bytes) binary += String.fromCharCode(byte);
	return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "");
}

/** @param {string} value */
export function base64UrlToBytes(value) {
	const base64 = value.replaceAll("-", "+").replaceAll("_", "/");
	const binary = atob(base64 + "=".repeat((4 - (base64.length % 4)) % 4));
	return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

/** @param {number} [byteLength] */
export function randomHex(byteLength = SALT_BYTES) {
	return bytesToHex(crypto.getRandomValues(new Uint8Array(byteLength)));
}

/** @param {string | Uint8Array} input */
export async function sha256Hex(input) {
	const data = typeof input === "string" ? new TextEncoder().encode(input) : new Uint8Array(input);
	return bytesToHex(new Uint8Array(await crypto.subtle.digest("SHA-256", data)));
}

/**
 * Browser/CLI side: stretches a password into the key sent to (or stored for) the server.
 * @param {string} password
 * @param {string} saltHex
 * @param {number} iterations
 * @returns {Promise<string>} base64url-encoded 32-byte key
 */
export async function stretchPassword(password, saltHex, iterations) {
	const baseKey = await crypto.subtle.importKey(
		"raw",
		new TextEncoder().encode(password.normalize("NFKC")),
		"PBKDF2",
		false,
		["deriveBits"],
	);
	const bits = await crypto.subtle.deriveBits(
		{ name: "PBKDF2", hash: "SHA-256", salt: hexToBytes(saltHex), iterations },
		baseKey,
		KEY_BYTES * 8,
	);
	return bytesToBase64Url(new Uint8Array(bits));
}

/**
 * Server side: the value stored in `users.verifier` for a stretched key.
 * Returns null when the key is not a well-formed 32-byte base64url string.
 * @param {string} stretchedKey
 */
export async function verifierForKey(stretchedKey) {
	let bytes;
	try {
		bytes = base64UrlToBytes(stretchedKey);
	} catch {
		return null;
	}
	if (bytes.length !== KEY_BYTES) return null;
	return sha256Hex(bytes);
}

/**
 * Constant-time comparison of two equal-length hex strings.
 * @param {string} left
 * @param {string} right
 */
export function timingSafeEqualHex(left, right) {
	if (left.length !== right.length) return false;
	let difference = 0;
	for (let index = 0; index < left.length; index++) {
		difference |= left.charCodeAt(index) ^ right.charCodeAt(index);
	}
	return difference === 0;
}

/**
 * CLI side: everything the `users` row needs for a new password.
 * @param {string} password
 * @param {number} [iterations]
 */
export async function createPasswordRecord(password, iterations = DEFAULT_KDF_ITERATIONS) {
	const salt = randomHex();
	const verifier = await verifierForKey(await stretchPassword(password, salt, iterations));
	if (!verifier) throw new Error("Failed to derive the password verifier.");
	return { salt, verifier, kdf_iterations: iterations };
}

/**
 * Deterministic salt returned for unknown logins, so the challenge endpoint does
 * not reveal which logins exist.
 * @param {string} instanceSecret
 * @param {string} login
 */
export async function fakeSaltFor(instanceSecret, login) {
	const digest = await sha256Hex(`${instanceSecret}\n${login.trim().toLowerCase()}`);
	return digest.slice(0, SALT_BYTES * 2);
}

/**
 * A 20-character password from an unambiguous alphabet (~115 bits of entropy).
 * @param {number} [length]
 */
export function generatePassword(length = 20) {
	const limit = 256 - (256 % PASSWORD_ALPHABET.length);
	let password = "";
	while (password.length < length) {
		for (const byte of crypto.getRandomValues(new Uint8Array(length * 2))) {
			if (byte < limit && password.length < length) {
				password += PASSWORD_ALPHABET[byte % PASSWORD_ALPHABET.length];
			}
		}
	}
	return password;
}

export const MIN_PASSWORD_LENGTH = 12;
