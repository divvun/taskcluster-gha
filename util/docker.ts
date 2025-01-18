import fs from "fs"
import path from "path"
import { exec } from "~/builder"

export default class Docker {
  static readonly DIVVUN_ACTIONS_PATH = path.resolve(__dirname + "/..")

//   await Tart.run("runner", {
//     workspace: realWorkingDir,
//     "divvun-actions": `${path.resolve(process.cwd())}:ro`,
//   })

  static async isInContainer() {
    return fs.existsSync("/actions") && fs.existsSync("/workspace")
  }

  static async enterEnvironment(image: string, workingDir: string) {
    await exec("docker", [
      "run",
      "--rm",
      "-v",
      `${workingDir}:/workspace:ro`,
      "-v",
      `${Docker.DIVVUN_ACTIONS_PATH}:/actions:ro`,
      image,
      `"/actions/bin/divvun-actions" ${process.argv.slice(2).join(" ")}`
    ])
  }
}
