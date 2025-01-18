// deno-lint-ignore-file require-await no-explicit-any
// Local implementation of the builder interface

import type {
  Context,
  CopyOptions,
  ExecOptions,
  Globber,
  GlobOptions,
  InputOptions,
} from "~/builder/types.ts"

export function debug(message: string) {
  console.debug(message)
}

export function setFailed(message: string) {
  console.error(message)
  Deno.exit(1)
}

export async function spawn(
  commandLine: string,
  args?: string[],
  options?: ExecOptions,
): Promise<Deno.ChildProcess> {
  const stdio: "inherit" | "piped" | "null" =
    options?.listeners?.stdout || options?.listeners?.stderr
      ? "piped"
      : options?.silent
      ? "null"
      : "inherit"

  const command = new Deno.Command(commandLine, {
    args: args || [],
    cwd: options?.cwd,
    env: options?.env,
    stdin: options?.input ? "piped" : "inherit",
    stdout: stdio,
    stderr: stdio,
  })

  const process = command.spawn()

  if (options?.input != null) {
    const encoder = new TextEncoder()
    const writer = process.stdin.getWriter()
    await writer.write(encoder.encode(options.input))
    await writer.close()
  }

  if (options?.listeners?.stdout && process.stdout) {
    ;(async () => {
      for await (const chunk of process.stdout) {
        options?.listeners?.stdout?.(chunk)
      }
    })()
  }

  if (options?.listeners?.stderr && process.stderr) {
    ;(async () => {
      for await (const chunk of process.stderr) {
        options?.listeners?.stderr?.(chunk)
      }
    })()
  }

  return process
}

export async function exec(
  commandLine: string,
  args?: string[],
  options?: ExecOptions,
): Promise<number> {
  const proc = await spawn(commandLine, args, options)
  const status = await proc.status

  if (status.code !== 0 && !options?.ignoreReturnCode) {
    throw new Error(`Process exited with code ${status.code}`)
  }

  return status.code
}

export function addPath(path: string) {
  const sep = Deno.build.os === "windows" ? ";" : ":"
  const p = Deno.env.get("PATH")
  Deno.env.set(
    "PATH",
    `${path}${sep}${p}`,
  )
}

export async function downloadTool(
  _url: string,
  _dest?: string,
  _auth?: string,
): Promise<string> {
  // const { default: fetch } = await import("node-fetch")
  // const headers: { [key: string]: string } = {}
  // if (auth) {
  //   headers.Authorization = auth
  // }

  // const response = await fetch(url, { headers })
  // if (!response.ok) {
  //   throw new Error(`Failed to download from ${url}: ${response.statusText}`)
  // }

  // const finalDest = dest ||
  //   join(tmpdir(), Math.random().toString(36).substring(7))
  // const buffer = await response.buffer()
  // await writeFile(finalDest, buffer)
  // return finalDest
  throw new Error("Download tool is not available in Buildkite")
}

export async function extractZip(_file: string, _dest?: string): Promise<string> {
  throw new Error("Extract zip is not available in Buildkite")
}

export async function extractTar(
  _file: string,
  _dest?: string,
  _flags?: string | string[],
): Promise<string> {
  throw new Error("Extract tar is not available in Buildkite")
}

export async function cp(_source: string, _dest: string, _options?: CopyOptions) {
  throw new Error("Copy is not available in Buildkite")
}

export async function globber(
  _pattern: string,
  _options?: GlobOptions,
): Promise<Globber> {
  // const { glob } = await import("glob")
  // const matches = (await glob(pattern, {
  //   follow: options?.followSymbolicLinks,
  //   dot: true,
  //   nocase: true,
  // })) as string[]

  // return {
  //   getSearchPaths: (): string[] => {
  //     const paths = matches.map((m: string) => dirname(m))
  //     return [...new Set(paths)]
  //   },
  //   glob: async () => matches,
  //   globGenerator: async function* () {
  //     for (const match of matches) {
  //       yield match
  //     }
  //   },
  // }
  throw new Error("Glob is not available in Buildkite")
}

export async function setSecret(_secret: string) {
  // return new Promise<void>((resolve, reject) => {
  //   const echo = doSpawn("echo", [secret])
  //   const redactor = doSpawn("buildkite-agent", ["redactor", "add"])

  //   echo.stdout.pipe(redactor.stdin)

  //   redactor.on("error", reject)
  //   redactor.on("close", (code) => {
  //     if (code === 0) {
  //       resolve()
  //     } else {
  //       reject(new Error(`Failed to add secret to redactor: exit code ${code}`))
  //     }
  //   })

  //   echo.on("error", reject)
  // })
  throw new Error("Secrets are not available in Buildkite")
}

export async function getInput(
  _variable: string,
  _options?: InputOptions,
): Promise<string> {
  // try {
  //   const value = await new Promise<string>((resolve, reject) => {
  //     exec("buildkite-agent", ["meta-data", "get", variable])
  //       .then((code) => {
  //         if (code === 0) {
  //           resolve(process.stdout.toString().trim())
  //         } else {
  //           reject(new Error(`Failed to get meta-data for ${variable}`))
  //         }
  //       })
  //       .catch(reject)
  //   })

  //   if (value && options?.trimWhitespace !== false) {
  //     return value.trim()
  //   }
  //   return value
  // } catch (error) {
  //   if (options?.required) {
  //     throw new Error(`Input required and not supplied: ${variable}`)
  //   }
  //   return ""
  // }
  throw new Error("Input is not available in Buildkite")
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
  Deno.env.set(name, value)
  console.log(`Setting environment variable ${name}=${value}`)
}

export const context: Context = {
  ref: Deno.env.get("BUILDKITE_COMMIT")!,
  workspace: Deno.env.get("BUILDKITE_BUILD_CHECKOUT_PATH")!,
  repo: Deno.env.get("BUILDKITE_REPO")!,
}

export function secrets(): any {
  // throw new Error("Secrets are not available in local")
  return {}
}

export function tempDir() {
  return Deno.makeTempDirSync()
}

export function createArtifact(_fileName: string, _artifactPath: string) {
  throw new Error("Artifacts are not available in local")
}
