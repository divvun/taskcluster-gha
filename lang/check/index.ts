import * as path from "path"
import * as builder from "~/builder"
import { Bash } from "../../shared"

async function run() {
  const githubWorkspace = process.env.GITHUB_WORKSPACE
  if (githubWorkspace == null) {
    builder.setFailed("GITHUB_WORKSPACE not set, failing.")
    return
  }
  const directory = path.join(githubWorkspace, "lang")
  await Bash.runScript(
    "make check -j$(nproc) || cat tools/spellcheckers/test/fstbased/desktop/hfst/test-suite.log",
    { cwd: path.join(directory, "build") }
  )
}

if (builder.isGHA) {
  run().catch((err) => {
    console.error(err.stack)
    process.exit(1)
  })
}