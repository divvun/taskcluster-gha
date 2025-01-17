#!/usr/bin/env node

import path from "path"

import { Command } from "commander"
import PrettyError from "pretty-error"
import * as builder from "~/builder"
import { version } from "./package.json"

import divvunspellMacos from "./pipelines/divvunspell/macos"
import Tart from "./util/tart"

const pe = new PrettyError()
pe.skipNodeFiles()
pe.skipPackage("commander")
pe.skip((x) => {
  return x.what === "Command.<anonymous>"
})

const program = new Command()

console.log("Environment: " + builder.mode)

process.on("unhandledRejection", (err: Error) => {
  console.error(pe.render(err))
  process.exit(1)
})

program
  .name("divvun-actions")
  .description("CLI for Divvun Actions")
  .version(version)

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

divvunspell
  .command("setup")
  .description("Run setup step")
  .option("-k, --divvun-key <key>", "Divvun key for signing")
  .option("--skip-setup", "Skip setup step", false)
  .option("--skip-signing", "Skip signing step", false)
  .option("--ignore-dependencies", "Ignore step dependencies", false)
  .action(async (options) => {
    await divvunspellMacos(
      "setup",
      {
        divvunKey: options.divvunKey,
        skipSetup: options.skipSetup,
        skipSigning: options.skipSigning,
      },
      {
        ignoreDependencies: options.ignoreDependencies,
      }
    )
  })

divvunspell
  .command("build")
  .description("Run build step")
  .option("-k, --divvun-key <key>", "Divvun key for signing")
  .option("--skip-setup", "Skip setup step", false)
  .option("--skip-signing", "Skip signing step", false)
  .option("--ignore-dependencies", "Ignore step dependencies", false)
  .action(async (options) => {
    await divvunspellMacos(
      "build",
      {
        divvunKey: options.divvunKey,
        skipSetup: options.skipSetup,
        skipSigning: options.skipSigning,
      },
      {
        ignoreDependencies: options.ignoreDependencies,
      }
    )
  })

divvunspell
  .command("codesign")
  .description("Run codesign step")
  .option("-k, --divvun-key <key>", "Divvun key for signing")
  .option("--skip-setup", "Skip setup step", false)
  .option("--skip-signing", "Skip signing step", false)
  .option("--ignore-dependencies", "Ignore step dependencies", false)
  .action(async (options) => {
    await divvunspellMacos(
      "codesign",
      {
        divvunKey: options.divvunKey,
        skipSetup: options.skipSetup,
        skipSigning: options.skipSigning,
      },
      {
        ignoreDependencies: options.ignoreDependencies,
      }
    )
  })

divvunspell
  .command("tarball")
  .description("Run tarball step")
  .option("-k, --divvun-key <key>", "Divvun key for signing")
  .option("--skip-setup", "Skip setup step", false)
  .option("--skip-signing", "Skip signing step", false)
  .option("--ignore-dependencies", "Ignore step dependencies", false)
  .action(async (options) => {
    await divvunspellMacos(
      "tarball",
      {
        divvunKey: options.divvunKey,
        skipSetup: options.skipSetup,
        skipSigning: options.skipSigning,
      },
      {
        ignoreDependencies: options.ignoreDependencies,
      }
    )
  })

async function localMain() {
  const realWorkingDir = process.env._DIVVUN_ACTIONS_PWD

  if (realWorkingDir == null) {
    console.error("index.ts cannot be run directly.")
    process.exit(1)
  }

  if (process.platform === "darwin") {
    const isInVirtualMachine = Tart.isInVirtualMachine()

    if (isInVirtualMachine) {
      Tart.enterWorkspace()
    } else {
      console.log("Moving into virtualised environment...")
      await Tart.run("runner", {
        workspace: realWorkingDir,
        "divvun-actions": `${path.resolve(process.cwd())}:ro`,
      })

      console.log("Running divvun-actions...")

      const cmd = `cd "${Tart.WORKSPACE_PATH}"; "${
        Tart.DIVVUN_ACTIONS_PATH
      }/bin/divvun-actions" "${process.argv.slice(2).join(" ")}"`
      console.log(cmd)

      await Tart.exec("runner", cmd)
      return
    }
  } else {
    process.chdir(realWorkingDir)
  }
}

async function main() {
  switch (builder.mode) {
    case "local": {
      await localMain()
      break
    }
    default:
      throw new Error(`Unknown mode: ${builder.mode}`)
  }

  program.parse()
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
