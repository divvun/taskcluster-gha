import { which } from "@david/which"
import { exists } from "@std/fs"
import os from "node:os"
import path from "node:path"
import process from "node:process"
import { exec } from "~/builder.ts"
import { Powershell } from "./shared.ts"

export default class Docker {
  static readonly DIVVUN_ACTIONS_PATH = path.resolve(
    import.meta.dirname + "/..",
  )

  static async isInContainer() {
    if (process.platform === "win32") {
      return await exists("C:\\actions") && await exists("C:\\workspace")
    }
    return await exists("/actions") && await exists("/workspace")
  }

  static async enterEnvironment(image: string, workingDir: string) {
    if (process.platform === "win32") {
      const dockerPath = await which("docker.exe")

      if (dockerPath == null) {
        throw new Error("Docker not found")
      }

      await exec(
        dockerPath,
        [
          "run",
          "--rm",
          "-it",
          "-v",
          `${workingDir}:C:\\workspace:ro`,
          "-v",
          `${Docker.DIVVUN_ACTIONS_PATH}:C:\\actions`,
          "-e",
          "_DIVVUN_ACTIONS_PLATFORM=windows",
          "-e",
          "_DIVVUN_ACTIONS_ENV=docker",
          image + ":latest",
          "pwsh.exe",
          `C:\\actions\\bin\\divvun-actions.ps1`,
          ...Deno.args,
        ],
      )
      return
    }

    await exec("docker", [
      "run",
      "--rm",
      "-it",
      "-v",
      `${workingDir}:/workspace:ro`,
      "-v",
      `${Docker.DIVVUN_ACTIONS_PATH}:/actions`,
      "-e",
      "_DIVVUN_ACTIONS_PLATFORM=linux",
      "-e",
      "_DIVVUN_ACTIONS_ENV=docker",
      image + ":latest",
      "bash",
      "-lic",
      `"/actions/bin/divvun-actions" ${Deno.args.join(" ")}`,
    ])
  }

  static async enterWorkspace() {
    const id = crypto.randomUUID()
    const volName = `workspace-${id}`
    const tmpDir = os.tmpdir()
    const imagePath = path.join(tmpDir, volName)

    await Deno.mkdir(imagePath)

    console.log("Copying workspace...")
    if (process.platform === "win32") {
      await Powershell.runScript(
        `Copy-Item -Path C:\\workspace\\* -Destination ${imagePath} -Recurse -Force`,
      )
    } else {
      await exec("rsync", ["-ar", "/workspace/", imagePath])
    }

    console.log(`Entering virtual workspace (${imagePath})...`)
    process.chdir(imagePath)

    return id
  }

  static async exitWorkspace(id: string) {
    const volName = `workspace-${id}`
    const tmpDir = os.tmpdir()
    const imagePath = path.join(tmpDir, volName)

    console.log(`Exiting virtual workspace (${imagePath})...`)
    process.chdir(os.homedir())

    console.log("Removing workspace...")
    await Deno.remove(imagePath, { recursive: true })
  }
}
