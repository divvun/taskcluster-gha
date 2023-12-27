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
exports.derivePackageId = void 0;
const core = __importStar(require("@actions/core"));
const github = __importStar(require("@actions/github"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const shared_1 = require("../../shared");
const types_1 = require("../types");
function derivePackageId() {
    const repo = github.context.repo.repo;
    if (!repo.startsWith("keyboard-")) {
        throw new Error("Repository is not prefixed with 'keyboard");
    }
    const lang = github.context.repo.repo.split("keyboard-")[1];
    return `keyboard-${lang}`;
}
exports.derivePackageId = derivePackageId;
function releaseReq(version, platform, channel) {
    const req = {
        version,
        platform
    };
    console.log("releaseReq", version, channel);
    if (channel) {
        req.channel = channel;
    }
    else {
        if (version.startsWith("0")) {
            console.log("channel: beta");
            req.channel = "beta";
        }
        else {
            console.log("channel: stable");
            req.channel = "";
        }
    }
    return req;
}
async function run() {
    const payloadPath = core.getInput('payload-path', { required: true });
    const keyboardType = core.getInput('keyboard-type', { required: true });
    const bundlePath = (0, types_1.getBundle)();
    const channel = core.getInput('channel') || null;
    const pahkatRepo = core.getInput('repo', { required: true });
    const packageId = derivePackageId();
    const repoPackageUrl = `${pahkatRepo}packages/${packageId}`;
    let payloadMetadata = null;
    let platform = null;
    let version = null;
    let artifactPath = null;
    let artifactUrl = null;
    let artifactSize = null;
    if (keyboardType === types_1.KeyboardType.MacOS) {
        const target = shared_1.Kbdgen.loadTarget(bundlePath, "macos");
        var pkgId = target.packageId;
        const lang = github.context.repo.repo.split("keyboard-")[1];
        pkgId = `${pkgId}.keyboardlayout.${lang}`;
        version = "0.0.0.0.0.0.0.0";
        platform = "macos";
        const ext = path_1.default.extname(payloadPath);
        const pathItems = [packageId, version, platform];
        artifactPath = path_1.default.join(path_1.default.dirname(payloadPath), `${pathItems.join("_")}${ext}`);
        artifactUrl = `${shared_1.PahkatUploader.ARTIFACTS_URL}${path_1.default.basename(artifactPath)}`;
        artifactSize = (0, shared_1.getArtifactSize)(payloadPath);
        payloadMetadata = await shared_1.PahkatUploader.release.macosPackage(releaseReq(version, platform, channel), artifactUrl, 1, artifactSize, pkgId, [shared_1.RebootSpec.Install, shared_1.RebootSpec.Uninstall], [shared_1.MacOSPackageTarget.System, shared_1.MacOSPackageTarget.User]);
    }
    else if (keyboardType === types_1.KeyboardType.Windows) {
        const target = shared_1.Kbdgen.loadTarget(bundlePath, "windows");
        const productCode = (0, shared_1.validateProductCode)(shared_1.WindowsExecutableKind.Inno, target.uuid);
        version = target.version;
        platform = "windows";
        const ext = path_1.default.extname(payloadPath);
        const pathItems = [packageId, version, platform];
        artifactPath = path_1.default.join(path_1.default.dirname(payloadPath), `${pathItems.join("_")}${ext}`);
        artifactUrl = `${shared_1.PahkatUploader.ARTIFACTS_URL}${path_1.default.basename(artifactPath)}`;
        artifactSize = (0, shared_1.getArtifactSize)(payloadPath);
        payloadMetadata = await shared_1.PahkatUploader.release.windowsExecutable(releaseReq(version, platform, channel), artifactUrl, 1, artifactSize, shared_1.WindowsExecutableKind.Inno, productCode, [shared_1.RebootSpec.Install, shared_1.RebootSpec.Uninstall]);
    }
    else {
        throw new Error("Unhandled keyboard type: " + keyboardType);
    }
    if (payloadMetadata == null) {
        throw new Error("Payload is null; this is a logic error.");
    }
    if (version == null) {
        throw new Error("Version is null; this is a logic error.");
    }
    if (platform == null) {
        throw new Error("Platform is null; this is a logic error.");
    }
    if (artifactPath == null) {
        throw new Error("artifact path is null; this is a logic error.");
    }
    if (artifactUrl == null) {
        throw new Error("artifact url is null; this is a logic error.");
    }
    fs_1.default.writeFileSync("./metadata.toml", payloadMetadata, "utf8");
    core.debug(`Renaming from ${payloadPath} to ${artifactPath}`);
    fs_1.default.renameSync(payloadPath, artifactPath);
    await shared_1.PahkatUploader.upload(artifactPath, artifactUrl, "./metadata.toml", repoPackageUrl);
}
run().catch(err => {
    console.error(err.stack);
    process.exit(1);
});
