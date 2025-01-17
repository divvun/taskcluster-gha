import fs from "fs"
import { exec } from "~/builder"

type TartStatus = {
  CPU: number
  Display: string
  OS: string
  Size: string
  Disk: number
  State: string
  Memory: number
  Running: boolean
}

export default class Tart {
  static readonly WORKSPACE_PATH = "/Volumes/My Shared Files/workspace"
  static readonly DIVVUN_ACTIONS_PATH =
    "/Volumes/My Shared Files/divvun-actions"

  static async run(vmName: string, dirs: Record<string, string> = {}) {
    if (await Tart.isRunning(vmName)) {
      await Tart.stop(vmName)
    }

    const dirsArg = Object.entries(dirs ?? {}).map(
      ([key, value]) => `--dir="${key}:${value}"`
    )

    // No await here because it runs forever...
    exec("tart", [
      "run",
      "--no-graphics",
      vmName,
      ...dirsArg,
    ])
  }

  static async stop(vmName: string) {
    await exec("tart", ["stop", vmName])
  }

  static async status(vmName: string) {
    let rawOutput = ""

    await exec("tart", ["get", vmName, "--format", "json"], {
      listeners: {
        stdout: (data) => {
          rawOutput += data.toString()
        },
      },
    })

    console.log(rawOutput)

    const output: TartStatus = JSON.parse(rawOutput)
    return output
  }

  static async isRunning(vmName: string) {
    const output = await this.status(vmName)
    return output.Running
  }

  static isInVirtualMachine() {
    return fs.existsSync(Tart.DIVVUN_ACTIONS_PATH)
  }

  static enterWorkspace() {
    process.chdir(Tart.WORKSPACE_PATH)
  }

  static ip(vmName: string) {
    let output = ""
    console.log("Getting IP...")

    return exec("tart", ["ip", vmName], {
      listeners: {
        stdout: (data) => {
          output += data.toString()
        },
      },
    }).then(() => {
      return output
    })
  }

  static async exec(vmName: string, line: string) {
    const ip = await this.ip(vmName)

    console.log("IP: " + ip)

    return await exec("sshpass", [
      "-p",
      "admin",
      "ssh",
      "-o",
      "StrictHostKeyChecking no",
      `admin@${ip}`,
      line,
    ])
  }
}
