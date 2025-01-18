import { makeInstaller } from "./lib.ts"

export type Props = {
  path: string
  defines?: string[]
}

export type Output = {
  installerPath: string
}

export default async function innoSetup(props: Props) {
  const { path, defines: rawDefines } = props

  let defines: string[] = []
  if (rawDefines != null) {
    defines = rawDefines.map((x) => `/D${x.trim()}`)
  }

  const installerOutput = await makeInstaller(path, defines)

  // Workaround for setOutput being dumb and perhaps adding ::set-output
  // without checking it has a new line to write one.
  console.log("Installer generated.\n\n")

  return {
    installerPath: installerOutput,
  }
}

// async function run() {
//   const issPath = await builder.getInput("path", { required: true })
//   const rawDefines = await builder.getInput("defines")

//   const { installerPath } = await innoSetup({
//     path: issPath,
//     defines: rawDefines.split(" "),
//   })

//   await builder.setOutput("installer-path", installerPath)
// }
