import path from "path"
import { exec } from "~/builder"

export default class Docker {
  static readonly DIVVUN_ACTIONS_PATH = path.resolve(__dirname + "/..")

//   await Tart.run("runner", {
//     workspace: realWorkingDir,
//     "divvun-actions": `${path.resolve(process.cwd())}:ro`,
//   })

  static async enterEnvironment(image: string, cmd: string) {
    await exec("docker", [
      "run",
      "--rm",
      "-v",
      `${process.cwd()}:/workspace:ro`,
      "-v",
      `${Docker.DIVVUN_ACTIONS_PATH}:/actions:ro`,
      image,
      cmd,
    ])
  }
}
