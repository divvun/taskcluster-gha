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
Object.defineProperty(exports, "__esModule", { value: true });
exports.Security = exports.downloadAppleRootCA = exports.downloadAppleWWDRCA = void 0;
const tc = __importStar(require("@actions/tool-cache"));
const core = __importStar(require("@actions/core"));
const shared_1 = require("./shared");
async function downloadAppleWWDRCA(version) {
    if (version == undefined) {
        return await tc.downloadTool("https://developer.apple.com/certificationauthority/AppleWWDRCA.cer");
    }
    else {
        return await tc.downloadTool(`https://www.apple.com/certificateauthority/AppleWWDRCA${version}.cer`);
    }
}
exports.downloadAppleWWDRCA = downloadAppleWWDRCA;
async function downloadAppleRootCA(version) {
    if (version == undefined) {
        return await tc.downloadTool("https://www.apple.com/appleca/AppleIncRootCertificate.cer");
    }
    else {
        return await tc.downloadTool(`https://www.apple.com/certificateauthority/AppleRootCA-${version}.cer`);
    }
}
exports.downloadAppleRootCA = downloadAppleRootCA;
class Security {
    constructor() { throw new Error("cannot be instantiated"); }
    static async run(subcommand, args) {
        return await shared_1.Bash.runScript(`security ${subcommand} ${args.join(" ")}`);
    }
    static async deleteKeychain(name) {
        return await Security.run("delete-keychain", [`${name}.keychain`]);
    }
    static async createKeychain(name, password) {
        core.setSecret(password);
        return await Security.run("create-keychain", ["-p", `"${password}"`, `${name}.keychain`]);
    }
    static async defaultKeychain(name) {
        await Security.run("list-keychains", ["-s", "/Users/admin/Library/Keychains/login.keychain-db", `${name}.keychain`]);
        return await Security.run("default-keychain", ["-s", `${name}.keychain`]);
    }
    static async unlockKeychain(name, password) {
        core.setSecret(password);
        return await Security.run("unlock-keychain", ["-p", `"${password}"`, `${name}.keychain`]);
    }
    static async setKeychainTimeout(name, timeout) {
        const intTimeout = (timeout | 0).toString();
        return await Security.run("set-keychain-settings", ["-t", intTimeout, "-u", `${name}.keychain`]);
    }
    static async import(keychainName, certOrKeyPath, keyPassword) {
        if (keyPassword != null) {
            core.setSecret(keyPassword);
            return await Security.run("import", [certOrKeyPath, "-k", `~/Library/Keychains/${keychainName}.keychain`, "-P", `"${keyPassword}"`, "-A", "-T", "/usr/bin/codesign", "-T", "/usr/bin/security", "-T", "/usr/bin/productbuild"]);
        }
        else {
            return await Security.run("import", [certOrKeyPath, "-k", `~/Library/Keychains/${keychainName}.keychain`, "-A"]);
        }
    }
    static async setKeyPartitionList(keychainName, password, partitionList) {
        core.setSecret(password);
        return await Security.run("set-key-partition-list", ["-S", partitionList.join(","), "-s", "-k", `"${password}"`, `${keychainName}.keychain`]);
    }
}
exports.Security = Security;
