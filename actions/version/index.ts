// deno-lint-ignore-file no-explicit-any

import * as builder from "~/builder.ts"
import { Bash, versionAsNightly } from "~/util/shared.ts"

// async function getCargoToml(cargo: string | null) {
//   if (cargo == null) {
//     return null
//   }

//   if (cargo === "true") {
//     return nonUndefinedProxy(
//       toml.parse(await Deno.readFile("./Cargo.toml", "utf8")),
//     )
//   }

//   return nonUndefinedProxy(toml.parse(await Deno.readFile(cargo, "utf8")))
// }

// async function getSpellerManifestToml(
//   manifest: string | null,
// ): Promise<SpellerManifest | null> {
//   if (manifest == null) {
//     return null
//   }

//   if (manifest === "true") {
//     return nonUndefinedProxy(
//       toml.parse(await Deno.readFile("./manifest.toml", "utf8")),
//     )
//   }

//   return nonUndefinedProxy(toml.parse(await Deno.readFile(manifest, "utf8")))
// }

async function getXcodeMarketingVersion(input: string | null) {
  let cwd

  if (input != null && input !== "true") {
    cwd = input.trim()
  }
  // Xcode is the worst and I want out of this dastardly life.
  const [out] = await Bash.runScript(
    `xcodebuild -showBuildSettings | grep -i 'MARKETING_VERSION' | sed 's/[ ]*MARKETING_VERSION = //'`,
    { cwd },
  )
  return out.trim()
}

// Taken straight from semver.org, with added 'v'
// const SEMVER_TAG_RE =
//   /^v(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\.(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*))*))?(?:\+([0-9a-zA-Z-]+(?:\.[0-9a-zA-Z-]+)*))?$/

// function deriveNightly(): boolean {
//   return !isMatchingTag(SEMVER_TAG_RE)
// }

// async function getPlistPath(plistPath: string | null) {
//   if (plistPath == null) {
//     return null
//   }

//   return path.resolve(plistPath)
// }

// async function getVersionFromFile(filePath: string | null) {
//   if (filePath == null) {
//     return null
//   }

//   const version = await Deno.readFile(path.resolve(filePath), "utf-8").trimEnd()
//   return version
// }

export type Props = {
  isXcode?: string | null
  isNightly?: boolean
  cargoToml: any
  spellerManifest?: any
  plistPath?: string | null
  csharp?: string | null
  versionFromFile?: string | null
  instaStable?: boolean
}

const NIGHTLY_CHANNEL = "nightly"

// async function run() {
//   const isXcode = (await builder.getInput("xcode")) || null
//   const isNightly = deriveNightly()
//   const cargoToml = await getCargoToml(await builder.getInput("cargo"))
//   const spellerManifest = await getSpellerManifestToml(
//     await builder.getInput("speller-manifest"),
//   )
//   const plistPath = await getPlistPath(await builder.getInput("plist"))
//   const csharp = (await builder.getInput("csharp")) || null
//   const versionFromFile = await getVersionFromFile(
//     await builder.getInput("filepath"),
//   )
//   const instaStable = Boolean(await builder.getInput("insta-stable")) || false
//   // const nightlyChannel = await builder.getInput("nightly-channel", {
//   //   required: true,
//   // })

//   const { channel, version: v } = await version({
//     isXcode,
//     isNightly,
//     cargoToml,
//     spellerManifest,
//     plistPath,
//     csharp,
//     versionFromFile,
//     instaStable,
//   })

//   if (channel != null) {
//     await builder.setOutput("channel", channel)
//   }

//   await builder.setOutput("version", v)
// }

export type Output = {
  version: string
  channel: string | null
}

export default async function version({
  isXcode,
  isNightly = false,
  cargoToml,
  spellerManifest = null,
  plistPath,
  csharp,
  versionFromFile,
  instaStable = false,
}: Props) {
  let version

  let channel: string | null = null

  if (cargoToml != null) {
    builder.debug("Getting version from TOML")
    version = cargoToml.package.version
  } else if (csharp != null) {
    builder.debug("Getting version from GitVersioning C#")
    version = Deno.env.get("GitBuildVersionSimple")
  } else if (spellerManifest != null) {
    builder.debug("Getting version from speller manifest")
    builder.debug(`spellerversion: ${spellerManifest.spellerversion}`)
    version = spellerManifest.spellerversion
  } else if (plistPath != null) {
    builder.debug("Getting version from plist")
    const result = (
      await Bash.runScript(
        `/usr/libexec/PlistBuddy -c "Print CFBundleShortVersionString" "${plistPath}"`,
      )
    )
      .join("")
      .trim()
    if (result === "") {
      throw new Error("No version found in plist")
    }
    version = result
  } else if (isXcode) {
    version = await getXcodeMarketingVersion(isXcode)
  } else if (versionFromFile != null) {
    version = versionFromFile
  } else {
    throw new Error("Did not find a suitable mechanism to derive the version.")
  }

  if (version == null || version.trim() === "") {
    throw new Error("Did not find any version.")
  }

  if (isNightly) {
    builder.debug(`Generating nightly version for channel ${NIGHTLY_CHANNEL}`)
    version = await versionAsNightly(version)

    // await builder.setOutput("channel", nightlyChannel)
    channel = NIGHTLY_CHANNEL
  } else {
    if (!instaStable) {
      // await builder.setOutput("channel", "beta")
      channel = "beta"
    } else {
      // An insta-stable package that is pre-1.0.0 will still be released to beta
      if (version.startsWith("0")) {
        // await builder.setOutput("channel", "beta")
        channel = "beta"
      }
    }
  }

  builder.debug("Setting version to: " + version)
  // await builder.setOutput("version", version)

  return { channel, version }
}
