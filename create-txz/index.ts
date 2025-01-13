import path from "path"
import tmp from "tmp"

import * as builder from "~/builder"
import { Tar } from "../shared"

async function run() {
  const filesPath = await builder.getInput("path", { required: true })

  const globber = await builder.globber(path.join(filesPath, "*"), {
    followSymbolicLinks: false,
    implicitDescendants: false,
  })
  const files = await globber.glob()

  await Tar.bootstrap()
  const outputTxz = tmp.fileSync({
    postfix: ".txz",
    keep: true,
    tries: 3,
  }).name

  await Tar.createFlatTxz(files, outputTxz)
  await builder.setOutput("txz-path", outputTxz)
}

if (builder.isGHA) {
  run().catch((err) => {
    console.error(err.stack)
    process.exit(1)
  })
}
