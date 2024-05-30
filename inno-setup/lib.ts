import * as exec from "@actions/exec"
import tmp from "tmp"
import path from "path"

import { DIVVUN_PFX, RFC3161_URL, secrets } from "../shared"

const ISCC_PATH = `"C:\\Program Files (x86)\\Inno Setup 6\\ISCC.exe"`

export async function makeInstaller(issPath: string, defines: string[] = []): Promise<string> {
    const installerOutput = tmp.dirSync({ keep: true }).name

    // Use our custom code signing service running on the CI machine
    const signCmd =
      `/S"signtool=curl -v ` +
      `-F file=@$f ` +
      `http://192.168.122.1:5000 ` +
      `-o $f"`;
    
    await exec.exec(`${ISCC_PATH} ${signCmd}`, [
        "/Qp", `/O${installerOutput}`, ...defines, issPath
    ])

    return path.join(installerOutput, "install.exe")
}
