import * as exec from "@actions/exec"
import tmp from "tmp"
import path from "path"

import { DIVVUN_PFX, RFC3161_URL, secrets } from "../shared"

const ISCC_PATH = `"C:\\Program Files (x86)\\Inno Setup 6\\ISCC.exe"`

export async function makeInstaller(issPath: string, defines: string[] = []): Promise<string> {
    const sec = await secrets()

    const signCmd = `/S"signtool=signtool.exe sign ` +
        `/fd sha256 ` +
        `/tr ${RFC3161_URL} ` +
        `/td sha256 ` +
        `/sha1 ${sec.windows.sslCertThumbprintSandbox}`
        // ` <filepath here> `
        // `/f ${DIVVUN_PFX} ` +
        // `/p ${sec.windows.pfxPassword} $f"`

    const installerOutput = tmp.dirSync({ keep: true }).name

    await exec.exec(`${ISCC_PATH} ${signCmd}`, [
        "/Qp", `/O${installerOutput}`, ...defines, issPath
    ])

    return path.join(installerOutput, "install.exe")
}
