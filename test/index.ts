import * as core from "@actions/core"

async function run() {
    // TODO: Remove this when done testing
    const input = core.getInput("test");
    core.debug("!!!RUNNING TEST ACTION!!!")
    core.debug(`  input: ${input}`)
}

run().catch(err => {
    console.error(err.stack)
    process.exit(1)
})
