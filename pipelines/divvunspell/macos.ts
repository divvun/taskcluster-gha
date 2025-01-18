import doCodesign from "~/actions/codesign/index"
import createTxz from "~/actions/create-txz/index"
import doDeploy, { PackageType } from "~/actions/deploy/index"
import pahkatInit from "~/actions/pahkat/init/index"
import doSetup from "~/actions/setup/index"
import getVersion from "~/actions/version/index"
import { exec } from "~/builder"
import { Bash } from "~/util/shared"

const TARGETS = ["x86_64-apple-darwin", "aarch64-apple-darwin"]

export type Step = "setup" | "build" | "codesign" | "tarball" | "deploy"

type Context = {}
type Props = { divvunKey: string; skipSetup?: boolean; skipSigning?: boolean }
type DivvunSpellProps<T = any> = PipelineProps<Props & T>

type PipelineProps<T> = {
  context: Context
  secrets: Record<string, any>
  inputs: T
}

const DEPENDS_ON: Map<Function, Function[]> = new Map([
  [setup as any, []],
  [build, [setup]],
  [codesign, [build]],
  [tarball, [codesign]],
  [deploy, [tarball]],
])

const STEPS: Map<string, any> = new Map([
  ["setup", setup as any],
  ["build", build],
  ["codesign", codesign],
  ["tarball", tarball],
  ["deploy", deploy],
])

function recurseDependsOn(
  input: Function,
) {
  let out: Function[] = [input]

  function inner(
    input: Function,
    out: Function[] = []
  ) {
    for (const dep of DEPENDS_ON.get(input) ?? []) {
      out.push(dep)
      inner(dep, out)
    }
  }

  out.reverse()

  return out
}

export default async function run(
  step: Step,
  inputs: Props,
  options: {
    ignoreDependencies?: boolean
  } = {}
) {
  let steps
  if (options.ignoreDependencies) {
    steps = [STEPS.get(step)!]
  } else {
    steps = recurseDependsOn(STEPS.get(step)!)
  }

  let output: any | undefined = inputs
  for (const step of steps) {
    output = await step({
      context: {},
      secrets: {},
      inputs: { ...inputs, ...output },
    })
  }
}

async function setup({ inputs: { divvunKey, skipSetup } }: DivvunSpellProps) {
  if (skipSetup) {
    return
  }

  // Setup environment
  await doSetup({ divvunKey })
}

async function build(_: DivvunSpellProps) {
  // Build
  for (const target of TARGETS) {
    await exec("cargo", [
      "build",
      "--release",
      "--lib",
      "--features",
      "compression,internal_ffi",
      "--target",
      target,
    ])
  }
}

async function codesign(props: DivvunSpellProps) {
  if (props.inputs.skipSigning) {
    return
  }

  for (const target of TARGETS) {
    await doCodesign({
      filePath: `target/${target}/release/libdivvunspell.dylib`,
    })
  }
}

async function tarball(_: DivvunSpellProps) {
  await Bash.runScript([
    "mkdir -p dist/lib/aarch64",
    "mkdir -p dist/lib/x86_64",
    "mv target/aarch64-apple-darwin/release/libdivvunspell.dylib dist/lib/aarch64",
    "mv target/x86_64-apple-darwin/release/libdivvunspell.dylib dist/lib/x86_64",
  ])

  // Derive version
  const { txzPath } = await createTxz({
    filesPath: "dist",
  })

  return { txzPath }
}

async function deploy({
  inputs: { txzPath },
}: DivvunSpellProps<{ txzPath: string }>) {
  const { channel, version } = await getVersion({
    cargoToml: "divvunspell/Cargo.toml",
  })

  // Install required dependencies
  await pahkatInit({
    repoUrl: "https://pahkat.uit.no",
    channel: null,
    packages: ["pahkat-uploader"],
  })

  await doDeploy({
    packageId: "divvunspell",
    packageType: PackageType.TarballPackage,
    platform: "macos",
    payloadPath: txzPath,
    version,
    channel,
    pahkatRepo: "https://pahkat.uit.no/devtools/",
    arch: null,
    dependencies: null,
  })
}
