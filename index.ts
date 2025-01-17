#!/usr/bin/env node
import { Command } from "commander"
import PrettyError from "pretty-error"
import * as builder from "~/builder"
import { version } from "./package.json"

import deploy from "./actions/deploy"
import enableLanguages from "./actions/enable-languages"
import innoSetup from "./actions/inno-setup"
import keyboardBuild from "./actions/keyboard/build"
import keyboardBuildMeta from "./actions/keyboard/build-meta"
import keyboardDeploy from "./actions/keyboard/deploy"
import langInstallDeps from "./actions/lang/install-deps"
import pahkatInit from "./actions/pahkat/init"
import setup from "./actions/setup"
import spellerBundle from "./actions/speller/bundle"
import spellerDeploy from "./actions/speller/deploy"
import versionCmd from "./actions/version"

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

program
  .command("build")
  .description("Build the project")
  .option("-p, --platform <platform>", "target platform")
  .action((options) => {
    console.log("Building for platform:", options.platform)
    // Add your build logic here
  })

program
  .command("setup")
  .description("Setup the environment")
  .requiredOption("--divvun-key <key>", "Divvun key for authentication")
  .action(async (options) => {
    await setup({ divvunKey: options.divvunKey })
  })

program
  .command("version")
  .description("Version management")
  .option("--is-xcode", "Is Xcode project")
  .option("--is-nightly", "Is nightly build")
  .option("--cargo-toml <path>", "Path to Cargo.toml")
  .option("--speller-manifest <path>", "Path to speller manifest")
  .option("--plist-path <path>", "Path to plist file")
  .option("--csharp <path>", "Path to C# project")
  .option("--version-from-file <path>", "Get version from file")
  .option("--insta-stable", "Mark as stable")
  .option("--nightly-channel <channel>", "Nightly channel")
  .action(async (options) => {
    await versionCmd(options)
  })

program
  .command("speller-bundle")
  .description("Bundle speller")
  .requiredOption("--version <version>", "Version")
  .requiredOption("--speller-type <type>", "Speller type")
  .requiredOption("--manifest <path>", "Manifest path")
  .requiredOption("--speller-paths <paths...>", "Speller paths")
  .action(async (options) => {
    await spellerBundle(options)
  })

program
  .command("speller-deploy")
  .description("Deploy speller")
  .requiredOption("--speller-type <type>", "Speller type")
  .requiredOption("--manifest-path <path>", "Manifest path")
  .requiredOption("--payload-path <path>", "Payload path")
  .requiredOption("--version <version>", "Version")
  .requiredOption("--channel <channel>", "Channel")
  .option("--nightly-channel <channel>", "Nightly channel")
  .requiredOption("--pahkat-repo <repo>", "Pahkat repository")
  .action(async (options) => {
    await spellerDeploy(options)
  })

program
  .command("keyboard-build")
  .description("Build keyboard")
  .requiredOption("--keyboard-type <type>", "Keyboard type")
  .option("--nightly-channel <channel>", "Nightly channel")
  .requiredOption("--bundle-path <path>", "Bundle path")
  .action(async (options) => {
    await keyboardBuild(options)
  })

program
  .command("keyboard-deploy")
  .description("Deploy keyboard")
  .requiredOption("--payload-path <path>", "Payload path")
  .requiredOption("--keyboard-type <type>", "Keyboard type")
  .requiredOption("--bundle-path <path>", "Bundle path")
  .requiredOption("--channel <channel>", "Channel")
  .requiredOption("--pahkat-repo <repo>", "Pahkat repository")
  .requiredOption("--package-id <id>", "Package ID")
  .action(async (options) => {
    await keyboardDeploy(options)
  })

program
  .command("keyboard-build-meta")
  .description("Build keyboard metadata")
  .requiredOption("--keyboard-type <type>", "Keyboard type")
  .requiredOption("--bundle-path <path>", "Bundle path")
  .action(async (options) => {
    await keyboardBuildMeta(options)
  })

program
  .command("deploy")
  .description("Deploy package")
  .requiredOption("--package-id <id>", "Package ID")
  .requiredOption("--platform <platform>", "Platform")
  .requiredOption("--payload-path <path>", "Payload path")
  .option("--arch <arch>", "Architecture")
  .requiredOption("--channel <channel>", "Channel")
  .option("--dependencies <deps...>", "Dependencies")
  .requiredOption("--pahkat-repo <repo>", "Pahkat repository")
  .requiredOption("--version <version>", "Version")
  .action(async (options) => {
    await deploy(options)
  })

program
  .command("inno-setup")
  .description("Create Inno Setup installer")
  .action(async (options) => {
    await innoSetup(options)
  })

program
  .command("lang-install-deps")
  .description("Install language dependencies")
  .option("--requires-apertium", "Requires Apertium")
  .option("--requires-sudo", "Requires sudo")
  .action(async (options) => {
    await langInstallDeps(options)
  })

program
  .command("enable-languages")
  .description("Enable languages")
  .requiredOption("--tags <tags...>", "Language tags")
  .action(async (options) => {
    await enableLanguages(options)
  })

program
  .command("pahkat-init")
  .description("Initialize Pahkat")
  .requiredOption("--repo-url <url>", "Repository URL")
  .requiredOption("--channel <channel>", "Channel")
  .requiredOption("--packages <packages...>", "Packages")
  .action(async (options) => {
    await pahkatInit(options)
  })

program.parse()
