import { Bash } from "../../shared"
import * as core from "@actions/core"
import * as path from "path"

async function run() {
    const githubWorkspace = process.env.GITHUB_WORKSPACE
    if (githubWorkspace == null) {
        core.setFailed("GITHUB_WORKSPACE not set, failing.")
        return
    }
    const directory = path.join(githubWorkspace, "lang")
    await Bash.runScript("make check -j$(nproc)", { cwd: path.join(directory, "build") })
    Bash.runScript("cat tools/spellcheckers/test/fstbased/desktop/hfst/test-suite.log", { cwd: path.join(directory, "build") })
}

run().catch(err => {
    console.error(err.stack)
    const githubWorkspace = process.env.GITHUB_WORKSPACE
    if (githubWorkspace == null) {
        core.setFailed("GITHUB_WORKSPACE not set, failing.")
        return
    }
    const directory = path.join(githubWorkspace, "lang")
    Bash.runScript("cat tools/spellcheckers/test/fstbased/desktop/hfst/test-suite.log", { cwd: path.join(directory, "build") })
    process.exit(1)
})
