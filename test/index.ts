import * as core from "@actions/core"

async function run() {
    // TODO: Remove this when done testing
    core.debug("!!!RUNNING TEST ACTION!!!")
}

run().catch(err => {
    console.error(err.stack)
    process.exit(1)
})
