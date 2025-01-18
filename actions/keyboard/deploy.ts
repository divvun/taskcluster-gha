// deno-lint-ignore-file no-explicit-any
import * as path from "@std/path"
import * as builder from "~/builder.ts"

import {
  getArtifactSize,
  Kbdgen,
  MacOSPackageTarget,
  PahkatUploader,
  RebootSpec,
  ReleaseRequest,
  validateProductCode,
  WindowsExecutableKind,
} from "~/util/shared.ts"

import { KeyboardType } from "../types.ts"

export function derivePackageId() {
  const repo = builder.context.repo
  if (!repo.startsWith("keyboard-")) {
    throw new Error("Repository is not prefixed with 'keyboard")
  }

  const lang = builder.context.repo.split("keyboard-")[1]
  return `keyboard-${lang}`
}

function releaseReq(
  version: string,
  platform: string,
  channel: string | null,
): ReleaseRequest {
  const req: ReleaseRequest = {
    version,
    platform,
  }

  console.log("releaseReq", version, channel)
  if (channel) {
    req.channel = channel
  } else {
    if (version.startsWith("0")) {
      console.log("channel: beta")
      req.channel = "beta"
    } else {
      console.log("channel: stable")
      // Empty channel means stable
      req.channel = ""
    }
  }

  return req
}

export type Props = {
  payloadPath: string
  keyboardType: KeyboardType
  bundlePath: string
  channel: string | null
  pahkatRepo: string
  packageId: string
}

export default async function keyboardDeploy({
  payloadPath,
  keyboardType,
  bundlePath,
  channel,
  pahkatRepo,
  packageId,
}: Props) {
  const repoPackageUrl = `${pahkatRepo}packages/${packageId}`

  let payloadMetadata: string | null = null
  let platform: string | null = null
  let version: string | null = null
  let artifactPath: string | null = null
  let artifactUrl: string | null = null
  let artifactSize: number | null = null

  if (keyboardType === KeyboardType.MacOS) {
    const target = await Kbdgen.loadTarget(bundlePath, "macos")
    let pkgId = target.packageId
    const lang = builder.context.repo.split("keyboard-")[1]
    // On macos kbdgen does magic with the keyboard id to match this:
    // `no.giella.keyboard.%lang%.keyboardLayout.%lang%` because macos.
    // Since kbdgen currently relies on the packageId to not contain the
    // `keyboardLayout.%lang%` part (it adds it itself), we have to "fix"
    // the published ID here.
    pkgId = `${pkgId}.keyboardlayout.${lang}`
    version = target.version as string
    platform = "macos"

    const ext = path.extname(payloadPath)
    const pathItems = [packageId, version, platform]
    artifactPath = path.join(
      path.dirname(payloadPath),
      `${pathItems.join("_")}${ext}`,
    )
    artifactUrl = `${PahkatUploader.ARTIFACTS_URL}${
      path.basename(
        artifactPath,
      )
    }`
    artifactSize = getArtifactSize(payloadPath)

    payloadMetadata = await PahkatUploader.release.macosPackage(
      releaseReq(version, platform, channel),
      artifactUrl,
      1,
      artifactSize,
      pkgId,
      [RebootSpec.Install, RebootSpec.Uninstall],
      [MacOSPackageTarget.System, MacOSPackageTarget.User],
    )
  } else if (keyboardType === KeyboardType.Windows) {
    const target = await Kbdgen.loadTarget(bundlePath, "windows")
    const productCode = validateProductCode(
      WindowsExecutableKind.Inno,
      target.uuid,
    )
    version = target.version as string
    platform = "windows"

    const ext = path.extname(payloadPath)
    const pathItems = [packageId, version, platform]
    artifactPath = path.join(
      path.dirname(payloadPath),
      `${pathItems.join("_")}${ext}`,
    )
    artifactUrl = `${PahkatUploader.ARTIFACTS_URL}${
      path.basename(
        artifactPath,
      )
    }`
    artifactSize = getArtifactSize(payloadPath)

    payloadMetadata = await PahkatUploader.release.windowsExecutable(
      releaseReq(version, platform, channel),
      artifactUrl,
      1,
      artifactSize,
      WindowsExecutableKind.Inno,
      productCode,
      [RebootSpec.Install, RebootSpec.Uninstall],
    )
  } else {
    throw new Error("Unhandled keyboard type: " + keyboardType)
  }

  if (payloadMetadata == null) {
    throw new Error("Payload is null; this is a logic error.")
  }

  if (version == null) {
    throw new Error("Version is null; this is a logic error.")
  }

  if (platform == null) {
    throw new Error("Platform is null; this is a logic error.")
  }

  if (artifactPath == null) {
    throw new Error("artifact path is null; this is a logic error.")
  }

  if (artifactUrl == null) {
    throw new Error("artifact url is null; this is a logic error.")
  }

  await Deno.writeTextFile("./metadata.toml", payloadMetadata)

  const metadataJsonPath = await writeMetadataJson(bundlePath)

  builder.debug(`Renaming from ${payloadPath} to ${artifactPath}`)
  await Deno.rename(payloadPath, artifactPath)

  await PahkatUploader.upload(
    artifactPath,
    artifactUrl,
    "./metadata.toml",
    repoPackageUrl,
    metadataJsonPath,
  )
}

// async function run() {
//   const payloadPath = await builder.getInput("payload-path", { required: true })
//   const keyboardType = (await builder.getInput("keyboard-type", {
//     required: true,
//   })) as KeyboardType
//   const override = await builder.getInput("bundle-path")
//   const bundlePath = await getBundle(override)
//   const channel = (await builder.getInput("channel")) || null
//   const pahkatRepo = await builder.getInput("repo", { required: true })
//   const packageId = derivePackageId()

//   await keyboardDeploy({
//     payloadPath,
//     keyboardType,
//     bundlePath,
//     channel,
//     pahkatRepo,
//     packageId,
//   })
// }

// Writes the name and description fields to a json file
// Returns the path to the json file or null if unsuccessful
async function writeMetadataJson(bundlePath: string): Promise<string | null> {
  const project: any = await Kbdgen.loadProjectBundleWithoutProxy(bundlePath)
  const locales = project.locales
  if (!locales) {
    return null
  }
  const localesJson = JSON.stringify(locales)
  const metadataJsonPath = "./metadata.json"
  await Deno.writeTextFile(metadataJsonPath, localesJson)
  return metadataJsonPath
}
