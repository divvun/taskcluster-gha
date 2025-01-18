import path from "node:path"
import * as builder from "~/builder"
import { Tar } from "~/util/shared"

export type Props = {
  filesPath: string
}

export type Output = {
  txzPath: string
}

export default async function createTxz({ filesPath }: Props): Promise<Output> {
  const globber = await builder.globber(path.join(filesPath, "*"), {
    followSymbolicLinks: false,
    implicitDescendants: false,
  })
  const files = await globber.glob()

  await Tar.bootstrap()
  const outputTxz = await Deno.makeTempFile({
    suffix: ".txz",
  }).name

  await Tar.createFlatTxz(files, outputTxz)
  return { txzPath: outputTxz }
}

async function run() {
  const filesPath = await builder.getInput("path", { required: true })
  const { txzPath } = await createTxz({ filesPath })
  await builder.setOutput("txz-path", txzPath)
}

if (builder.isGHA) {
  run().catch((err) => {
    console.error(err.stack)
    process.exit(1)
  })
}
