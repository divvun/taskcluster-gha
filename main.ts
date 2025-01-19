// deno-lint-ignore-file no-explicit-any

import { Command } from "commander"
import * as builder from "~/builder.ts"
// import { version } from "./package.json" with { "type": "json" };

import divvunspellLinux from "./pipelines/divvunspell/linux.ts"
import divvunspellMacos from "./pipelines/divvunspell/macos.ts"
import divvunspellWindows from "./pipelines/divvunspell/windows.ts"
import Docker from "./util/docker.ts"
import Tart from "./util/tart.ts"

function prettyPlatform() {
  switch (Deno.build.os) {
    case "darwin":
      return "macos"
    case "windows":
      return "windows"
    case "linux":
      return "linux"
    default:
      return `unsupported: ${Deno.build.os}`
  }
}

console.log(
  `Loading Divvun Actions [Mode: ${builder.mode}] [Env: ${
    Deno.env.get("_DIVVUN_ACTIONS_ENV")
  }] [Platform: ${prettyPlatform()}]`,
)

const program = new Command()

program
  .name("divvun-actions")
  .description("CLI for Divvun Actions")
// .version(version)

// program
//   .command("build")
//   .description("Build the project")
//   .option("-p, --platform <platform>", "target platform")
//   .action((options) => {
//     console.log("Building for platform:", options.platform)
//     // Add your build logic here
//   })

// program
//   .command("setup")
//   .description("Setup the environment")
//   .requiredOption("--divvun-key <key>", "Divvun key for authentication")
//   .action(async (options) => {
//     await setup({ divvunKey: options.divvunKey })
//   })

// program
//   .command("version")
//   .description("Version management")
//   .option("--is-xcode", "Is Xcode project")
//   .option("--is-nightly", "Is nightly build")
//   .option("--cargo-toml <path>", "Path to Cargo.toml")
//   .option("--speller-manifest <path>", "Path to speller manifest")
//   .option("--plist-path <path>", "Path to plist file")
//   .option("--csharp <path>", "Path to C# project")
//   .option("--version-from-file <path>", "Get version from file")
//   .option("--insta-stable", "Mark as stable")
//   .option("--nightly-channel <channel>", "Nightly channel")
//   .action(async (options) => {
//     await versionCmd(options)
//   })

// program
//   .command("speller-bundle")
//   .description("Bundle speller")
//   .requiredOption("--version <version>", "Version")
//   .requiredOption("--speller-type <type>", "Speller type")
//   .requiredOption("--manifest <path>", "Manifest path")
//   .requiredOption("--speller-paths <paths...>", "Speller paths")
//   .action(async (options) => {
//     await spellerBundle(options)
//   })

// program
//   .command("speller-deploy")
//   .description("Deploy speller")
//   .requiredOption("--speller-type <type>", "Speller type")
//   .requiredOption("--manifest-path <path>", "Manifest path")
//   .requiredOption("--payload-path <path>", "Payload path")
//   .requiredOption("--version <version>", "Version")
//   .requiredOption("--channel <channel>", "Channel")
//   .option("--nightly-channel <channel>", "Nightly channel")
//   .requiredOption("--pahkat-repo <repo>", "Pahkat repository")
//   .action(async (options) => {
//     await spellerDeploy(options)
//   })

// program
//   .command("keyboard-build")
//   .description("Build keyboard")
//   .requiredOption("--keyboard-type <type>", "Keyboard type")
//   .option("--nightly-channel <channel>", "Nightly channel")
//   .requiredOption("--bundle-path <path>", "Bundle path")
//   .action(async (options) => {
//     await keyboardBuild(options)
//   })

// program
//   .command("keyboard-deploy")
//   .description("Deploy keyboard")
//   .requiredOption("--payload-path <path>", "Payload path")
//   .requiredOption("--keyboard-type <type>", "Keyboard type")
//   .requiredOption("--bundle-path <path>", "Bundle path")
//   .requiredOption("--channel <channel>", "Channel")
//   .requiredOption("--pahkat-repo <repo>", "Pahkat repository")
//   .requiredOption("--package-id <id>", "Package ID")
//   .action(async (options) => {
//     await keyboardDeploy(options)
//   })

// program
//   .command("keyboard-build-meta")
//   .description("Build keyboard metadata")
//   .requiredOption("--keyboard-type <type>", "Keyboard type")
//   .requiredOption("--bundle-path <path>", "Bundle path")
//   .action(async (options) => {
//     await keyboardBuildMeta(options)
//   })

// program
//   .command("deploy")
//   .description("Deploy package")
//   .requiredOption("--package-id <id>", "Package ID")
//   .requiredOption("--platform <platform>", "Platform")
//   .requiredOption("--payload-path <path>", "Payload path")
//   .option("--arch <arch>", "Architecture")
//   .requiredOption("--channel <channel>", "Channel")
//   .option("--dependencies <deps...>", "Dependencies")
//   .requiredOption("--pahkat-repo <repo>", "Pahkat repository")
//   .requiredOption("--version <version>", "Version")
//   .action(async (options) => {
//     await deploy(options)
//   })

// program
//   .command("inno-setup")
//   .description("Create Inno Setup installer")
//   .action(async (options) => {
//     await innoSetup(options)
//   })

// program
//   .command("lang-install-deps")
//   .description("Install language dependencies")
//   .option("--requires-apertium", "Requires Apertium")
//   .option("--requires-sudo", "Requires sudo")
//   .action(async (options) => {
//     await langInstallDeps(options)
//   })

// program
//   .command("enable-languages")
//   .description("Enable languages")
//   .requiredOption("--tags <tags...>", "Language tags")
//   .action(async (options) => {
//     await enableLanguages(options)
//   })

// program
//   .command("pahkat-init")
//   .description("Initialize Pahkat")
//   .requiredOption("--repo-url <url>", "Repository URL")
//   .requiredOption("--channel <channel>", "Channel")
//   .requiredOption("--packages <packages...>", "Packages")
//   .action(async (options) => {
//     await pahkatInit(options)
//   })

const divvunspell = program
  .command("divvunspell")
  .description("Run divvunspell pipeline tasks")
  .requiredOption("--platform <platform>", "Target platform (macos, linux)")

divvunspell
  .command("build")
  .description("Build divvunspell")
  .option("--divvun-key <key>", "Divvun key for authentication")
  .option("--skip-setup", "Skip setup step")
  .option("--ignore-dependencies", "Ignore step dependencies", false)
  .action(
    async (
      options: { divvunKey: any; skipSetup: any; ignoreDependencies: any },
    ) => {
      const { divvunKey, skipSetup, ignoreDependencies } = options
      const platform = divvunspell.opts().platform.toLowerCase()
      const props = { divvunKey, skipSetup, ignoreDependencies }

      await enterEnvironment(platform, async () => {
        switch (platform) {
          case "macos":
            await divvunspellMacos("build", props, {
              ignoreDependencies,
            })
            break
          case "linux":
            await divvunspellLinux("tarball", props, {
              // ignoreDependencies,
            })
            break
          case "windows":
            await divvunspellWindows("build", props, {
              ignoreDependencies,
            })
            break
          default:
            console.error("Unsupported platform. Use 'macos' or 'linux'")
            Deno.exit(1)
        }
      })
    },
  )

divvunspell
  .command("setup")
  .description("Run setup step")
  .option("-k, --divvun-key <key>", "Divvun key for signing")
  .option("--skip-setup", "Skip setup step", false)
  .option("--skip-signing", "Skip signing step", false)
  .option("--ignore-dependencies", "Ignore step dependencies", false)
  .action(
    async (
      options: {
        divvunKey: any
        skipSetup: any
        skipSigning: any
        ignoreDependencies: any
      },
    ) => {
      await divvunspellMacos(
        "setup",
        {
          divvunKey: options.divvunKey,
          skipSetup: options.skipSetup,
          skipSigning: options.skipSigning,
        },
        {
          ignoreDependencies: options.ignoreDependencies,
        },
      )
    },
  )

divvunspell
  .command("codesign")
  .description("Run codesign step")
  .option("-k, --divvun-key <key>", "Divvun key for signing")
  .option("--skip-setup", "Skip setup step", false)
  .option("--skip-signing", "Skip signing step", false)
  .option("--ignore-dependencies", "Ignore step dependencies", false)
  .action(
    async (
      options: {
        divvunKey: any
        skipSetup: any
        skipSigning: any
        ignoreDependencies: any
      },
    ) => {
      await divvunspellMacos(
        "codesign",
        {
          divvunKey: options.divvunKey,
          skipSetup: options.skipSetup,
          skipSigning: options.skipSigning,
        },
        {
          ignoreDependencies: options.ignoreDependencies,
        },
      )
    },
  )

divvunspell
  .command("tarball")
  .description("Run tarball step")
  .option("-k, --divvun-key <key>", "Divvun key for signing")
  .option("--skip-setup", "Skip setup step", false)
  .option("--skip-signing", "Skip signing step", false)
  .option("--ignore-dependencies", "Ignore step dependencies", false)
  .action(
    async (
      options: {
        divvunKey: any
        skipSetup: any
        skipSigning: any
        ignoreDependencies: any
      },
    ) => {
      await divvunspellMacos(
        "tarball",
        {
          divvunKey: options.divvunKey,
          skipSetup: options.skipSetup,
          skipSigning: options.skipSigning,
        },
        {
          ignoreDependencies: options.ignoreDependencies,
        },
      )
    },
  )

async function enterEnvironment(
  platform: string,
  callback: () => Promise<void>,
) {
  const workingDir = Deno.env.get("_DIVVUN_ACTIONS_PWD")!
  let id: string | undefined = undefined

  switch (platform) {
    case "macos": {
      if (Deno.build.os === "darwin") {
        const isInVirtualMachine = Tart.isInVirtualMachine()

        if (!isInVirtualMachine) {
          await Tart.enterVirtualMachine(workingDir)
          return
        }

        id = await Tart.enterWorkspace()
      } else {
        throw new Error(`Unsupported platform: ${platform}`)
      }
      break
    }
    case "linux":
    case "windows": {
      const isInContainer = await Docker.isInContainer()

      if (!isInContainer) {
        console.log("Running divvun-actions...")
        console.log(`Working directory: ${workingDir}`)
        await Docker.enterEnvironment("divvun-actions", workingDir)
        return
      } else {
        id = await Docker.enterWorkspace()
      }
      break
    }
    default:
      console.error(`Unsupported platform: ${platform}`)
      Deno.exit(1)
  }

  try {
    await callback()
  } catch (e) {
    console.error(e)
  }

  switch (platform) {
    case "macos": {
      if (id) {
        await Tart.exitWorkspace(id)
      }
      break
    }
    case "linux":
    case "windows": {
      if (id) {
        await Docker.exitWorkspace(id)
      }
      break
    }
  }
}

async function localMain() {
  const realWorkingDir = Deno.env.get("_DIVVUN_ACTIONS_PWD")

  if (realWorkingDir == null) {
    console.error("main.ts cannot be run directly.")
    Deno.exit(1)
  }

  await program.parseAsync(Deno.args)
}

function delay(timeout: number) {
  return new Promise((resolve) => setTimeout(resolve, timeout))
}

async function main() {
  // builder.startGroup("hello")
  // const secrets = await builder.secrets()
  // console.log(secrets)
  // builder.error("oh my")
  // await delay(500)
  // builder.warning("less oh my")
  // console.log("1")
  // console.log("2")
  // console.log("3")
  // await delay(500)
  // console.log("4")
  // console.log("5")
  // await delay(1000)
  // console.log("example ends in 2 seconds")
  // await delay(2000)
  // builder.endGroup()

  // await delay(500)
  // console.log("Group is now closed!")

  builder.setMaxLines(-1)

  switch (builder.mode) {
    case "local": {
      await localMain()
      return
    }
    default:
      throw new Error(`Unknown mode: ${builder.mode}`)
  }
}

main()
  .then(() => Deno.exit(0))
  .catch((e) => {
    console.error(e)
    Deno.exit(1)
  })
