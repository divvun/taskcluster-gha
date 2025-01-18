import { PahkatPrefix } from "~/util/shared.ts"

export type Props = {
  repoUrl: string
  channel: string | null
  packages: string[]
}

export default async function pahkatInit({
  repoUrl,
  channel,
  packages,
}: Props) {
  await PahkatPrefix.bootstrap()
  await PahkatPrefix.addRepo(repoUrl, channel ?? undefined)
  await PahkatPrefix.install(packages)
}

// async function run() {
//   const repoUrl = await builder.getInput("repo", { required: true })
//   const channel = await builder.getInput("channel")
//   const packages = (await builder.getInput("packages", { required: true }))
//     .split(",")
//     .map((x) => x.trim())

//   await pahkatInit({ repoUrl, channel, packages })
// }
