"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
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
    if (mod != null) for (var k in mod) if (k !== "default" && Object.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const core = __importStar(require("@actions/core"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const toml_1 = __importDefault(require("toml"));
const shared_1 = require("../shared");
function getCargoToml() {
    const cargo = core.getInput("cargo") || null;
    if (cargo == null) {
        return null;
    }
    if (cargo === "true") {
        return shared_1.nonUndefinedProxy(toml_1.default.parse(fs_1.default.readFileSync("./Cargo.toml", "utf8")));
    }
    return shared_1.nonUndefinedProxy(toml_1.default.parse(fs_1.default.readFileSync(cargo, "utf8")));
}
function getSpellerManifestToml() {
    const manifest = core.getInput("speller-manifest") || null;
    if (manifest == null) {
        return null;
    }
    if (manifest === "true") {
        return shared_1.nonUndefinedProxy(toml_1.default.parse(fs_1.default.readFileSync("./manifest.toml", "utf8")));
    }
    return shared_1.nonUndefinedProxy(toml_1.default.parse(fs_1.default.readFileSync(manifest, "utf8")));
}
async function getXcodeMarketingVersion() {
    const input = core.getInput("xcode") || null;
    let cwd;
    if (input != null && input !== "true") {
        cwd = input.trim();
    }
    const [out] = await shared_1.Bash.runScript(`xcodebuild -showBuildSettings | grep -i 'MARKETING_VERSION' | sed 's/[ ]*MARKETING_VERSION = //'`, { cwd });
    return out.trim();
}
const SEMVER_TAG_RE = /^v(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\.(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*))*))?(?:\+([0-9a-zA-Z-]+(?:\.[0-9a-zA-Z-]+)*))?$/;
function deriveNightly() {
    return !shared_1.isMatchingTag(SEMVER_TAG_RE);
}
function getPlistPath() {
    const plistPath = core.getInput("plist") || null;
    if (plistPath == null) {
        return null;
    }
    return path_1.default.resolve(plistPath);
}
function getVersionFromFile() {
    const filePath = core.getInput("filepath") || null;
    if (filePath == null) {
        return null;
    }
    const version = fs_1.default.readFileSync(path_1.default.resolve(filePath), "utf-8").trimEnd();
    return version;
}
async function run() {
    const isXcode = core.getInput("xcode") || null;
    const isNightly = deriveNightly();
    const cargoToml = getCargoToml();
    const spellerManifest = getSpellerManifestToml();
    const plistPath = getPlistPath();
    const csharp = core.getInput("csharp") || null;
    const versionFromFile = getVersionFromFile();
    const instaStable = core.getInput("insta-stable") || false;
    const nightlyChannel = core.getInput("nightly-channel", { required: true });
    let version;
    if (cargoToml != null) {
        core.debug("Getting version from TOML");
        version = cargoToml.package.version;
    }
    else if (csharp != null) {
        core.debug("Getting version from GitVersioning C#");
        version = process.env.GitBuildVersionSimple;
    }
    else if (spellerManifest != null) {
        core.debug("Getting version from speller manifest");
        version = spellerManifest.version;
    }
    else if (plistPath != null) {
        core.debug('Getting version from plist');
        const result = (await shared_1.Bash.runScript(`/usr/libexec/PlistBuddy -c "Print CFBundleShortVersionString" "${plistPath}"`)).join("").trim();
        if (result === "") {
            throw new Error("No version found in plist");
        }
        version = result;
    }
    else if (isXcode) {
        version = await getXcodeMarketingVersion();
    }
    else if (versionFromFile != null) {
        version = versionFromFile;
    }
    else {
        throw new Error("Did not find a suitable mechanism to derive the version.");
    }
    if (version == null || version.trim() === "") {
        throw new Error("Did not find any version.");
    }
    if (isNightly) {
        core.debug(`Generating nightly version for channel ${nightlyChannel}`);
        version = await shared_1.versionAsNightly(version);
        core.setOutput("channel", nightlyChannel);
    }
    else {
        if (instaStable != "true") {
            core.setOutput("channel", "beta");
        }
        else {
            if (version.startsWith("0")) {
                core.setOutput("channel", "beta");
            }
        }
    }
    core.debug("Setting version to: " + version);
    core.setOutput("version", version);
}
run().catch(err => {
    console.error(err.stack);
    process.exit(1);
});
