import * as core from '@actions/core'
import * as exec from '@actions/exec'

import fs from "fs"
import path from "path"
import fetch from "node-fetch"
import FormData from "form-data"
import tmp from "tmp"

import { secrets, DIVVUN_PFX, Bash, RFC3161_URL } from "../shared"

const delay = (ms: number) => new Promise<void>((resolve) => setTimeout(() => resolve(), ms))

async function run() {
    core.debug("~~~Running code signing~~~");
    const filePath = path.resolve(core.getInput("path", { required: true }));
    core.debug(`  filePath: ${filePath}`);
    const fileName = filePath.split(path.sep).pop();
    const sec = await secrets();
    const isInstaller = core.getInput("isInstaller") || false;
    core.debug("  past variable defs");

    if (process.platform == "win32") {
        // Send to our internal API for code signing
        if (!fileName) {
            throw new Error("Name of file to be signed not found");
        }

        try {
            // URL to send the request
            const url = "http://192.168.122.1:5000/";

            // Create form data
            const formData = new FormData();
            formData.append("file", fs.createReadStream(filePath));

            // Send POST request
            const response = await fetch(url, {
                method: "POST",
                body: formData,
            })

            // Ensure the response is ok
            if (!response.ok) {
                throw new Error("Network response was not ok");
            }
            // Read the response as binary
            const buffer = response.arrayBuffer();
            // Save the response to a file
            const signedOutputDir = tmp.dirSync({ keep: true }).name;
            const signedOutputPath = path.join(signedOutputDir, fileName);
            fs.writeFileSync(signedOutputPath, Buffer.from(buffer));
            core.debug(`Signed file saved to ${signedOutputPath}`);
            core.setOutput("signed-path", signedOutputPath);
        } catch (error) {
          console.error(
            "There was a problem with the codesigning fetch operation:",
            error
          );
        };
    } else if (process.platform === "darwin") {
        const { developerAccount, appPassword, appCodeSignId, installerCodeSignId, teamId } = sec.macos

        // Codesign with hardene`${filePath}.signed`d runtime and timestamp
        if (isInstaller != "true") {
            await exec.exec("codesign", ["-s", appCodeSignId, filePath, "--timestamp", "--options=runtime"])
        } else {
            await exec.exec("productsign", ["--timestamp", "--sign", installerCodeSignId, filePath, `${filePath}.signed`])
            await exec.exec(`mv ${filePath}.signed ${filePath}`)
        }

        // Do some notarization
        const zipPath = path.resolve(path.dirname(filePath), "upload.zip")

        // Create zip file the way that Apple demands
        await exec.exec("ditto", ["-c", "-k", "--keepParent", filePath, zipPath])

        // Upload the zip
        const [response, err] = await Bash.runScript(`
xcrun notarytool submit -v \
    --apple-id "${developerAccount}" \
    --password "${appPassword}" \
    --team-id "${teamId}" \
    --output-format json \
    --wait "${zipPath}"`)

        console.log(response)

        const parsedResponse = JSON.parse(response)

        if (parsedResponse['status'] != "Accepted" && parsedResponse['success'] != true) {
            throw new Error(`Got failure status: ${response}.\n ${err}`)
        }

        fs.unlinkSync(zipPath)
    }
}

run().catch(err => {
    console.error(err.stack)
    process.exit(1)
})
