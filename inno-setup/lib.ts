import * as exec from "@actions/exec"
import tmp from "tmp"
import path from "path"

import { DIVVUN_PFX, RFC3161_URL, secrets } from "../shared"

const ISCC_PATH = `"C:\\Program Files (x86)\\Inno Setup 6\\ISCC.exe"`

export async function makeInstaller(issPath: string, defines: string[] = [], sign: boolean = false): Promise<string> {

    const sec = await secrets()
    // const signCmd = `/S"signtool=signtool.exe sign ` +
    //     `/fd sha256 ` +
    //     `/tr ${RFC3161_URL} ` +
    //     `/td sha256 ` +
    //     `/sha1 ${sec.windows.sslCertThumbprintSandbox} ` +
    //     `$f`
        // ` <filepath here> `
        // `/f ${DIVVUN_PFX} ` +
        // `/p ${sec.windows.pfxPassword} $f"`

    const signCmd =
      `/S"signtool=curl -v ` +
      `-F file=@$f ` +
      `http://192.168.122.1:5000 ` +
      `-o $f"`;

    var isccCommand = `${ISCC_PATH} `
    if (sign) {
        isccCommand += signCmd
    }

    const installerOutput = tmp.dirSync({ keep: true }).name
    
    await exec.exec(isccCommand, [
        "/Qp", `/O${installerOutput}`, ...defines, issPath
    ])

    return path.join(installerOutput, "install.exe")
}
