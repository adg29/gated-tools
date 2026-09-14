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
  tool: string;
  /** Opaque token; presence + matching tool name is enough for v1. */
  token: string;
};

export type ToolCall = {
  name: string;
  args?: Record<string, unknown>;
  /** Present only when an external controller grants the irreversible call. */
  allow?: AllowGrant;
};

export type GateDenial = {
  ok: false;
  reason: "missing_allow" | "allow_mismatch" | "unknown_tool";
  tool: string;
};

export type GateSuccess = {
  ok: true;
  tool: string;
  result: unknown;
};

export type GateResult = GateDenial | GateSuccess;
