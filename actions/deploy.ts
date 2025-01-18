import * as path from "@std/path"
import * as builder from "~/builder.ts"

import {
  getArtifactSize,
  MacOSPackageTarget,
  PahkatUploader,
  RebootSpec,
  ReleaseRequest,
  validateProductCode,
  WindowsExecutableKind,
} from "~/util/shared.ts"

export enum PackageType {
  MacOSPackage = "MacOSPackage",
  WindowsExecutable = "WindowsExecutable",
  TarballPackage = "TarballPackage",
}

// async function getPlatformAndType(
//   platform: string | null,
//   givenType: string | null,
// ): Promise<{
//   packageType: PackageType
//   platform: string
// }> {
//   builder.debug(`Platform: '${platform}', Type: '${givenType}'`)

//   if (givenType == null) {
//     if (platform == null) {
//       throw new Error("Either platform or type must be set.")
//     }

//     if (platform === "macos") {
//       return {
//         packageType: PackageType.MacOSPackage,
//         platform,
//       }
//     } else if (platform === "windows") {
//       return {
//         packageType: PackageType.WindowsExecutable,
//         platform,
//       }
//     } else {
//       return {
//         packageType: PackageType.TarballPackage,
//         platform,
//       }
//     }
//   }

//   if (platform == null) {
//     switch (givenType) {
//       case PackageType.MacOSPackage:
//         platform = "macos"
//         break
//       case PackageType.WindowsExecutable:
//         platform = "windows"
//         break
//       case PackageType.TarballPackage:
//         throw new Error(
//           "Cannot detect platform from only a package type of TarballPackage",
//         )
//     }
//   }

//   if (platform != null) {
//     switch (givenType) {
//       case PackageType.MacOSPackage:
//       case PackageType.WindowsExecutable:
//       case PackageType.TarballPackage:
//         return { packageType: givenType, platform }
//       default:
//         throw new Error(`Unhandled package type: '${givenType}'`)
//     }
//   } else {
//     throw new Error(`Platform was null, should be unreachable.`)
//   }
// }

// async function getDependencies(deps: string | null) {
//   if (deps == null) {
//     return null
//   }

//   return JSON.parse(deps)
// }

export type Props =
  & {
    packageId: string
    // packageType: PackageType
    platform: string
    payloadPath: string
    arch?: string | null
    channel?: string | null
    dependencies?: { [key: string]: string } | null
    pahkatRepo: string
    version: string
  }
  & (
    | {
      packageType: PackageType.MacOSPackage
      pkgId: string
      requiresReboot: RebootSpec[]
      targets: MacOSPackageTarget[]
    }
    | {
      packageType: PackageType.WindowsExecutable
      productCode: string
      kind: WindowsExecutableKind | null
      requiresReboot: RebootSpec[]
    }
    | {
      packageType: PackageType.TarballPackage
    }
  )

export default async function deploy({
  packageId,
  // packageType,
  platform,
  payloadPath,
  arch,
  channel,
  dependencies,
  pahkatRepo,
  version,
  ...props
}: Props) {
  const repoPackageUrl = `${pahkatRepo}/packages/${packageId}`

  builder.debug("Version: " + version)

  const ext = path.extname(payloadPath)
  const pathItems = [packageId, version, platform]

  if (arch != null) {
    pathItems.push(arch)
  }

  const artifactPath = path.join(
    path.dirname(payloadPath),
    `${pathItems.join("_")}${ext}`,
  )
  const artifactUrl = `${PahkatUploader.ARTIFACTS_URL}${
    path.basename(
      artifactPath,
    )
  }`
  const artifactSize = getArtifactSize(payloadPath)

  const releaseReq: ReleaseRequest = {
    platform,
    version,
  }

  if (channel) {
    releaseReq.channel = channel
  }

  if (arch) {
    releaseReq.arch = arch
  }

  if (dependencies) {
    releaseReq.dependencies = dependencies
  }

  if (props.packageType === PackageType.MacOSPackage) {
    const { pkgId, requiresReboot, targets } = props

    const data = await PahkatUploader.release.macosPackage(
      releaseReq,
      artifactUrl,
      1,
      artifactSize,
      pkgId,
      requiresReboot,
      targets,
    )
    await Deno.writeTextFile("./metadata.toml", data)
  } else if (props.packageType === PackageType.WindowsExecutable) {
    const { productCode: rawProductCode, kind, requiresReboot } = props

    let productCode

    switch (kind) {
      case WindowsExecutableKind.Inno:
      case WindowsExecutableKind.Nsis:
      case WindowsExecutableKind.Msi:
        productCode = validateProductCode(kind, rawProductCode)
        break
      case null:
        builder.debug("No Windows kind provided, not validating product code.")
        productCode = rawProductCode
        break
      default:
        throw new Error("Unhandled Windows executable kind: " + kind)
    }

    const data = await PahkatUploader.release.windowsExecutable(
      releaseReq,
      artifactUrl,
      1,
      artifactSize,
      kind,
      productCode,
      requiresReboot,
    )
    await Deno.writeTextFile("./metadata.toml", data)
  } else if (props.packageType === PackageType.TarballPackage) {
    const data = await PahkatUploader.release.tarballPackage(
      releaseReq,
      artifactUrl,
      1,
      artifactSize,
    )
    await Deno.writeTextFile("./metadata.toml", data)
  } else {
    // deno-lint-ignore no-explicit-any
    throw new Error(`Unhandled package type: '${(props as any).packageType}'`)
  }

  builder.debug(`Renaming from ${payloadPath} to ${artifactPath}`)
  await Deno.rename(payloadPath, artifactPath)

  await PahkatUploader.upload(
    artifactPath,
    artifactUrl,
    "./metadata.toml",
    repoPackageUrl,
  )
}

// async function run() {
//   const packageId = await builder.getInput("package-id", { required: true })
//   const { packageType, platform } = await getPlatformAndType(
//     await builder.getInput("platform"),
//     await builder.getInput("type"),
//   )
//   const payloadPath = await builder.getInput("payload-path", { required: true })
//   const arch = (await builder.getInput("arch")) || null
//   const channel = (await builder.getInput("channel")) || null
//   const dependencies = await getDependencies(
//     await builder.getInput("dependencies"),
//   )
//   const pahkatRepo = await builder.getInput("repo", { required: true })
//   const version = await builder.getInput("version", { required: true })

//   switch (packageType) {
//     case PackageType.TarballPackage:
//       await deploy({
//         packageId,
//         packageType,
//         platform,
//         payloadPath,
//         arch,
//         channel,
//         dependencies,
//         pahkatRepo,
//         version,
//       })
//       break
//     case PackageType.MacOSPackage: {
//       const pkgId = await builder.getInput("macos-pkg-id", { required: true })
//       const rawReqReboot = await builder.getInput("macos-requires-reboot")
//       const rawTargets = await builder.getInput("macos-targets")

//       const requiresReboot: RebootSpec[] = rawReqReboot
//         ? (rawReqReboot.split(",").map((x) => x.trim()) as RebootSpec[])
//         : []
//       const targets: MacOSPackageTarget[] = rawTargets
//         ? (rawTargets.split(",").map((x) => x.trim()) as MacOSPackageTarget[])
//         : []

//       await deploy({
//         packageId,
//         packageType,
//         platform,
//         payloadPath,
//         arch,
//         channel,
//         dependencies,
//         pahkatRepo,
//         version,
//         pkgId,
//         requiresReboot,
//         targets,
//       })
//       break
//     }
//     case PackageType.WindowsExecutable: {
//       const productCode = await builder.getInput("windows-product-code", {
//         required: true,
//       })
//       const kind =
//         ((await builder.getInput("windows-kind")) as WindowsExecutableKind) ||
//         null
//       const rawReqReboot = await builder.getInput("windows-requires-reboot")
//       const requiresReboot: RebootSpec[] = rawReqReboot
//         ? (rawReqReboot.split(",").map((x) => x.trim()) as RebootSpec[])
//         : []
//       await deploy({
//         packageId,
//         packageType,
//         platform,
//         payloadPath,
//         arch,
//         channel,
//         dependencies,
//         pahkatRepo,
//         version,
//         productCode,
//         kind,
//         requiresReboot,
//       })
//       break
//     }
//   }
// }
