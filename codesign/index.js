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
const exec = __importStar(require("@actions/exec"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const node_fetch_1 = __importDefault(require("node-fetch"));
const form_data_1 = __importDefault(require("form-data"));
const tmp_1 = __importDefault(require("tmp"));
const shared_1 = require("../shared");
const delay = (ms) => new Promise((resolve) => setTimeout(() => resolve(), ms));
async function run() {
    const filePath = path_1.default.resolve(core.getInput("path", { required: true }));
    const fileName = filePath.split(path_1.default.sep).pop();
    const sec = await (0, shared_1.secrets)();
    const isInstaller = core.getInput("isInstaller") || false;
    core.debug(`Code signing: ${filePath}`);
    if (process.platform == "win32") {
        if (!fileName) {
            throw new Error("Name of file to be signed not found");
        }
        try {
            const url = "http://192.168.122.1:5000/";
            const formData = new form_data_1.default();
            formData.append("file", fs_1.default.createReadStream(filePath));
            const response = await (0, node_fetch_1.default)(url, {
                method: "POST",
                body: formData,
            });
            if (!response.ok) {
                throw new Error("Network response was not ok");
            }
            const buffer = response.arrayBuffer();
            const signedOutputDir = tmp_1.default.dirSync({ keep: true }).name;
            const signedOutputPath = path_1.default.join(signedOutputDir, fileName);
            fs_1.default.writeFileSync(signedOutputPath, Buffer.from(buffer));
            core.debug(`Signed file saved to ${signedOutputPath}`);
            core.setOutput("signed-path", signedOutputPath);
        }
        catch (error) {
            console.error("There was a problem with the codesigning fetch operation:", error);
        }
        ;
    }
    else if (process.platform === "darwin") {
        const { developerAccount, appPassword, appCodeSignId, installerCodeSignId, teamId } = sec.macos;
        if (isInstaller != "true") {
            await exec.exec("codesign", ["-s", appCodeSignId, filePath, "--timestamp", "--options=runtime"]);
        }
        else {
            await exec.exec("productsign", ["--timestamp", "--sign", installerCodeSignId, filePath, `${filePath}.signed`]);
            await exec.exec(`mv ${filePath}.signed ${filePath}`);
        }
        const zipPath = path_1.default.resolve(path_1.default.dirname(filePath), "upload.zip");
        await exec.exec("ditto", ["-c", "-k", "--keepParent", filePath, zipPath]);
        const [response, err] = await shared_1.Bash.runScript(`
xcrun notarytool submit -v \
    --apple-id "${developerAccount}" \
    --password "${appPassword}" \
    --team-id "${teamId}" \
    --output-format json \
    --wait "${zipPath}"`);
        console.log(response);
        const parsedResponse = JSON.parse(response);
        if (parsedResponse['status'] != "Accepted" && parsedResponse['success'] != true) {
            throw new Error(`Got failure status: ${response}.\n ${err}`);
        }
        fs_1.default.unlinkSync(zipPath);
    }
}
run().catch(err => {
    console.error(err.stack);
    process.exit(1);
});
