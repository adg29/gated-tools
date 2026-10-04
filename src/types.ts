export type ToolKind = "read" | "irreversible";

export type ToolHandler = (args: Record<string, unknown>) => Promise<unknown> | unknown;

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
