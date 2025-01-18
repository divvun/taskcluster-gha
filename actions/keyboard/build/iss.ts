// deno-lint-ignore-file no-explicit-any
import * as path from "@std/path"
import * as uuid from "@std/uuid"
import { InnoSetupBuilder } from "~/util/inno.ts"
import { Kbdgen } from "~/util/shared.ts"

const KBDGEN_NAMESPACE = "divvun.no"

function layoutTarget(layout: { [key: string]: any }) {
  const targets = layout["windows"] || {}
  return targets["config"] || {}
}

function getKbdId(locale: string, layout: { [key: string]: any }) {
  if ("id" in layout) {
    return "kbd" + layout["id"]
  }
  return "kbd" + locale.replace(/[^A-Za-z0-9-]/g, "").substr(0, 5)
}

export async function generateKbdInnoFromBundle(
  bundlePath: string,
  buildDir: string,
): Promise<string> {
  const bundle = await Kbdgen.loadTarget(bundlePath, "windows")
  const project = await Kbdgen.loadProjectBundle(bundlePath)
  const layouts = await Kbdgen.loadLayouts(bundlePath)

  const builder = new InnoSetupBuilder()

  builder
    .name(bundle.appName)
    .publisher(project.organisation)
    .version(bundle.version)
    .url(bundle.url)
    .productCode(`{${bundle.uuid}`)
    .defaultDirName("{pf}\\" + bundle.appName)
    .files((builder) => {
      builder.add(
        `${buildDir}\\kbdi.exe`,
        "{app}",
        ["restartreplace", "uninsrestartdelete", "ignoreversion"],
        "not Is64BitInstallMode",
      )
      builder.add(
        `${buildDir}\\kbdi-x64.exe`,
        "{app}",
        ["restartreplace", "uninsrestartdelete", "ignoreversion"],
        "Is64BitInstallMode",
        "kbdi.exe",
      )
      builder.add(
        `${buildDir}\\i386\\*`,
        "{sys}",
        ["restartreplace", "uninsrestartdelete", "ignoreversion"],
        "not Is64BitInstallMode",
      )
      builder.add(
        `${buildDir}\\amd64\\*`,
        "{sys}",
        ["restartreplace", "uninsrestartdelete", "ignoreversion"],
        "Is64BitInstallMode",
      )
      builder.add(
        `${buildDir}\\wow64\\*`,
        "{syswow64}",
        ["restartreplace", "uninsrestartdelete", "ignoreversion"],
        "Is64BitInstallMode",
      )

      return builder
    })

  for (const [locale, layout] of Object.entries(layouts)) {
    if ("windows" in layout) {
      await addLayoutToInstaller(builder, locale, layout)
    }
  }
  const fileName = path.join(buildDir, `install.all.iss`)
  console.log(builder.build())
  builder.write(fileName)
  return fileName
}

function stringToBytes(str: string) {
  const s = unescape(encodeURIComponent(str))

  const bytes = new Uint8Array(s.length)

  for (let i = 0; i < s.length; ++i) {
    bytes[i] = str.charCodeAt(i)
  }

  return bytes
}

async function addLayoutToInstaller(
  builder: InnoSetupBuilder,
  locale: string,
  layout: { [key: string]: any },
) {
  const target = layoutTarget(layout)
  const kbdId = getKbdId(locale, target)
  const dllName = kbdId + ".dll"
  const languageCode = target["locale"] || locale
  const languageName = target["languageName"]
  const layoutDisplayName = layout["displayNames"][locale]
  const guidStr = await uuid.v5.generate(KBDGEN_NAMESPACE, stringToBytes(kbdId))
  if (!layoutDisplayName) {
    throw new Error(`Display name for ${locale} not found`)
  }

  builder
    .run((builder) => {
      builder
        .withFilename("{app}\\kbdi.exe")
        .withParameter("keyboard_install")
        .withParameter(`-t ""${languageCode}""`)
      if (languageName) {
        builder.withParameter(`-l ""${languageName}""`)
      }
      builder
        .withParameter(`-g ""{{${guidStr}""`)
        .withParameter(`-d ${dllName}`)
        .withParameter(`-n ""${layoutDisplayName}""`)
        .withParameter("-e")
        .withFlags(["runhidden", "waituntilterminated"])
      return builder
    })
    .uninstallRun((builder) => {
      builder
        .withFilename("{app}\\kbdi.exe")
        .withParameter("keyboard_uninstall")
        .withParameter(`""${guidStr}""`)
        .withFlags(["runhidden", "waituntilterminated"])

      return builder
    })
    .icons((builder) => {
      builder
        .withName(`{group}\\Enable ${layoutDisplayName}`)
        .withFilename("{app}\\kbdi.exe")
        .withParameter("keyboard_enable")
        .withParameter(`-g ""{{${guidStr}""`)
        .withParameter(`-t ${languageCode}`)
        .withFlags([
          "runminimized",
          "preventpinning",
          "excludefromshowinnewinstall",
        ])

      return builder
    })
}
