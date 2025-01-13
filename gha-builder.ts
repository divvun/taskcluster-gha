import * as actionsCore from "@actions/core"
import { exec as actionsExec } from "@actions/exec"
import * as actionsGithub from "@actions/github"
import * as actionsGlob from "@actions/glob"
import * as actionsIo from "@actions/io"
import * as actionsTc from "@actions/tool-cache"
import * as taskcluster from "taskcluster-client"

export type ExecListeners = {
  /** A call back for each buffer of stdout */
  stdout?: (data: Buffer) => void
  /** A call back for each buffer of stderr */
  stderr?: (data: Buffer) => void
  /** A call back for each line of stdout */
  stdline?: (data: string) => void
  /** A call back for each line of stderr */
  errline?: (data: string) => void
  /** A call back for each debug log */
  debug?: (data: string) => void
}

export type ExecOptions = {
  /** optional working directory.  defaults to current */
  cwd?: string
  /** optional envvar dictionary.  defaults to current process's env */
  env?: {
    [key: string]: string
  }
  /** optional.  defaults to false */
  silent?: boolean
  /** optional. whether to skip quoting/escaping arguments if needed.  defaults to false. */
  windowsVerbatimArguments?: boolean
  /** optional.  whether to fail if output to stderr.  defaults to false */
  failOnStdErr?: boolean
  /** optional.  defaults to failing on non zero.  ignore will not fail leaving it up to the caller */
  ignoreReturnCode?: boolean
  /** optional. How long in ms to wait for STDIO streams to close after the exit event of the process before terminating. defaults to 10000 */
  delay?: number
  /** optional. input to write to the process on STDIN. */
  input?: Buffer
  /** optional. Listeners for output. Callback functions that will be called on these events */
  listeners?: ExecListeners
}

export {
  actionsCore as core,
  actionsGithub as github,
  actionsIo as io,
  actionsTc as tc
}

export function exportVariable(name: string, value: string) {
  return actionsCore.exportVariable(name, value)
}

export function debug(message: string) {
  return actionsCore.debug(message)
}

export function error(message: string | Error) {
  return actionsCore.error(message)
}

export function setFailed(message: string) {
  return actionsCore.setFailed(message)
}

export function startGroup(name: string) {
  return actionsCore.startGroup(name)
}

export function endGroup() {
  return actionsCore.endGroup()
}

export function warning(message: string) {
  return actionsCore.warning(message)
}

export function exec(
  commandLine: string,
  args?: string[],
  options?: ExecOptions
): Promise<number> {
  return actionsExec(commandLine, args, options)
}

export function addPath(path: string) {
  return actionsCore.addPath(path)
}

export function downloadTool(
  url: string,
  dest?: string,
  auth?: string
): Promise<string> {
  return actionsTc.downloadTool(url, dest, auth)
}

export function extractZip(file: string, dest?: string): Promise<string> {
  return actionsTc.extractZip(file, dest)
}

export function extractTar(
  file: string,
  dest?: string,
  flags?: string | string[]
): Promise<string> {
  return actionsTc.extractTar(file, dest, flags)
}

export type CopyOptions = {
  /** Optional. Whether to recursively copy all subdirectories. Defaults to false */
  recursive?: boolean
  /** Optional. Whether to overwrite existing files in the destination. Defaults to true */
  force?: boolean
  /** Optional. Whether to copy the source directory along with all the files. Only takes effect when recursive=true and copying a directory. Default is true*/
  copySourceDirectory?: boolean
}

export function cp(source: string, dest: string, options?: CopyOptions) {
  return actionsIo.cp(source, dest, options)
}

export type GlobOptions = {
  /**
   * Indicates whether to follow symbolic links. Generally should set to false
   * when deleting files.
   *
   * @default true
   */
  followSymbolicLinks?: boolean
  /**
   * Indicates whether directories that match a glob pattern, should implicitly
   * cause all descendant paths to be matched.
   *
   * For example, given the directory `my-dir`, the following glob patterns
   * would produce the same results: `my-dir/**`, `my-dir/`, `my-dir`
   *
   * @default true
   */
  implicitDescendants?: boolean
  /**
   * Indicates whether broken symbolic should be ignored and omitted from the
   * result set. Otherwise an error will be thrown.
   *
   * @default true
   */
  omitBrokenSymbolicLinks?: boolean
}

export type Globber = {
  /**
   * Returns the search path preceding the first glob segment, from each pattern.
   * Duplicates and descendants of other paths are filtered out.
   *
   * Example 1: The patterns `/foo/*` and `/bar/*` returns `/foo` and `/bar`.
   *
   * Example 2: The patterns `/foo/*` and `/foo/bar/*` returns `/foo`.
   */
  getSearchPaths(): string[]
  /**
   * Returns files and directories matching the glob patterns.
   *
   * Order of the results is not guaranteed.
   */
  glob(): Promise<string[]>
  /**
   * Returns files and directories matching the glob patterns.
   *
   * Order of the results is not guaranteed.
   */
  globGenerator(): AsyncGenerator<string, void>
}

export function globber(
  pattern: string,
  options?: GlobOptions
): Promise<Globber> {
  return actionsGlob.create(pattern, options)
}

export function setSecret(secret: string) {
  return actionsCore.setSecret(secret)
}

export type InputOptions = {
  /** Optional. Whether the input is required. If required and not present, will throw. Defaults to false */
  required?: boolean
  /** Optional. Whether leading/trailing whitespace will be trimmed for the input. Defaults to true */
  trimWhitespace?: boolean
}

export async function getInput(
  variable: string,
  options?: InputOptions
): Promise<string> {
  return actionsCore.getInput(variable, options)
}

export async function setOutput(name: string, value: any): Promise<void> {
  return actionsCore.setOutput(name, value)
}

export type Context = {
  ref: string
  workspace: string
  repo: string
}

export const context: Context = {
  ...actionsGithub.context,
  repo: process.env.GITHUB_REPOSITORY as string,
  workspace: process.env.GITHUB_WORKSPACE as string,
}

let loadedSecrets: any = null

export async function secrets() {
  if (loadedSecrets != null) {
    return loadedSecrets
  }

  const secretService = new taskcluster.Secrets({
    rootUrl: process.env.TASKCLUSTER_PROXY_URL,
  })

  const secrets = await secretService.get("divvun")

  loadedSecrets = secrets.secret
  return loadedSecrets
}
