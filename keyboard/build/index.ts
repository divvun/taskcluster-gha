import * as core from "@actions/core"
import { isMatchingTag, Kbdgen } from "../../shared"
import { KeyboardType, getBundle } from "../types"
import { generateKbdInnoFromBundle } from './iss'
import { makeInstaller } from '../../inno-setup/lib'
import { PahkatPrefix } from "../../shared"
import path from 'path'
import * as io from "@actions/io"

// Taken straight from semver.org, with added 'v'
const SEMVER_TAG_RE = /^v(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\.(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*))*))?(?:\+([0-9a-zA-Z-]+(?:\.[0-9a-zA-Z-]+)*))?$/

async function run() {
    const keyboardType = core.getInput("keyboard-type", { required: true }) as KeyboardType
    const bundlePath = getBundle()

    if (keyboardType === KeyboardType.iOS || keyboardType === KeyboardType.Android) {
        throw new Error(`Unsupported keyboard type for non-meta build: ${keyboardType}`)
    }

    let payloadPath

    if (keyboardType === KeyboardType.MacOS) {
        if (isMatchingTag(SEMVER_TAG_RE)) {
            core.debug("Using version from kbdgen project")
        } else {
            core.setOutput("channel", "nightly")
            core.debug("Setting current version to nightly version")
            await Kbdgen.setNightlyVersion(bundlePath, "mac")
        }
        payloadPath = await Kbdgen.buildMacOS(bundlePath)
    } else if (keyboardType === KeyboardType.Windows) {
        if (isMatchingTag(SEMVER_TAG_RE)) {
            core.debug("Using version from kbdgen project")
        } else {
            core.setOutput("channel", "nightly")
            core.debug("Setting current version to nightly version")
            await Kbdgen.setNightlyVersion(bundlePath, "win")
        }
        await PahkatPrefix.install(["kbdi"])
        const kbdi_path = path.join(PahkatPrefix.path, "pkg", "kbdi", "bin", "kbdi.exe")

        const outputPath = await Kbdgen.buildWindows(bundlePath)
        await io.cp(kbdi_path, outputPath)

        const issPath = await generateKbdInnoFromBundle(bundlePath, outputPath);
        payloadPath = await makeInstaller(issPath);
    } else {
        throw new Error(`Unhandled keyboard type: ${keyboardType}`)
    }

    core.setOutput("payload-path", payloadPath)
}

run().catch(err => {
    console.error(err.stack)
    process.exit(1)
})
