// deno-lint-ignore-file no-explicit-any
import * as path from "@std/path"
import * as toml from "@std/toml"
import * as builder from "~/builder.ts"
import {
  getArtifactSize,
  MacOSPackageTarget,
  nonUndefinedProxy,
  PahkatUploader,
  RebootSpec,
  ReleaseRequest,
  validateProductCode,
  WindowsExecutableKind,
} from "~/util/shared.ts"
import { derivePackageId, SpellerManifest, SpellerType } from "./manifest.ts"

async function loadManifest(manifestPath: string): Promise<SpellerManifest> {
  const manifestString = await Deno.readTextFile(manifestPath)
  return nonUndefinedProxy(toml.parse(manifestString), true)
}

function releaseReq(
  version: string,
  platform: string,
  dependencies: any,
  channel: string | null,
): ReleaseRequest {
  const req: ReleaseRequest = {
    version,
    platform,
  }

  if (Object.keys(dependencies).length) {
    req.dependencies = dependencies
  }

  if (channel) {
    req.channel = channel
  }

  return req
}

export type Props = {
  spellerType: SpellerType
  manifestPath: string
  payloadPath: string
  version: string
  channel: string | null
  nightlyChannel: string
  pahkatRepo: string
}

export default async function spellerDeploy({
  spellerType,
  manifestPath,
  payloadPath,
  version,
  channel,
  nightlyChannel,
  pahkatRepo,
}: Props) {
  try {
    const packageId = derivePackageId(spellerType)
    const manifest = await loadManifest(manifestPath)
    const repoPackageUrl = `${pahkatRepo}packages/${packageId}`

    let payloadMetadata: string | null = null
    let platform: string | null = null
    let artifactPath: string | null = null
    let artifactUrl: string | null = null
    let artifactSize: number | null = null

    // Generate the payload metadata
    if (spellerType === SpellerType.Windows) {
      platform = "windows"
      const productCode = validateProductCode(
        WindowsExecutableKind.Inno,
        manifest.windows.system_product_code,
      )

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

      // Make the nightly channel be used if any channel except for the default.
      let deps: any = { "https://pahkat.uit.no/tools/packages/windivvun": "*" }
      if (channel != null) {
        const windivvun =
          `https://pahkat.uit.no/tools/packages/windivvun?channel=${nightlyChannel}`
        deps = {}
        deps[windivvun] = "*"
      }

      payloadMetadata = await PahkatUploader.release.windowsExecutable(
        releaseReq(version, platform, deps, channel),
        artifactUrl,
        1,
        artifactSize,
        WindowsExecutableKind.Inno,
        productCode,
        [RebootSpec.Install, RebootSpec.Uninstall],
      )
    } else if (spellerType === SpellerType.MacOS) {
      platform = "macos"
      const pkgId = manifest.macos.system_pkg_id

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

      // Make the nightly channel be used if any channel except for the default.
      let deps: any = { "https://pahkat.uit.no/tools/packages/macdivvun": "*" }
      if (channel != null) {
        const macdivvun =
          `https://pahkat.uit.no/tools/packages/macdivvun?channel=${nightlyChannel}`
        deps = {}
        deps[macdivvun] = "*"
      }

      payloadMetadata = await PahkatUploader.release.macosPackage(
        releaseReq(version, platform, deps, channel),
        artifactUrl,
        1,
        artifactSize,
        pkgId,
        [RebootSpec.Install, RebootSpec.Uninstall],
        [MacOSPackageTarget.System, MacOSPackageTarget.User],
      )
    } else if (spellerType === SpellerType.Mobile) {
      platform = "mobile"

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

      payloadMetadata = await PahkatUploader.release.tarballPackage(
        releaseReq(version, platform, {}, channel),
        artifactUrl,
        1,
        artifactSize,
      )
    } else {
      throw new Error(`Unsupported bundle type ${spellerType}`)
    }

    if (payloadMetadata == null) {
      throw new Error("Payload is null; this is a logic error.")
    }

    await Deno.writeTextFile("./metadata.toml", payloadMetadata)

    if (platform == null) {
      throw new Error("Platform is null; this is a logic error.")
    }

    if (artifactPath == null) {
      throw new Error("artifact path is null; this is a logic error.")
    }

    if (artifactUrl == null) {
      throw new Error("artifact url is null; this is a logic error.")
    }

    builder.debug(`Renaming from ${payloadPath} to ${artifactPath}`)
    await Deno.rename(payloadPath, artifactPath)

    await PahkatUploader.upload(
      artifactPath,
      artifactUrl,
      "./metadata.toml",
      repoPackageUrl,
      null,
      manifestPath,
      "speller",
    )
  } catch (error: any) {
    builder.setFailed(error.message)
  }
}

// async function run() {
//   const spellerType = (await builder.getInput("speller-type", {
//     required: true,
//   })) as SpellerType
//   const manifestPath = await builder.getInput("speller-manifest-path", {
//     required: true,
//   })
//   const payloadPath = await builder.getInput("payload-path", {
//     required: true,
//   })
//   const version = await builder.getInput("version", { required: true })
//   const channel = (await builder.getInput("channel")) || null
//   const nightlyChannel = await builder.getInput("nightly-channel", {
//     required: true,
//   })
//   const pahkatRepo = await builder.getInput("repo", { required: true })

//   await spellerDeploy({
//     spellerType,
//     manifestPath,
//     payloadPath,
//     version,
//     channel,
//     nightlyChannel,
//     pahkatRepo,
//   })
// }
