import * as path from "@std/path"
import * as builder from "~/builder.ts"
import { Bash } from "~/util/shared.ts"

export default async function langCheck() {
  const githubWorkspace = builder.context.workspace
  if (githubWorkspace == null) {
    builder.setFailed("GITHUB_WORKSPACE not set, failing.")
    return
  }
  const directory = path.join(githubWorkspace, "lang")
  await Bash.runScript(
    "make check -j$(nproc) || cat tools/spellcheckers/test/fstbased/desktop/hfst/test-suite.log",
    { cwd: path.join(directory, "build") },
  )
}

// async function run() {
//   await langCheck()
// }
