import * as builder from "~/builder"
import { PahkatPrefix } from "../../shared"

async function run() {
  const repoUrl = await builder.getInput("repo", { required: true })
  const channel = await builder.getInput("channel")
  const packages = (await builder.getInput("packages", { required: true }))
    .split(",")
    .map((x) => x.trim())

  await PahkatPrefix.bootstrap()
  await PahkatPrefix.addRepo(repoUrl, channel)
  await PahkatPrefix.install(packages)
}

run().catch((err) => {
  console.error(err.stack)
  process.exit(1)
})
