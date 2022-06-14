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
const path_1 = __importDefault(require("path"));
const security_1 = require("../security");
const fs = __importStar(require("fs"));
const tmp = __importStar(require("tmp"));
const shared_1 = require("../shared");
function debug(input) {
    const [out, err] = input;
    if (out.trim() != '') {
        core.debug(out);
    }
    if (err.trim() != '') {
        core.error(err);
    }
}
async function setupMacOSKeychain() {
    const sec = await (0, shared_1.secrets)();
    const name = `divvun-build-${(0, shared_1.randomHexBytes)(6)}`;
    const password = (0, shared_1.randomString64)();
    try {
        debug(await security_1.Security.deleteKeychain(name));
    }
    catch (_) { }
    debug(await security_1.Security.createKeychain(name, password));
    debug(await security_1.Security.defaultKeychain(name));
    debug(await security_1.Security.unlockKeychain(name, password));
    debug(await security_1.Security.setKeychainTimeout(name, 36000));
    const certPath = await (0, security_1.downloadAppleWWDRCA)();
    debug(await security_1.Security.import(name, certPath));
    const certPath2 = await (0, security_1.downloadAppleWWDRCA)("G2");
    debug(await security_1.Security.import(name, certPath2));
    const certPath3 = await (0, security_1.downloadAppleRootCA)();
    debug(await security_1.Security.import(name, certPath3));
    const certPath4 = await (0, security_1.downloadAppleRootCA)("G2");
    debug(await security_1.Security.import(name, certPath4));
    const appP12Path = tmp.fileSync({ postfix: '.p12' });
    const appP12Buff = Buffer.from(sec.macos.appP12, 'base64');
    fs.writeFileSync(appP12Path.name, appP12Buff);
    debug(await security_1.Security.import(name, appP12Path.name, sec.macos.appP12Password));
    const installerP12Path = tmp.fileSync({ postfix: '.p12' });
    const installerP12Buff = Buffer.from(sec.macos.installerP12, 'base64');
    fs.writeFileSync(installerP12Path.name, installerP12Buff);
    debug(await security_1.Security.import(name, installerP12Path.name, sec.macos.installerP12Password));
    debug(await security_1.Security.setKeyPartitionList(name, password, ["apple-tool:", "apple:", "codesign:"]));
    debug(await shared_1.Bash.runScript(`security add-generic-password -A -s "${sec.macos.passwordChainItem}" -a "${sec.macos.developerAccount}" -w "${sec.macos.appPassword}" "${name}"`));
    debug(await shared_1.Bash.runScript(`security add-generic-password -A -s "${sec.macos.passwordChainItemMacos}" -a "${sec.macos.developerAccountMacos}" -w "${sec.macos.appPasswordMacos}" "${name}"`));
    debug(await shared_1.Bash.runScript(`security set-generic-password-partition-list -S "apple-tool:,apple:,codesign:,security:" -a "${sec.macos.developerAccount}" -k "${password}" ${name}.keychain`));
    debug(await shared_1.Bash.runScript(`security set-generic-password-partition-list -S "apple-tool:,apple:,codesign:,security:" -a "${sec.macos.developerAccountMacos}" -k "${password}" ${name}.keychain`));
    debug(await shared_1.Bash.runScript(`bash ${(0, shared_1.divvunConfigDir)()}/enc/install.sh`));
}
async function cloneConfigRepo(password) {
    core.setSecret(password);
    const dir = (0, shared_1.tmpDir)();
    await shared_1.Bash.runScript("git clone --depth=1 https://github.com/divvun/divvun-ci-config.git", { cwd: dir });
    const repoDir = (0, shared_1.divvunConfigDir)();
    await shared_1.Bash.runScript(`openssl aes-256-cbc -d -in ./config.txz.enc -pass pass:${password} -out config.txz -md md5`, { cwd: repoDir });
    await shared_1.Tar.bootstrap();
    await shared_1.Tar.extractTxz(path_1.default.resolve(repoDir, "config.txz"), repoDir);
}
async function bootstrapDependencies() {
}
async function run() {
    try {
        const divvunKey = core.getInput("key", { required: true });
        core.setSecret(divvunKey);
        console.log("Setting up environment");
        await cloneConfigRepo(divvunKey);
        if (process.platform === "win32") {
            core.addPath("C:\\Program Files (x86)\\Microsoft SDKs\\ClickOnce\\SignTool");
        }
        else if (process.platform == "darwin") {
            await setupMacOSKeychain();
            await bootstrapDependencies();
        }
        core.exportVariable("DIVVUN_CI_CONFIG", (0, shared_1.divvunConfigDir)());
        core.debug((0, shared_1.divvunConfigDir)());
    }
    catch (error) {
        core.setFailed(error.message);
    }
}
run().catch(err => {
    console.error(err.stack);
    process.exit(1);
});
