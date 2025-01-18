import * as path from "@std/path"
import * as builder from "~/builder.ts"
import { Bash } from "~/util/shared.ts"

class Autotools {
  private directory: string

  constructor(directory: string) {
    this.directory = directory
  }

  async makeBuildDir() {
    await Bash.runScript("mkdir -p build", { cwd: this.directory })
  }

  async runAutogen() {
    await Bash.runScript("./autogen.sh", { cwd: this.directory })
  }

  async runConfigure(flags: string[]) {
    await Bash.runScript(`../configure ${flags.join(" ")}`, {
      cwd: path.join(this.directory, "build"),
    })
  }

  async runMake() {
    await Bash.runScript("make -j$(nproc)", {
      cwd: path.join(this.directory, "build"),
    })
  }

  async build(flags: string[]) {
    await this.makeBuildDir()
    await this.runAutogen()
    await this.runConfigure(flags)
    await this.runMake()
  }
}

// async function deriveInputs(inputs: string[]): Promise<{ [key: string]: any }> {
//   const o: { [key: string]: any } = {}

//   for (const kebabInput of inputs) {
//     const value: any = await builder.getInput(kebabInput)
//     const input = camelCase(kebabInput)

//     console.log(input, value)

//     if (typeof value === "string") {
//       if (value.includes(",")) {
//         o[input] = value.split(",").map((x) => x.trim())
//       } else if (value === "false") {
//         o[input] = false
//       } else if (value === "true") {
//         o[input] = true
//       } else if (value === "") {
//         // Do nothing.
//       } else {
//         o[input] = value
//       }
//     }
//   }

//   return o
// }

export type Props = {
  requiresDesktopAsMobileWorkaround: boolean
  fst: string[]
  generators: boolean
  spellers: boolean
  hyphenators: boolean
  analysers: boolean
  grammarCheckers: boolean
  hyperminimalisation: boolean
  reversedIntersect: boolean
  twoStepIntersect: boolean
  spellerOptimisation: boolean
  backendFormat: string | null
  minimisedSpellers: boolean
  forceAllTools: boolean
}

export type Output = {
  spellerPaths: {
    mobile: {
      [key: string]: string
    }
    desktop: {
      [key: string]: string
    }
  } | null
}

export default async function langBuild({
  requiresDesktopAsMobileWorkaround,
  ...config
}: Props): Promise<Output> {
  const githubWorkspace = builder.context.workspace

  if (githubWorkspace == null) {
    builder.setFailed("GITHUB_WORKSPACE not set, failing.")
    throw new Error("GITHUB_WORKSPACE not set, failing.")
  }

  console.log(JSON.stringify(config, null, 2))

  const flags = [
    "--without-forrest",
    "--disable-silent-rules",
    "--without-xfst",
  ]

  // General configuration

  if (config.fst.includes("foma")) {
    flags.push("--with-foma")
  }

  if (!config.fst.includes("hfst")) {
    flags.push("--without-hfst")
  }

  if (config.generators) {
    flags.push("--enable-generators")
  }

  if (!config.analysers) {
    flags.push("--disable-analysers")
    flags.push("--disable-generators")
    flags.push("--disable-transcriptors")
  }

  if (config.hyphenators) {
    flags.push("--enable-fst-hyphenator")
  }

  if (config.spellers || config.grammarCheckers) {
    flags.push("--enable-spellers")
    flags.push("--disable-hfst-desktop-spellers")
    flags.push("--enable-hfst-mobile-speller")
  }

  if (config.grammarCheckers) {
    flags.push("--enable-grammarchecker")
  }

  // Language-specific optimisations

  if (config.hyperminimalisation) {
    flags.push("--enable-hyperminimalisation")
  }

  if (config.reversedIntersect) {
    flags.push("--enable-reversed-intersect")
  }

  if (config.twoStepIntersect) {
    flags.push("--enable-twostep-intersect")
  }

  if (config.backendFormat) {
    flags.push(`--with-backend-format=${config.backendFormat}`)
  }

  if (config.minimisedSpellers) {
    flags.push("--enable-minimised-spellers")
  }

  // Begin build

  builder.startGroup("Build giella-core and giella-shared")
  await Bash.runScript("./autogen.sh && ./configure && make", {
    cwd: path.join(githubWorkspace, "giella-core"),
  })
  await Bash.runScript("./autogen.sh && ./configure && make", {
    cwd: path.join(githubWorkspace, "giella-shared"),
  })
  builder.endGroup()

  const autotoolsBuilder = new Autotools(path.join(githubWorkspace, "lang"))

  builder.debug(`Flags: ${flags}`)
  await autotoolsBuilder.build(flags)

  await Bash.runScript("ls -lah build/tools/spellcheckers/", {
    cwd: path.join(githubWorkspace, "lang"),
  })

  if (config.spellers) {
    // Glob the zhfst files made available in the spellcheckers directory.
    // Associate their prefixes as their lang code.
    const out: {
      mobile: { [key: string]: string }
      desktop: { [key: string]: string }
    } = {
      mobile: {},
      desktop: {},
    }

    const globber = await builder.globber(
      path.join(githubWorkspace, "lang/build/tools/spellcheckers/*.zhfst"),
      {
        followSymbolicLinks: false,
      },
    )
    const files = await globber.glob()

    let hasSomeItems = false

    for (const candidate of files) {
      if (candidate.endsWith("-mobile.zhfst")) {
        const v = path.basename(candidate).split("-mobile.zhfst")[0]
        out.mobile[v] = path.basename(path.resolve(candidate))
        hasSomeItems = true
      }

      if (candidate.endsWith("-desktop.zhfst")) {
        const v = path.basename(candidate).split("-desktop.zhfst")[0]
        out.desktop[v] = path.basename(path.resolve(candidate))
        hasSomeItems = true
      }
    }

    if (!hasSomeItems) {
      throw new Error("Did not find any ZHFST files.")
    }

    if (requiresDesktopAsMobileWorkaround) {
      builder.warning(
        "WORKAROUND: FORCING DESKTOP SPELLERS AS MOBILE SPELLERS.",
      )
      for (const [key, value] of Object.entries(out.desktop)) {
        if (out.mobile[key] == null) {
          out.mobile[key] = value
        }
      }
    }

    console.log("Saving speller-paths")

    console.log("Setting speller paths to:")
    console.log(JSON.stringify(out, null, 2))

    return {
      spellerPaths: out,
    }
  } else {
    console.log("Not setting speller paths.")
  }

  return { spellerPaths: null }
}

// async function run() {
//   const requiresDesktopAsMobileWorkaround = Boolean(
//     await builder.getInput("force-desktop-spellers-as-mobile"),
//   )

//   const config = await deriveInputs([
//     "fst",
//     "generators",
//     "spellers",
//     "hyphenators",
//     "analysers",
//     "grammar-checkers",
//     "hyperminimalisation",
//     "reversed-intersect",
//     "two-step-intersect",
//     "speller-optimisation",
//     "backend-format",
//     "force-all-tools",
//     "minimised-spellers",
//   ])

//   const props = {
//     requiresDesktopAsMobileWorkaround,
//     ...config,
//   } as Props

//   const { spellerPaths: out } = await langBuild(props)

//   if (out != null) {
//     await builder.setOutput("speller-paths", JSON.stringify(out, null, 0))
//   }
// }
