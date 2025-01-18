import * as builder from "~/builder.ts"
import { Kbdgen } from "~/util/shared.ts"
import { KeyboardType } from "../types.ts"

export type Props = {
  keyboardType: KeyboardType
  bundlePath: string
}

export type Output = {
  payloadPath: string
}

export default async function keyboardBuildMeta({
  keyboardType,
  bundlePath,
}: Props) {
  if (
    keyboardType !== KeyboardType.iOS &&
    keyboardType !== KeyboardType.Android
  ) {
    throw new Error(`Unsupported keyboard type for meta build: ${keyboardType}`)
  }

  await Kbdgen.fetchMetaBundle(bundlePath)
  let payloadPath

  let buildStart = 0
  const githubRepo = builder.context.repo

  if (githubRepo === "divvun/divvun-keyboard") {
    if (keyboardType === KeyboardType.Android) {
      buildStart = 1590918851
    }
  } else if (githubRepo === "divvun/divvun-dev-keyboard") {
    // Do nothing
  } else {
    throw new Error(`Unsupported repository for release builds: ${githubRepo}`)
  }

  if (keyboardType === KeyboardType.Android) {
    await Kbdgen.setBuildNumber(bundlePath, "android", buildStart)
    payloadPath = await Kbdgen.buildAndroid(bundlePath, githubRepo)
  } else if (keyboardType === KeyboardType.iOS) {
    await Kbdgen.setBuildNumber(bundlePath, "ios", buildStart)
    payloadPath = await Kbdgen.build_iOS(bundlePath)
  }

  // In general, this will be unused, because iOS and Android builds are
  // submitted directly to their respective app stores.
  // await builder.setOutput("payload-path", payloadPath)

  return { payloadPath }
}

// async function run() {
//   const keyboardType = (await builder.getInput("keyboard-type", {
//     required: true,
//   })) as KeyboardType
//   const bundlePath = await builder.getInput("bundle-path", { required: true })

//   await keyboardBuildMeta({ keyboardType, bundlePath })
// }
