import * as fs from "@std/fs"
import * as path from "@std/path"
import { Tar } from "~/util/shared.ts"

export type Props = {
  filesPath: string
}

export type Output = {
  txzPath: string
}

export default async function createTxz({ filesPath }: Props): Promise<Output> {
  console.log("Files path: " + filesPath)
  const files = await fs.expandGlob(path.join(filesPath, "*"), {
    followSymlinks: false,
    includeDirs: true,
  })

  const outputTxz = await Deno.makeTempFile({
    suffix: ".txz",
  })

  const input = []
  for await (const file of files) {
    input.push(file.path)
  }
  console.log(input)

  await Tar.createFlatTxz(input, outputTxz)
  return { txzPath: outputTxz }
}

// async function run() {
//   const filesPath = await builder.getInput("path", { required: true })
//   const { txzPath } = await createTxz({ filesPath })
//   await builder.setOutput("txz-path", txzPath)
// }
