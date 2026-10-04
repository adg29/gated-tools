import { generateKeyPairSync, randomUUID, sign, verify, type KeyObject } from "node:crypto";
import type { AllowGrant, ApprovalVerifier } from "./types.js";

const DEFAULT_TTL_MS = 5 * 60 * 1000;

function isOmitted(value: unknown): boolean {
  return value === undefined || typeof value === "function" || typeof value === "symbol";
}

/** JSON with object keys sorted recursively, so signer and verifier produce identical bytes. */
export function canonicalJson(value: unknown): string {
  if (value !== null && typeof value === "object" && typeof (value as { toJSON?: unknown }).toJSON === "function") {
    value = (value as { toJSON: () => unknown }).toJSON();
  }
  if (Array.isArray(value)) {
    return `[${value.map((item) => (isOmitted(item) ? "null" : canonicalJson(item))).join(",")}]`;
  }
  // Built by hand because JS objects always list integer-like keys first, so re-sorting into a new object is not enough.
  if (value !== null && typeof value === "object") {
    const entries = Object.entries(value)
      .filter(([, v]) => !isOmitted(v))
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
    return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${canonicalJson(v)}`).join(",")}}`;
  }
  return isOmitted(value) ? "null" : JSON.stringify(value);
}

function signedPayload(tool: string, args: Record<string, unknown>, expiresAt: number, nonce: string): Buffer {
  return Buffer.from(canonicalJson({ tool, args, expiresAt, nonce }), "utf8");
}

export function createApprover(
  privateKey: KeyObject,
  options: { ttlMs?: number; now?: () => number } = {},
): { approve(tool: string, args?: Record<string, unknown>): AllowGrant } {
  const ttlMs = options.ttlMs ?? DEFAULT_TTL_MS;
  const now = options.now ?? Date.now;
  return {
    approve(tool, args = {}) {
      const expiresAt = now() + ttlMs;
      const nonce = randomUUID();
      const signature = sign(null, signedPayload(tool, args, expiresAt, nonce), privateKey).toString("base64");
      return { tool, expiresAt, nonce, signature };
    },
  };
}

export function signatureVerifier(publicKey: KeyObject): ApprovalVerifier {
  // A private key would also verify, but then whoever holds the verifier could mint approvals.
  if (publicKey.type !== "public") {
    throw new Error("signatureVerifier needs a public key");
  }
  return {
    verify(grant, tool, args) {
      // Grants can come from untrusted input, so malformed fields must deny rather than throw.
      try {
        const signature = Buffer.from(grant.signature, "base64");
        return verify(null, signedPayload(tool, args, grant.expiresAt, grant.nonce), publicKey, signature);
      } catch {
        return false;
      }
    },
  };
}

/** Generates a fresh key pair; use createApprover with a loaded key when the approver runs elsewhere. */
export function createApprovalKeys(options: { ttlMs?: number; now?: () => number } = {}): {
  approver: ReturnType<typeof createApprover>;
  verifier: ApprovalVerifier;
} {
  const { privateKey, publicKey } = generateKeyPairSync("ed25519");
  return { approver: createApprover(privateKey, options), verifier: signatureVerifier(publicKey) };
}
