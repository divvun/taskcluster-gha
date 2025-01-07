import path from 'path'
import * as builder from "~/builder"
import { makeInstaller } from '../../inno-setup/lib'
import { isMatchingTag, Kbdgen, PahkatPrefix } from "../../shared"
import { getBundle, KeyboardType } from "../types"
import { generateKbdInnoFromBundle } from './iss'

// Taken straight from semver.org, with added 'v'
const SEMVER_TAG_RE = /^v(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\.(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*))*))?(?:\+([0-9a-zA-Z-]+(?:\.[0-9a-zA-Z-]+)*))?$/

async function run() {
    const keyboardType = await builder.getInput("keyboard-type", { required: true }) as KeyboardType
    const nightlyChannel = await builder.getInput("nightly-channel", { required: true })
    const bundlePath = await getBundle()

    // Testing how to get name and description fields
    const project = Kbdgen.loadProjectBundle(bundlePath)
    const locales = project.locales
    builder.debug("TESTING: NAMES AND DESCRIPTIONS FROM project.yaml:")
    for (const locale in locales) {
        builder.debug(`  ${locales[locale].name}`)
        builder.debug(`  ${locales[locale].description}`)
    }

    if (keyboardType === KeyboardType.iOS || keyboardType === KeyboardType.Android) {
        throw new Error(`Unsupported keyboard type for non-meta build: ${keyboardType}`)
    }

    let payloadPath

    if (keyboardType === KeyboardType.MacOS) {
        if (isMatchingTag(SEMVER_TAG_RE)) {
            builder.debug("Using version from kbdgen project")
        } else {
            await builder.setOutput("channel", nightlyChannel)
            builder.debug("Setting current version to nightly version")
            await Kbdgen.setNightlyVersion(bundlePath, "macos")
        }
        payloadPath = await Kbdgen.buildMacOS(bundlePath)
    } else if (keyboardType === KeyboardType.Windows) {
        if (isMatchingTag(SEMVER_TAG_RE)) {
            builder.debug("Using version from kbdgen project")
        } else {
            await builder.setOutput("channel", nightlyChannel)
            builder.debug("Setting current version to nightly version")
            await Kbdgen.setNightlyVersion(bundlePath, "windows")
        }
        await PahkatPrefix.install(["kbdi"])
        const kbdi_path = path.join(PahkatPrefix.path, "pkg", "kbdi", "bin", "kbdi.exe")
        const kbdi_x64_path = path.join(PahkatPrefix.path, "pkg", "kbdi", "bin", "kbdi-x64.exe")

        const outputPath = await Kbdgen.buildWindows(bundlePath)
        await builder.cp(kbdi_path, outputPath)
        await builder.cp(kbdi_x64_path, outputPath)

        const issPath = await generateKbdInnoFromBundle(bundlePath, outputPath);
        payloadPath = await makeInstaller(issPath);
    } else {
        throw new Error(`Unhandled keyboard type: ${keyboardType}`)
    }

    await builder.setOutput("payload-path", payloadPath)
}

run().catch(err => {
    console.error(err.stack)
    process.exit(1)
})
