// Re-export types
import type {
  Context,
  CopyOptions,
  ExecListeners,
  ExecOptions,
  Globber,
  GlobOptions,
  InputOptions,
} from "./builder/types.ts"

const isBuildkite = Deno.env.get("BUILDKITE")

// Ensure we get the proper types from the implementations
let selectedBuilder: typeof import("~/builder/local.ts")
export let mode: string

if (isBuildkite) {
  selectedBuilder = await import("~/builder/buildkite.ts")
  mode = "buildkite"
} else {
  selectedBuilder = await import("~/builder/local.ts")
  mode = "local"
}

// Re-export everything with proper typing
export const {
  debug,
  setFailed,
  error,
  exec,
  spawn,
  addPath,
  downloadTool,
  extractZip,
  extractTar,
  cp,
  globber,
  redactSecret,
  getInput,
  setOutput,
  startGroup,
  endGroup,
  warning,
  exportVariable,
  context,
  secrets,
  tempDir,
  createArtifact,
  setMaxLines,
  group,
} = selectedBuilder

// Re-export types
export type {
  Context,
  CopyOptions,
  ExecListeners,
  ExecOptions,
  Globber,
  GlobOptions,
  InputOptions,
}
