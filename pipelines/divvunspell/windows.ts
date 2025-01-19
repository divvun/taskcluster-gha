// deno-lint-ignore-file no-explicit-any ban-types
import createTxz from "~/actions/create-txz.ts"
import doDeploy, { PackageType } from "~/actions/deploy.ts"
import pahkatInit from "~/actions/pahkat/init.ts"
import getVersion from "~/actions/version.ts"
import * as builder from "~/builder.ts"
import { Bash } from "~/util/shared.ts"

const TARGETS = ["x86_64-pc-windows-msvc"]

export type Step = "build" | "tarball" | "deploy"

type Context = {}
type Props = { divvunKey: string; skipSetup?: boolean }
type DivvunSpellProps<T = any> = PipelineProps<Props & T>

type PipelineProps<T> = {
  context: Context
  secrets: Record<string, any>
  inputs: T
}

const DEPENDS_ON: Map<Function, Function[]> = new Map([
  [build as any, []],
  [tarball, [build]],
  [deploy, [tarball]],
])

const STEPS: Map<string, any> = new Map([
  ["build", build as any],
  ["tarball", tarball],
  ["deploy", deploy],
])

function recurseDependsOn(
  input: Function,
) {
  const out: Function[] = [input]

  function inner(
    input: Function,
    out: Function[] = [],
  ) {
    for (const dep of DEPENDS_ON.get(input) ?? []) {
      out.push(dep)
      inner(dep, out)
    }
  }

  inner(input, out)

  out.reverse()

  return out
}

export default async function run(
  step: Step,
  inputs: Props,
  options: {
    ignoreDependencies?: boolean
  } = {},
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

async function build(_: DivvunSpellProps) {
  // Build
  for (const target of TARGETS) {
    await builder.group(`Building ${target}`, async () => {
      await builder.exec("cargo", [
        "--color",
        "always",
        "build",
        "--release",
        "--lib",
        //   "--features",
        //   "compression,internal_ffi",
        "--target",
        target,
      ])
    })
  }
}

async function tarball(_: DivvunSpellProps) {
  await Bash.runScript([
    "mkdir -p dist/lib/aarch64",
    "mv target/aarch64-unknown-linux-gnu/release/libdivvunspell.so dist/lib/aarch64",
    "mkdir -p dist/lib/x86_64",
    "mv target/x86_64-unknown-linux-gnu/release/libdivvunspell.so dist/lib/x86_64",
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
    platform: "linux",
    payloadPath: txzPath,
    version,
    channel,
    pahkatRepo: "https://pahkat.uit.no/devtools/",
    arch: "x86_64",
    dependencies: null,
  })
}
