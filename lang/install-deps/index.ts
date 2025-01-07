import * as builder from "~/builder"
import { Apt, Pip, Pipx, ProjectJJ, Ssh } from "../../shared"

async function getSudo() {
    const x = await builder.getInput("sudo")

    if (x === "true") {
        return true
    }
    
    if (x === "false") {
        return false
    }

    throw new Error("invalid value: " + x)
}

async function run() {
    const requiresSudo = await getSudo()
    const requiresApertium = !!await builder.getInput("apertium")
    builder.debug("Requires sudo? " + requiresSudo)

    const basePackages = [
        "autoconf",
        "autotools-dev",
        "bc",
        "build-essential",
        "gawk",
        "git",
        "pkg-config",
        "python3-pip",
        "wget",
        "zip"
    ]

    const devPackages = ["foma", "hfst", "libhfst-dev", "cg3-dev", "divvun-gramcheck", "python3-corpustools", "python3-lxml", "python3-yaml", "python3.10-venv", "hfst-ospell"]
    const pipPackages = ["pipx"]
    const pipxPackages = ["git+https://github.com/divvun/giellaltgramtools"]

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
    await Pip.install(pipPackages)
    await Pipx.ensurepath()
    await Pipx.install(pipxPackages)
    await Ssh.cleanKnownHosts()
}

run().catch(err => {
    console.error(err.stack)
    process.exit(1)
})
