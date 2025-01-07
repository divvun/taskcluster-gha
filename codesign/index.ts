import fs from "fs"
import path from "path"

import * as builder from "~/builder"
import { Bash, secrets } from "../shared"

const delay = (ms: number) => new Promise<void>((resolve) => setTimeout(() => resolve(), ms))

async function run() {
    const filePath = path.resolve(builder.getInput('path', { required: true }))
    const fileName = filePath.split(path.sep).pop()
    const sec = await secrets()
    const isInstaller = builder.getInput('isInstaller') || false

    if (process.platform == "win32") {
        builder.debug("  Windows platform");
        // Call our internal API to sign the file
        // This overwrites the unsigned file
        builder.exec("curl", ["-v", "-X", "POST", "-F", `file=@${filePath}`, "http://192.168.122.1:5000", "-o", `${filePath}`]);
        await builder.setOutput("signed-path", filePath);
    } else if (process.platform === "darwin") {
        const { developerAccount, appPassword, appCodeSignId, installerCodeSignId, teamId } = sec.macos

        // Codesign with hardene`${filePath}.signed`d runtime and timestamp
        if (isInstaller != "true") {
            await builder.exec("codesign", ["-s", appCodeSignId, filePath, "--timestamp", "--options=runtime"])
        } else {
            await builder.exec("productsign", ["--timestamp", "--sign", installerCodeSignId, filePath, `${filePath}.signed`])
            await builder.exec(`mv ${filePath}.signed ${filePath}`)
        }

        // Do some notarization
        const zipPath = path.resolve(path.dirname(filePath), "upload.zip")

        // Create zip file the way that Apple demands
        await builder.exec("ditto", ["-c", "-k", "--keepParent", filePath, zipPath])

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
