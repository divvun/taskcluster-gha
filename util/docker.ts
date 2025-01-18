import fs from "fs"
import os from "os"
import path from "path"
import { exec } from "~/builder"

export default class Docker {
  static readonly DIVVUN_ACTIONS_PATH = path.resolve(__dirname + "/..")

  static async isInContainer() {
    if (process.platform === "win32") {
      return fs.existsSync("C:\\actions") && fs.existsSync("C:\\workspace")
    }
    return fs.existsSync("/actions") && fs.existsSync("/workspace")
  }

  static async enterEnvironment(image: string, workingDir: string) {
    if (process.platform === "win32") {
      await exec("docker", [
        "run",
        "--rm",
        "-it",
        "-v",
        `${workingDir}:C:\\workspace:ro`,
        "-v",
        `${Docker.DIVVUN_ACTIONS_PATH}:C:\\actions`,
        image + ":latest",
        "pwsh.exe",
        `C:\\actions\\bin\\divvun-actions.ps1`,
        `${process.argv.slice(2).join(" ")}`,
      ])
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
      image + ":latest",
      "bash",
      "-lic",
      `"/actions/bin/divvun-actions" ${process.argv.slice(2).join(" ")}`,
    ])
  }

  static async enterWorkspace() {
    const id = crypto.randomUUID()
    const volName = `workspace-${id}`
    const tmpDir = os.tmpdir()
    const imagePath = path.join(tmpDir, volName)

    fs.mkdirSync(imagePath)

    console.log("Copying workspace...")
    if (process.platform === "win32") {
      await exec("pwsh", [
        "-Command",
        `"Copy-Item -Path C:\\workspace\\* -Destination ${imagePath} -Recurse -Force`,
      ])
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
    fs.rmSync(imagePath, { recursive: true, force: true })
  }
}
