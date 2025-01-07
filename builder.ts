// Re-export types
import type {
  ExecListeners,
  ExecOptions,
  CopyOptions,
  GlobOptions,
  Globber,
  InputOptions,
  Context,
} from "./gha-builder";

const isDivvunCI = process.env.DIVVUN_CI;

// Ensure we get the proper types from the implementations
let selectedBuilder: typeof import("./gha-builder");

if (isDivvunCI) {
  selectedBuilder = require("./bk-builder");
} else {
  selectedBuilder = require("./gha-builder");
}

// Re-export everything with proper typing
export const {
  debug,
  setFailed,
  error,
  exec,
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
} = selectedBuilder;

// Re-export types
export type {
  ExecListeners,
  ExecOptions,
  CopyOptions,
  GlobOptions,
  Globber,
  InputOptions,
  Context,
};
