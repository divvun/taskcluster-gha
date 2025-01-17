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
      ([key, value]) => `--dir=${key}:${value}`
    )

    return new Promise((resolve, reject) => {
      const args = ["run", "--no-graphics", vmName, ...dirsArg]
      console.log(args)

      // No await here because it runs forever...
      exec("tart", args)
        .then((x) => {
          if (x !== 0) {
            reject(new Error("Failed to run VM (error code " + x + ")"))
          }
        })
        .catch((e) => {
          reject(e)
        })

      console.log("Waiting for VM to start...")

      const waiter = async () => {
        while (!(await Tart.isRunning(vmName))) {
          await new Promise((r) => setTimeout(r, 250))
        }
        resolve(undefined)
      }

      waiter()
    })
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

    const output: TartStatus = JSON.parse(rawOutput)
    console.log(output)
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
    console.log("Entering virtual workspace (" + Tart.WORKSPACE_PATH + ")...")
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
      console.log("IP: " + output)
      return output.trim()
    })
  }

  static async exec(vmName: string, cmd: string) {
    const ip = await this.ip(vmName)

    console.log("Running command (" + cmd + ")...")
    const args = [
      "-p",
      "admin",
      "ssh",
      "-o",
      "StrictHostKeyChecking no",
      `admin@${ip}`,
      "<<EOF",
      `\n${cmd}\n`,
      "EOF",
    ]
    console.log("Args", args)
    return await exec("sshpass", args)
  }
}
