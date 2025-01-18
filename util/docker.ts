import fs from "fs"
import path from "path"
import { exec } from "~/builder"

export default class Docker {
  static readonly DIVVUN_ACTIONS_PATH = path.resolve(__dirname + "/..")

  static async isInContainer() {
    return fs.existsSync("/actions") && fs.existsSync("/workspace")
  }

  static async enterEnvironment(image: string, workingDir: string) {
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
    const imagePath = `/tmp/${volName}`

    fs.mkdirSync(imagePath)

    console.log("Copying workspace...")
    await exec("rsync", ["-ar", "/workspace/", imagePath])

    console.log(`Entering virtual workspace (${imagePath})...`)
    process.chdir(imagePath)

    return id
  }

  static async exitWorkspace(id: string) {
    const volName = `workspace-${id}`
    const imagePath = `/tmp/${volName}`

    console.log(`Exiting virtual workspace (${imagePath})...`)
    process.chdir("/")

    console.log("Removing image...")
    fs.rmSync(imagePath, { recursive: true, force: true })
  }
}
