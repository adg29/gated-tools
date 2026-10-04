export type ToolKind = "read" | "irreversible";

/**
 * `approvalId` is set only for irreversible calls. Forward it to the provider as an
 * idempotency key so a retry after a crash can't send twice.
 */
export type ToolHandler = (
  args: Record<string, unknown>,
  context: { approvalId?: string },
) => Promise<unknown> | unknown;

export type ToolDefinition = {
  name: string;
  kind: ToolKind;
  /** Optional aliases that must still hit the same gate (smuggle defense). */
  aliases?: string[];
  handler: ToolHandler;
};

export type AllowGrant = {
  /** Canonical tool name the approval covers. */
  tool: string;
  /** Epoch ms; the grant is refused at or after this time. */
  expiresAt: number;
  nonce: string;
  /** Base64 Ed25519 signature over canonical JSON of { tool, args, expiresAt, nonce }. */
  signature: string;
};

/** Checks only that the grant is authentic for this canonical tool and args; the runtime checks expiry and reuse. */
export interface ApprovalVerifier {
  verify(grant: AllowGrant, tool: string, args: Record<string, unknown>): boolean | Promise<boolean>;
}

/**
 * Remembers which approvals were already used. A production implementation must be atomic
 * across processes (e.g. a unique-key insert), because check-then-set races: two copies can
 * both see "unused" and both run.
 */
export interface UsedApprovals {
  /** Records the nonce; returns false if it was already claimed. */
  claim(nonce: string, expiresAt: number): boolean | Promise<boolean>;
}

export type ToolCall = {
  name: string;
  args?: Record<string, unknown>;
  /** Present only when an external controller grants the irreversible call. */
  allow?: AllowGrant;
};

export type GateDenial = {
  ok: false;
  reason:
    | "unknown_tool"
    | "missing_allow"
    | "allow_mismatch"
    | "bad_signature"
    | "allow_expired"
    | "allow_reused";
  tool: string;
};

export type GateSuccess = {
  ok: true;
  tool: string;
  result: unknown;
};

export type GateResult = GateDenial | GateSuccess;
