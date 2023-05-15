import * as core from '@actions/core'
import * as github from '@actions/github'
import fs from 'fs'
import path from 'path'

import { 
    PahkatUploader,
    WindowsExecutableKind,
    RebootSpec,
    MacOSPackageTarget,
    Kbdgen,
    validateProductCode,
    ReleaseRequest,
    getArtifactSize
} from "../../shared"

import { KeyboardType, getBundle } from '../types'


export function derivePackageId() {
    const repo = github.context.repo.repo
    if (!repo.startsWith("keyboard-")) {
        throw new Error("Repository is not prefixed with 'keyboard")
    }

    const lang = github.context.repo.repo.split("keyboard-")[1]
    return `keyboard-${lang}`
}

function releaseReq(version: string, platform: string, channel: string | null): ReleaseRequest {
    const req: ReleaseRequest = {
        version,
        platform
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

async function run() {
    const payloadPath = core.getInput('payload-path', { required: true })
    const keyboardType = core.getInput('keyboard-type', { required: true }) as KeyboardType
    const bundlePath = getBundle()
    const channel = core.getInput('channel') || null;
    const pahkatRepo = core.getInput('repo', { required: true });
    const packageId = derivePackageId()

    const repoPackageUrl = `${pahkatRepo}packages/${packageId}`

    let payloadMetadata: string | null = null
    let platform: string | null = null
    let version: string | null = null
    let artifactPath: string | null = null
    let artifactUrl: string | null = null
    let artifactSize: number | null = null

    if (keyboardType === KeyboardType.MacOS) {
        const target = Kbdgen.loadTarget(bundlePath, "macos")
        var pkgId = target.packageId
        const lang = github.context.repo.repo.split("keyboard-")[1]
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
        artifactPath = path.join(path.dirname(payloadPath), `${pathItems.join("_")}${ext}`)
        artifactUrl = `${PahkatUploader.ARTIFACTS_URL}${path.basename(artifactPath)}`
        artifactSize = await getArtifactSize(artifactUrl)

        payloadMetadata = await PahkatUploader.release.macosPackage(
            releaseReq(version, platform, channel),
            artifactUrl,
            1,
            artifactSize,
            pkgId,
            [RebootSpec.Install, RebootSpec.Uninstall],
            [MacOSPackageTarget.System, MacOSPackageTarget.User])

    } else if (keyboardType === KeyboardType.Windows) {
        const target = Kbdgen.loadTarget(bundlePath, "windows")
        const productCode = validateProductCode(WindowsExecutableKind.Inno, target.uuid)
        version = target.version as string
        platform = "windows"

        const ext = path.extname(payloadPath)
        const pathItems = [packageId, version, platform]
        artifactPath = path.join(path.dirname(payloadPath), `${pathItems.join("_")}${ext}`)
        artifactUrl = `${PahkatUploader.ARTIFACTS_URL}${path.basename(artifactPath)}`
        artifactSize = await getArtifactSize(artifactUrl)

        payloadMetadata = await PahkatUploader.release.windowsExecutable(
            releaseReq(version, platform, channel),
            artifactUrl,
            1,
            artifactSize, 
            WindowsExecutableKind.Inno,
            productCode,
            [RebootSpec.Install, RebootSpec.Uninstall])
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

    fs.writeFileSync("./metadata.toml", payloadMetadata, "utf8")

    core.debug(`Renaming from ${payloadPath} to ${artifactPath}`)
    fs.renameSync(payloadPath, artifactPath)

    await PahkatUploader.upload(artifactPath, artifactUrl, "./metadata.toml", repoPackageUrl)
}

run().catch(err => {
    console.error(err.stack)
    process.exit(1)
})
