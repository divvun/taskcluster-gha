import * as builder from "~/builder"
import { PahkatPrefix } from "../../shared"

async function run() {
    const repoUrl = builder.getInput('repo', { required: true })
    const channel = builder.getInput('channel')
    const packages = builder.getInput('packages', { required: true }).split(",").map(x => x.trim())
    
    await PahkatPrefix.bootstrap()
    await PahkatPrefix.addRepo(repoUrl, channel)
    await PahkatPrefix.install(packages)
}

run().catch(err => {
    console.error(err.stack)
    process.exit(1)
  })
  
