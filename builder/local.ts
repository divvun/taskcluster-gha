// Buildkite implementation of the builder interface

import { spawn } from "child_process"
import { cp as fsCp, mkdtemp, writeFile } from "fs/promises"
import { tmpdir } from "os"
import { dirname, join } from "path"

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

export type CopyOptions = {
  /** Optional. Whether to recursively copy all subdirectories. Defaults to false */
  recursive?: boolean
  /** Optional. Whether to overwrite existing files in the destination. Defaults to true */
  force?: boolean
  /** Optional. Whether to copy the source directory along with all the files. Only takes effect when recursive=true and copying a directory. Default is true*/
  copySourceDirectory?: boolean
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

export type InputOptions = {
  /** Optional. Whether the input is required. If required and not present, will throw. Defaults to false */
  required?: boolean
  /** Optional. Whether leading/trailing whitespace will be trimmed for the input. Defaults to true */
  trimWhitespace?: boolean
}

export type Context = {
  ref: string
  repo: string
  workspace: string
}

// Buildkite-specific implementations

export function debug(message: string) {
  console.debug(message)
}

export function setFailed(message: string) {
  console.error(message)
  process.exit(1)
}

export async function exec(
  commandLine: string,
  args?: string[],
  options?: ExecOptions
): Promise<number> {
  return new Promise((resolve, reject) => {
    const proc = spawn(commandLine, args || [], {
      cwd: options?.cwd,
      env: options?.env || process.env,
      stdio: options?.silent ? "ignore" : "inherit",
    })

    if (options?.listeners?.stdout) {
      proc.stdout?.on("data", options.listeners.stdout)
    }
    if (options?.listeners?.stderr) {
      proc.stderr?.on("data", options.listeners.stderr)
    }

    proc.on("error", reject)
    proc.on("close", (code) => {
      if (code !== 0 && !options?.ignoreReturnCode) {
        reject(new Error(`Process exited with code ${code}`))
      } else {
        resolve(code || 0)
      }
    })

    if (options?.input) {
      proc.stdin?.write(options.input)
      proc.stdin?.end()
    }
  })
}

export function addPath(path: string) {
  process.env.PATH = `${path}${process.platform === "win32" ? ";" : ":"}${
    process.env.PATH
  }`
}

export async function downloadTool(
  url: string,
  dest?: string,
  auth?: string
): Promise<string> {
  const { default: fetch } = await import("node-fetch")
  const headers: { [key: string]: string } = {}
  if (auth) {
    headers.Authorization = auth
  }

  const response = await fetch(url, { headers })
  if (!response.ok) {
    throw new Error(`Failed to download from ${url}: ${response.statusText}`)
  }

  const finalDest =
    dest || join(tmpdir(), Math.random().toString(36).substring(7))
  const buffer = await response.buffer()
  await writeFile(finalDest, buffer)
  return finalDest
}

export async function extractZip(file: string, dest?: string): Promise<string> {
  const extract = (await import("extract-zip")).default
  const finalDest = dest || (await mkdtemp(join(tmpdir(), "extract-")))
  await extract(file, { dir: finalDest })
  return finalDest
}

export async function extractTar(
  file: string,
  dest?: string,
  flags?: string | string[]
): Promise<string> {
  const finalDest = dest || (await mkdtemp(join(tmpdir(), "extract-")))
  const flagsArray = typeof flags === "string" ? [flags] : flags || ["-xf"]

  await exec("tar", [...flagsArray, file, "-C", finalDest])
  return finalDest
}

export async function cp(source: string, dest: string, options?: CopyOptions) {
  await fsCp(source, dest, {
    recursive: options?.recursive,
    force: options?.force,
  })
}

export async function globber(
  pattern: string,
  options?: GlobOptions
): Promise<Globber> {
  const { glob } = await import("glob")
  const matches = (await glob(pattern, {
    follow: options?.followSymbolicLinks,
    dot: true,
    nocase: true,
  })) as string[]

  return {
    getSearchPaths: (): string[] => {
      const paths = matches.map((m: string) => dirname(m))
      return [...new Set(paths)]
    },
    glob: async () => matches,
    globGenerator: async function* () {
      for (const match of matches) {
        yield match
      }
    },
  }
}

export async function setSecret(secret: string) {
  return new Promise<void>((resolve, reject) => {
    const echo = spawn("echo", [secret])
    const redactor = spawn("buildkite-agent", ["redactor", "add"])

    echo.stdout.pipe(redactor.stdin)

    redactor.on("error", reject)
    redactor.on("close", (code) => {
      if (code === 0) {
        resolve()
      } else {
        reject(new Error(`Failed to add secret to redactor: exit code ${code}`))
      }
    })

    echo.on("error", reject)
  })
}

export async function getInput(
  variable: string,
  options?: InputOptions
): Promise<string> {
  try {
    const value = await new Promise<string>((resolve, reject) => {
      exec("buildkite-agent", ["meta-data", "get", variable])
        .then((code) => {
          if (code === 0) {
            resolve(process.stdout.toString().trim())
          } else {
            reject(new Error(`Failed to get meta-data for ${variable}`))
          }
        })
        .catch(reject)
    })

    if (value && options?.trimWhitespace !== false) {
      return value.trim()
    }
    return value
  } catch (error) {
    if (options?.required) {
      throw new Error(`Input required and not supplied: ${variable}`)
    }
    return ""
  }
}

export async function setOutput(name: string, value: any) {
  await exec("buildkite-agent", ["meta-data", "set", name, value.toString()])
}

export function startGroup(name: string) {
  console.log(`--- ${name}`)
}

export function endGroup() {
  console.log("^^^")
}

export function warning(message: string) {
  console.warn(`⚠️  ${message}`)
}

export function error(message: string | Error) {
  const errorMessage = message instanceof Error ? message.message : message
  console.error(`❌ ${errorMessage}`)
}

export function exportVariable(name: string, value: string) {
  process.env[name] = value
  console.log(`Setting environment variable ${name}=${value}`)
}

export const context: Context = {
  ref: process.env.BUILDKITE_COMMIT || "",
  workspace: process.env.BUILDKITE_BUILD_CHECKOUT_PATH || "",
  repo: process.env.BUILDKITE_REPO || "",
}

export function secrets() {
  throw new Error("Secrets are not available in local")
}

export function tempDir() {
  return tmpdir()
}

export function createArtifact(fileName: string, artifactPath: string) {
  throw new Error("Artifacts are not available in local")
}
