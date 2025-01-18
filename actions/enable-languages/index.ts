import { Powershell } from "~/util/shared.ts"

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

// async function run() {
//   const tags = (await builder.getInput("tags", { required: true }))
//     .split(",")
//     .map((x) => x.trim())

//   await enableLanguages({ tags })
// }
