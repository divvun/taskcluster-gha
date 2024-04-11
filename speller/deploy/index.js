"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const core = __importStar(require("@actions/core"));
const toml_1 = __importDefault(require("toml"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const shared_1 = require("../../shared");
const manifest_1 = require("../manifest");
function loadManifest(manifestPath) {
    const manifestString = fs_1.default.readFileSync(manifestPath, "utf8");
    return (0, shared_1.nonUndefinedProxy)(toml_1.default.parse(manifestString), true);
}
function releaseReq(version, platform, dependencies, channel) {
    const req = {
        version,
        platform,
    };
    if (Object.keys(dependencies).length) {
        req.dependencies = dependencies;
    }
    if (channel) {
        req.channel = channel;
    }
    return req;
}
async function run() {
    try {
        const spellerType = core.getInput('speller-type', { required: true });
        const manifestPath = core.getInput('speller-manifest-path', { required: true });
        const manifest = loadManifest(manifestPath);
        const payloadPath = core.getInput('payload-path', { required: true });
        const version = core.getInput('version', { required: true });
        const channel = core.getInput('channel') || null;
        const nightlyChannel = core.getInput("nightly-channel", { required: true });
        const pahkatRepo = core.getInput('repo', { required: true });
        const packageId = (0, manifest_1.derivePackageId)(spellerType);
        const repoPackageUrl = `${pahkatRepo}packages/${packageId}`;
        let payloadMetadata = null;
        let platform = null;
        let artifactPath = null;
        let artifactUrl = null;
        let artifactSize = null;
        if (spellerType === manifest_1.SpellerType.Windows) {
            platform = "windows";
            const productCode = (0, shared_1.validateProductCode)(shared_1.WindowsExecutableKind.Inno, manifest.windows.system_product_code);
            const ext = path_1.default.extname(payloadPath);
            const pathItems = [packageId, version, platform];
            artifactPath = path_1.default.join(path_1.default.dirname(payloadPath), `${pathItems.join("_")}${ext}`);
            artifactUrl = `${shared_1.PahkatUploader.ARTIFACTS_URL}${path_1.default.basename(artifactPath)}`;
            artifactSize = (0, shared_1.getArtifactSize)(payloadPath);
            let deps = { "https://pahkat.uit.no/tools/packages/windivvun": "*" };
            if (channel != null) {
                const windivvun = `https://pahkat.uit.no/tools/packages/windivvun?channel=${nightlyChannel}`;
                deps = {};
                deps[windivvun] = "*";
            }
            payloadMetadata = await shared_1.PahkatUploader.release.windowsExecutable(releaseReq(version, platform, deps, channel), artifactUrl, 1, artifactSize, shared_1.WindowsExecutableKind.Inno, productCode, [shared_1.RebootSpec.Install, shared_1.RebootSpec.Uninstall]);
        }
        else if (spellerType === manifest_1.SpellerType.MacOS) {
            platform = "macos";
            const pkgId = manifest.macos.system_pkg_id;
            const ext = path_1.default.extname(payloadPath);
            const pathItems = [packageId, version, platform];
            artifactPath = path_1.default.join(path_1.default.dirname(payloadPath), `${pathItems.join("_")}${ext}`);
            artifactUrl = `${shared_1.PahkatUploader.ARTIFACTS_URL}${path_1.default.basename(artifactPath)}`;
            artifactSize = (0, shared_1.getArtifactSize)(payloadPath);
            let deps = { "https://pahkat.uit.no/tools/packages/macdivvun": "*" };
            if (channel != null) {
                const macdivvun = `https://pahkat.uit.no/tools/packages/macdivvun?channel=${nightlyChannel}`;
                deps = {};
                deps[macdivvun] = "*";
            }
            payloadMetadata = await shared_1.PahkatUploader.release.macosPackage(releaseReq(version, platform, deps, channel), artifactUrl, 1, artifactSize, pkgId, [shared_1.RebootSpec.Install, shared_1.RebootSpec.Uninstall], [shared_1.MacOSPackageTarget.System, shared_1.MacOSPackageTarget.User]);
        }
        else if (spellerType === manifest_1.SpellerType.Mobile) {
            platform = "mobile";
            const ext = path_1.default.extname(payloadPath);
            const pathItems = [packageId, version, platform];
            artifactPath = path_1.default.join(path_1.default.dirname(payloadPath), `${pathItems.join("_")}${ext}`);
            artifactUrl = `${shared_1.PahkatUploader.ARTIFACTS_URL}${path_1.default.basename(artifactPath)}`;
            artifactSize = (0, shared_1.getArtifactSize)(payloadPath);
            payloadMetadata = await shared_1.PahkatUploader.release.tarballPackage(releaseReq(version, platform, {}, channel), artifactUrl, 1, artifactSize);
        }
        else {
            throw new Error(`Unsupported bundle type ${spellerType}`);
        }
        if (payloadMetadata == null) {
            throw new Error("Payload is null; this is a logic error.");
        }
        fs_1.default.writeFileSync("./metadata.toml", payloadMetadata, "utf8");
        if (platform == null) {
            throw new Error("Platform is null; this is a logic error.");
        }
        if (artifactPath == null) {
            throw new Error("artifact path is null; this is a logic error.");
        }
        if (artifactUrl == null) {
            throw new Error("artifact url is null; this is a logic error.");
        }
        core.debug(`Renaming from ${payloadPath} to ${artifactPath}`);
        fs_1.default.renameSync(payloadPath, artifactPath);
        if (spellerType === manifest_1.SpellerType.Windows) {
            await shared_1.PahkatUploader.upload(artifactPath, artifactUrl, "./metadata.toml", repoPackageUrl);
        }
        else {
            await shared_1.PahkatUploader.upload(artifactPath, artifactUrl, "./metadata.toml", repoPackageUrl, null, manifestPath, "speller");
        }
    }
    catch (error) {
        core.setFailed(error.message);
    }
}
run().catch(err => {
    console.error(err.stack);
    process.exit(1);
});
