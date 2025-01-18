import * as path from "@std/path"
import * as builder from "~/builder.ts"

const ISCC_PATH = `"C:\\Program Files (x86)\\Inno Setup 6\\ISCC.exe"`

export async function makeInstaller(
  issPath: string,
  defines: string[] = [],
): Promise<string> {
  const installerOutput = await Deno.makeTempDir()

  // Use our custom code signing service running on the CI machine
  const signCmd = `/S"signtool=curl -v ` +
    `-F file=@$f ` +
    `http://192.168.122.1:5000 ` +
    `-o $f"`

  await builder.exec(`${ISCC_PATH} ${signCmd}`, [
    "/Qp",
    `/O${installerOutput}`,
    ...defines,
    issPath,
  ])

  return path.join(installerOutput, "install.exe")
}
