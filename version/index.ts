import fs from "fs"
import path from "path"

import toml from "toml"
import * as builder from "~/builder"
import { Bash, isMatchingTag, nonUndefinedProxy, versionAsNightly } from '../shared'
import { SpellerManifest } from '../speller/manifest'

async function getCargoToml() {
    const cargo = await builder.getInput("cargo") || null

    if (cargo == null) {
        return null
    }

    if (cargo === "true") {
        return nonUndefinedProxy(toml.parse(fs.readFileSync("./Cargo.toml", "utf8")))
    }

    return nonUndefinedProxy(toml.parse(fs.readFileSync(cargo, "utf8")))
}

async function getSpellerManifestToml(): Promise<SpellerManifest | null> {
    const manifest = await builder.getInput("speller-manifest") || null

    if (manifest == null) {
        return null
    }

    if (manifest === "true") {
        return nonUndefinedProxy(toml.parse(fs.readFileSync("./manifest.toml", "utf8")))
    }

    return nonUndefinedProxy(toml.parse(fs.readFileSync(manifest, "utf8")))
}

async function getXcodeMarketingVersion() {
    const input = await builder.getInput("xcode") || null
    let cwd

    if (input != null && input !== "true") {
        cwd = input.trim()
    }
    // Xcode is the worst and I want out of this dastardly life.
    const [out] = await Bash.runScript(`xcodebuild -showBuildSettings | grep -i 'MARKETING_VERSION' | sed 's/[ ]*MARKETING_VERSION = //'`, { cwd })
    return out.trim()
}

// Taken straight from semver.org, with added 'v'
const SEMVER_TAG_RE = /^v(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\.(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*))*))?(?:\+([0-9a-zA-Z-]+(?:\.[0-9a-zA-Z-]+)*))?$/

function deriveNightly(): boolean {
    return !isMatchingTag(SEMVER_TAG_RE)
}

async function getPlistPath() {
    const plistPath = await builder.getInput("plist") || null

    if (plistPath == null) {
        return null
    }

    return path.resolve(plistPath)
}

async function getVersionFromFile() {
    const filePath = await builder.getInput("filepath") || null;

    if (filePath == null) {
        return null
    }

    const version = fs.readFileSync(path.resolve(filePath), "utf-8").trimEnd()
    return version
}

async function run() {
    const isXcode = await builder.getInput("xcode") || null
    const isNightly = deriveNightly()
    const cargoToml = await getCargoToml()
    const spellerManifest = await getSpellerManifestToml()
    const plistPath = await getPlistPath()
    const csharp = await builder.getInput("csharp") || null
    const versionFromFile = await getVersionFromFile()
    const instaStable = await builder.getInput("insta-stable") || false
    const nightlyChannel = await builder.getInput("nightly-channel", { required: true })

    let version 

    if (cargoToml != null) {
        builder.debug("Getting version from TOML")
        version = cargoToml.package.version
    } else if (csharp != null) {
        builder.debug("Getting version from GitVersioning C#")
        version = process.env.GitBuildVersionSimple
    } else if (spellerManifest != null) {
        builder.debug("Getting version from speller manifest")
        builder.debug(`spellerversion: ${spellerManifest.spellerversion}`)
        version = spellerManifest.spellerversion
    } else if (plistPath != null) {
        builder.debug('Getting version from plist')
        const result = (await Bash.runScript(`/usr/libexec/PlistBuddy -c "Print CFBundleShortVersionString" "${plistPath}"`)).join("").trim()
        if (result === "") {
            throw new Error("No version found in plist")
        }
        version = result
    } else if (isXcode) {
        version = await getXcodeMarketingVersion()
    } else if (versionFromFile != null) {
        version = versionFromFile
    } else {
        throw new Error("Did not find a suitable mechanism to derive the version.")
    }

    if (version == null || version.trim() === "") {
        throw new Error("Did not find any version.")
    }

    if (isNightly) {
        builder.debug(`Generating nightly version for channel ${nightlyChannel}`)
        version = await versionAsNightly(version)

        await builder.setOutput("channel", nightlyChannel)
    } else {
        if (instaStable != "true") {
            await builder.setOutput("channel", "beta")
        } else {
            // An insta-stable package that is pre-1.0.0 will still be released to beta
            if (version.startsWith("0")) {
                await builder.setOutput("channel", "beta")
            }
        }
    }

    builder.debug("Setting version to: " + version)
    await builder.setOutput("version", version)
}

run().catch(err => {
    console.error(err.stack)
    process.exit(1)
})
