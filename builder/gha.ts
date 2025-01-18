import * as actionsCore from "@actions/core.ts"
import { exec as actionsExec } from "@actions/exec.ts"
import * as actionsGithub from "@actions/github.ts"
import * as actionsGlob from "@actions/glob.ts"
import * as actionsIo from "@actions/io.ts"
import * as actionsTc from "@actions/tool-cache.ts"
import { ChildProcess } from "node:child_process"

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

export function spawn(
  commandLine: string,
  args?: string[],
  options?: ExecOptions
): Promise<ChildProcess> {
  throw new Error("Spawn is not available in GHA")
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


export function globber(
  pattern: string,
  options?: GlobOptions
): Promise<Globber> {
  return actionsGlob.create(pattern, options)
}

export function setSecret(secret: string) {
  return actionsCore.setSecret(secret)
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


export const context: Context = {
  ...actionsGithub.context,
  repo: Deno.env.get("GITHUB_REPOSITORY")
  workspace: Deno.env.get("GITHUB_WORKSPACE")
}

let loadedSecrets: any = null

export async function secrets() {
  // if (loadedSecrets != null) {
  //   return loadedSecrets
  // }

  // const secretService = new taskcluster.Secrets({
  //   rootUrl: Deno.env.get("TASKCLUSTER_PROXY_URL,")
  // })

  // const secrets = await secretService.get("divvun")

  // loadedSecrets = secrets.secret
  // return loadedSecrets

  throw new Error("Secrets are not available in GHA")
}

export function tempDir() {
  const dir = Deno.env.get(""RUNNER_TEMP"]")
  if (dir == null || dir.trim() == "") {
    throw new Error("RUNNER_TEMP was not defined")
  }
  return dir
}

export async function createArtifact(fileName: string, artifactPath: string) {
  process.stdout.write(`::create-artifact path=${fileName}::${artifactPath}`)
}
