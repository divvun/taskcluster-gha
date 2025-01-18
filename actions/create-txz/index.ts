import path from "node:path"
import * as builder from "~/builder.ts"
import { Tar } from "~/util/shared.ts"

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

  const outputTxz = await Deno.makeTempFile({
    suffix: ".txz",
  })

  await Tar.createFlatTxz(files, outputTxz)
  return { txzPath: outputTxz }
}

// async function run() {
//   const filesPath = await builder.getInput("path", { required: true })
//   const { txzPath } = await createTxz({ filesPath })
//   await builder.setOutput("txz-path", txzPath)
// }
