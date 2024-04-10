import * as core from "@actions/core"
import { Apt, Pipx, ProjectJJ, Ssh } from "../../shared"

function getSudo() {
    const x = core.getInput("sudo")

    if (x === "true") {
        return true
    }
    
    if (x === "false") {
        return false
    }

    throw new Error("invalid value: " + x)
}

async function run() {
    const requiresSudo = getSudo()
    const requiresApertium = !!core.getInput("apertium")
    core.debug("Requires sudo? " + requiresSudo)

    const basePackages = [
        "autoconf",
        "autotools-dev",
        "bc",
        "build-essential",
        "gawk",
        "git",
        "pipx",
        "pkg-config",
        "python3-pip",
        "wget",
        "zip"
    ]

    const devPackages = ["foma", "hfst", "libhfst-dev", "cg3-dev", "divvun-gramcheck", "python3-corpustools", "python3-lxml", "python3-yaml"]

    const pipxPackages = ["https://github.com/divvun/giellaltgramtools"]

    if (requiresApertium) {
        devPackages.push("apertium")
        devPackages.push("apertium-dev")
        devPackages.push("apertium-lex-tools")
        devPackages.push("lexd")
    }

    await Apt.update(requiresSudo)
    await Apt.install(basePackages, requiresSudo)
    await ProjectJJ.addNightlyToApt(requiresSudo)
    await Apt.install(devPackages, requiresSudo)
    await Pipx.bootstrap(requiresSudo)
    await Pipx.install(pipxPackages, requiresSudo)
    await Ssh.cleanKnownHosts()
}

run().catch(err => {
    console.error(err.stack)
    process.exit(1)
})
