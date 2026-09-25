export declare const DEFAULT_KDF_ITERATIONS: number;
export declare const MIN_PASSWORD_LENGTH: number;
export declare function bytesToHex(bytes: Uint8Array): string;
export declare function bytesToBase64Url(bytes: Uint8Array): string;
export declare function base64UrlToBytes(value: string): Uint8Array;
export declare function randomHex(byteLength?: number): string;
export declare function sha256Hex(input: string | Uint8Array): Promise<string>;
export declare function stretchPassword(password: string, saltHex: string, iterations: number): Promise<string>;
export declare function verifierForKey(stretchedKey: string): Promise<string | null>;
export declare function timingSafeEqualHex(left: string, right: string): boolean;
export declare function createPasswordRecord(
	password: string,
	iterations?: number,
): Promise<{ salt: string; verifier: string; kdf_iterations: number }>;
export declare function fakeSaltFor(instanceSecret: string, login: string): Promise<string>;
export declare function generatePassword(length?: number): string;
