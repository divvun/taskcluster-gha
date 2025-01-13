import * as builder from "~/builder"
import { Powershell } from "../shared"

export type Props = {
  tags: string[]
}

export default async function enableLanguages({ tags }: Props) {
  let script = `$langs = Get-WinUserLanguageList; `
  for (const tag of tags) {
    script += `$langs.add('${tag}'); `
  }

  script += `Set-WinUserLanguageList -LanguageList $langs;`
  await Powershell.runScript(script)
}

async function run() {
  const tags = (await builder.getInput("tags", { required: true }))
    .split(",")
    .map((x) => x.trim())

  await enableLanguages({ tags })
}

if (builder.isGHA) {
  run().catch((err) => {
    console.error(err.stack)
    process.exit(1)
  })
}