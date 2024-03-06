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
const shared_1 = require("../../shared");
const types_1 = require("../types");
const iss_1 = require("./iss");
const lib_1 = require("../../inno-setup/lib");
const shared_2 = require("../../shared");
const path_1 = __importDefault(require("path"));
const io = __importStar(require("@actions/io"));
const SEMVER_TAG_RE = /^v(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\.(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*))*))?(?:\+([0-9a-zA-Z-]+(?:\.[0-9a-zA-Z-]+)*))?$/;
async function run() {
    const keyboardType = core.getInput("keyboard-type", { required: true });
    const nightlyChannel = core.getInput("nightly-channel", { required: true });
    const bundlePath = (0, types_1.getBundle)();
    const project = shared_1.Kbdgen.loadProjectBundle(bundlePath);
    const locales = project.locales;
    core.debug("TESTING: NAMES AND DESCRIPTIONS FROM project.yaml:");
    for (const locale in locales) {
        core.debug(`  ${locales[locale].name}`);
        core.debug(`  ${locales[locale].description}`);
    }
    if (keyboardType === types_1.KeyboardType.iOS || keyboardType === types_1.KeyboardType.Android) {
        throw new Error(`Unsupported keyboard type for non-meta build: ${keyboardType}`);
    }
    let payloadPath;
    if (keyboardType === types_1.KeyboardType.MacOS) {
        if ((0, shared_1.isMatchingTag)(SEMVER_TAG_RE)) {
            core.debug("Using version from kbdgen project");
        }
        else {
            core.setOutput("channel", nightlyChannel);
            core.debug("Setting current version to nightly version");
            await shared_1.Kbdgen.setNightlyVersion(bundlePath, "macos");
        }
        payloadPath = await shared_1.Kbdgen.buildMacOS(bundlePath);
    }
    else if (keyboardType === types_1.KeyboardType.Windows) {
        if ((0, shared_1.isMatchingTag)(SEMVER_TAG_RE)) {
            core.debug("Using version from kbdgen project");
        }
        else {
            core.setOutput("channel", nightlyChannel);
            core.debug("Setting current version to nightly version");
            await shared_1.Kbdgen.setNightlyVersion(bundlePath, "windows");
        }
        await shared_2.PahkatPrefix.install(["kbdi"]);
        const kbdi_path = path_1.default.join(shared_2.PahkatPrefix.path, "pkg", "kbdi", "bin", "kbdi.exe");
        const kbdi_x64_path = path_1.default.join(shared_2.PahkatPrefix.path, "pkg", "kbdi", "bin", "kbdi-x64.exe");
        const outputPath = await shared_1.Kbdgen.buildWindows(bundlePath);
        await io.cp(kbdi_path, outputPath);
        await io.cp(kbdi_x64_path, outputPath);
        const issPath = await (0, iss_1.generateKbdInnoFromBundle)(bundlePath, outputPath);
        payloadPath = await (0, lib_1.makeInstaller)(issPath);
    }
    else {
        throw new Error(`Unhandled keyboard type: ${keyboardType}`);
    }
    core.setOutput("payload-path", payloadPath);
}
run().catch(err => {
    console.error(err.stack);
    process.exit(1);
});
