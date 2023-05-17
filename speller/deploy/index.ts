import * as core from '@actions/core'
import toml from 'toml'
import fs from 'fs'
import path from 'path'

import {
    PahkatUploader,
    WindowsExecutableKind,
    RebootSpec,
    MacOSPackageTarget,
    nonUndefinedProxy,
    validateProductCode,
    ReleaseRequest,
    getArtifactSize
} from '../../shared'

import { SpellerManifest, SpellerType, derivePackageId } from '../manifest'


function loadManifest(manifestPath: string): SpellerManifest {
    const manifestString = fs.readFileSync(manifestPath, "utf8")
    return nonUndefinedProxy(toml.parse(manifestString), true)
}

function releaseReq(version: string, platform: string, dependencies: any, channel: string | null): ReleaseRequest {
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

async function run() {
    try {
        const spellerType = core.getInput('speller-type', { required: true }) as SpellerType
        const manifest = loadManifest(core.getInput('speller-manifest-path', { required: true }))
        const payloadPath = core.getInput('payload-path', { required: true })
        const version = core.getInput('version', { required: true });
        const channel = core.getInput('channel') || null;
        const nightlyChannel = core.getInput("nightly-channel", { required: true })

        const pahkatRepo = core.getInput('repo', { required: true });
        const packageId = derivePackageId(spellerType)

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
                WindowsExecutableKind.Inno, manifest.windows.system_product_code)

            const ext = path.extname(payloadPath)
            const pathItems = [packageId, version, platform]
            artifactPath = path.join(path.dirname(payloadPath), `${pathItems.join("_")}${ext}`)
            artifactUrl = `${PahkatUploader.ARTIFACTS_URL}${path.basename(artifactPath)}`
            artifactSize = await getArtifactSize(payloadPath)

            // Make the nightly channel be used if any channel except for the default.
            let deps: any = { "https://pahkat.uit.no/tools/packages/windivvun": "*" }
            if (channel != null) {
                const windivvun = `https://pahkat.uit.no/tools/packages/windivvun?channel=${nightlyChannel}`
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
                [RebootSpec.Install, RebootSpec.Uninstall])
        } else if (spellerType === SpellerType.MacOS) {
            platform = "macos"
            const pkgId = manifest.macos.system_pkg_id

            const ext = path.extname(payloadPath)
            const pathItems = [packageId, version, platform]
            artifactPath = path.join(path.dirname(payloadPath), `${pathItems.join("_")}${ext}`)
            artifactUrl = `${PahkatUploader.ARTIFACTS_URL}${path.basename(artifactPath)}`
            artifactSize = await getArtifactSize(payloadPath)

            // Make the nightly channel be used if any channel except for the default.
            let deps: any = { "https://pahkat.uit.no/tools/packages/macdivvun": "*" }
            if (channel != null) {
                const macdivvun = `https://pahkat.uit.no/tools/packages/macdivvun?channel=${nightlyChannel}`
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
                [MacOSPackageTarget.System, MacOSPackageTarget.User])
        } else if (spellerType === SpellerType.Mobile) {
            platform = "mobile"

            const ext = path.extname(payloadPath)
            const pathItems = [packageId, version, platform]
            artifactPath = path.join(path.dirname(payloadPath), `${pathItems.join("_")}${ext}`)
            artifactUrl = `${PahkatUploader.ARTIFACTS_URL}${path.basename(artifactPath)}`
            artifactSize = await getArtifactSize(payloadPath)

            payloadMetadata = await PahkatUploader.release.tarballPackage(
                releaseReq(version, platform, {}, channel),
                artifactUrl,
                1,
                artifactSize)
        } else {
            throw new Error(`Unsupported bundle type ${spellerType}`)
        }

        if (payloadMetadata == null) {
            throw new Error("Payload is null; this is a logic error.")
        }

        fs.writeFileSync("./metadata.toml", payloadMetadata, "utf8")

        if (platform == null) {
            throw new Error("Platform is null; this is a logic error.")
        }

        if (artifactPath == null) {
            throw new Error("artifact path is null; this is a logic error.")
        }

        if (artifactUrl == null) {
            throw new Error("artifact url is null; this is a logic error.")
        }

        core.debug(`Renaming from ${payloadPath} to ${artifactPath}`)
        fs.renameSync(payloadPath, artifactPath)

        await PahkatUploader.upload(artifactPath, artifactUrl, "./metadata.toml", repoPackageUrl)
    }
    catch (error: any) {
        core.setFailed(error.message);
    }
}

run().catch(err => {
    console.error(err.stack)
    process.exit(1)
})
