// Re-export types
import type {
  Context,
  CopyOptions,
  ExecListeners,
  ExecOptions,
  Globber,
  GlobOptions,
  InputOptions,
} from "./builder/gha"

const isTaskcluster = Deno.env.get("TASKCLUSTER_ROOT_URL")
const isBuildkite = Deno.env.get("BUILDKITE")
export let isGHA = !!isTaskcluster

// Ensure we get the proper types from the implementations
let selectedBuilder: typeof import("~/builder/local.ts")
export let mode: string

if (isBuildkite) {
  selectedBuilder = await import("~/builder/buildkite.ts")
  mode = "buildkite"
} else if (isTaskcluster) {
  selectedBuilder = await import("~/builder/gha.ts")
  mode = "taskcluster"
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
  setSecret,
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
