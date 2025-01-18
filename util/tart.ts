import * as fs from "@std/fs"
import * as path from "@std/path"
import { exec, spawn } from "~/builder.ts"

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
      ([key, value]) => `--dir=${key}:${value}`,
    )

    const args = ["tart", "run", "--no-graphics", vmName, ...dirsArg]

    // No await here because it runs forever...
    const proc = await spawn("nohup", args, {
      silent: true,
    })

    console.log("Waiting for VM to start...")

    return new Promise((resolve, _) => {
      const waiter = async () => {
        while (!(await Tart.isRunning(vmName))) {
          await new Promise((r) => setTimeout(r, 250))
        }
        proc.kill("SIGHUP")
        resolve(undefined)
      }

      waiter()
    })
  }

  static async stop(vmName: string) {
    await exec("tart", ["stop", vmName])

    return new Promise((resolve, _) => {
      const waiter = async () => {
        while (await Tart.isRunning(vmName)) {
          await new Promise((r) => setTimeout(r, 250))
        }
        resolve(undefined)
      }

      waiter()
    })
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
    // console.log(output)
    return output
  }

  static async isRunning(vmName: string) {
    const output = await this.status(vmName)
    return output.Running
  }

  static isInVirtualMachine() {
    return fs.existsSync(Tart.DIVVUN_ACTIONS_PATH)
  }

  static async enterVirtualMachine(realWorkingDir: string) {
    console.log("Moving into virtualised environment...")

    await Tart.run("runner", {
      workspace: realWorkingDir,
      "divvun-actions": `${path.resolve(Deno.cwd())}:ro`,
    })

    console.log("Running divvun-actions...")
    const cmd = `
      "${Tart.DIVVUN_ACTIONS_PATH}/bin/divvun-actions" ${Deno.args.join(" ")}
    `

    await Tart.exec("runner", cmd)
  }

  static async enterWorkspace() {
    const id = crypto.randomUUID()
    const volName = `workspace-${id}`
    const imagePath = `/tmp/${volName}.sparseimage`

    console.log("Creating sparse image at " + imagePath)
    await exec("hdiutil", [
      "create",
      "-type",
      "SPARSE",
      "-size",
      "100g",
      "-fs",
      "APFS",
      "-volname",
      volName,
      imagePath,
    ])

    console.log("Attaching image...")
    await exec("hdiutil", ["attach", imagePath], {
      silent: true,
    })

    console.log("Copying workspace...")
    await exec("ditto", [Tart.WORKSPACE_PATH, `/Volumes/${volName}`])

    console.log(`Entering virtual workspace (/Volumes/${volName})...`)
    Deno.chdir(`/Volumes/${volName}`)

    return id
  }

  static async exitWorkspace(id: string) {
    console.log("Leaving virtual workspace...")
    Deno.chdir("/")

    const volName = `workspace-${id}`
    const imagePath = `/tmp/${volName}.sparseimage`

    console.log("Copying workspace...")
    await exec("ditto", [`/Volumes/${volName}`, Tart.WORKSPACE_PATH])

    console.log("Detaching image...")
    await exec("hdiutil", ["detach", `/Volumes/${volName}`])

    console.log("Deleting image...")
    await Deno.remove(imagePath)
  }

  static ip(vmName: string) {
    let output = ""
    console.log("Getting virtual machine's IP...")

    return exec("tart", ["ip", vmName], {
      listeners: {
        stdout: (data) => {
          output += data.toString()
        },
      },
    }).then(() => {
      // console.log("IP: " + output)
      return output.trim()
    })
  }

  static async exec(vmName: string, cmd: string) {
    const ip = await this.ip(vmName)

    console.log("Running action...")
    const args = [
      "-p",
      "admin",
      "ssh",
      "-o",
      "StrictHostKeyChecking no",
      `admin@${ip}`,
      "zsh -l",
      "<<< '",
      `\n${cmd}\n`,
      "'",
    ]
    // console.log("Args", args)
    return await exec("sshpass", args)
  }
}
