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
const shared_1 = require("../../shared");
const core = __importStar(require("@actions/core"));
const path = __importStar(require("path"));
async function run() {
    core.debug("~~~HELLO FROM windows-codesign BRANCH~~~");
    const githubWorkspace = process.env.GITHUB_WORKSPACE;
    if (githubWorkspace == null) {
        core.setFailed("GITHUB_WORKSPACE not set, failing.");
        return;
    }
    const directory = path.join(githubWorkspace, "lang");
    await shared_1.Bash.runScript("make check -j$(nproc)", { cwd: path.join(directory, "build") });
}
run().catch(err => {
    console.error(err.stack);
    process.exit(1);
});
