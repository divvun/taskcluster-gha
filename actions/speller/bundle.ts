import * as path from "@std/path"
import * as toml from "@std/toml"

import { makeInstaller } from "~/actions/inno-setup/lib.ts"
import * as builder from "~/builder.ts"
import { InnoSetupBuilder } from "~/util/inno.ts"
import { DivvunBundler, SpellerPaths, Tar, ThfstTools } from "~/util/shared.ts"
import {
  deriveLangTag,
  derivePackageId,
  SpellerManifest,
  SpellerType,
} from "../manifest.ts"

export type Props = {
  version: string
  spellerType: SpellerType
  manifest: SpellerManifest
  spellerPaths: SpellerPaths
}

export type Output = {
  payloadPath: string
}

export default async function spellerBundle({
  version,
  spellerType,
  manifest,
  spellerPaths,
}: Props): Promise<Output> {
  const { spellername } = manifest
  const packageId = derivePackageId(spellerType)
  const langTag = deriveLangTag(false)

  let payloadPath: string

  if (spellerType == SpellerType.Mobile) {
    const bhfstPaths = []

    for (const [langTag, zhfstPath] of Object.entries(spellerPaths.mobile)) {
      const bhfstPath = await ThfstTools.zhfstToBhfst(zhfstPath)
      const langTagBhfst = `${path.dirname(bhfstPath)}/${langTag}.bhfst`

      builder.debug(`Copying ${bhfstPath} to ${langTagBhfst}`)
      await builder.cp(bhfstPath, langTagBhfst)
      bhfstPaths.push(langTagBhfst)
    }

    payloadPath = path.resolve(`./${packageId}_${version}_mobile.txz`)
    builder.debug(
      `Creating txz from [${bhfstPaths.join(", ")}] at ${payloadPath}`,
    )
    await Tar.createFlatTxz(bhfstPaths, payloadPath)
  } else if (spellerType == SpellerType.Windows) {
    if (manifest.windows.system_product_code == null) {
      throw new Error("Missing system_product_code")
    }

    // Fix names of zhfst files to match their tag
    const zhfstPaths: string[] = []
    await Deno.mkdir("./zhfst")
    for (const [key, value] of Object.entries(spellerPaths.desktop)) {
      const out = path.resolve(path.join("./zhfst", `${key}.zhfst`))
      await Deno.rename(value, out)
      zhfstPaths.push(out)
    }

    const innoBuilder = new InnoSetupBuilder()

    innoBuilder
      .name(`${spellername} Speller`)
      .version(version)
      .publisher("Universitetet i Tromsø - Norges arktiske universitet")
      .url("http://divvun.no/")
      .productCode(manifest.windows.system_product_code)
      .defaultDirName(`{commonpf}\\WinDivvun\\Spellers\\${langTag}`)
      .files((files) => {
        const flags = ["ignoreversion", "recursesubdirs", "uninsrestartdelete"]

        for (const zhfstPath of zhfstPaths) {
          files.add(zhfstPath, "{app}", flags)
        }

        files.add("speller.toml", "{app}", flags)

        return files
      })
      .code((code) => {
        if (manifest.windows.legacy_product_codes) {
          for (const productCode of manifest.windows.legacy_product_codes) {
            code.uninstallLegacy(productCode.value, productCode.kind)
          }
        }

        // Generate the speller.toml
        const spellerToml = {
          spellers: {
            [langTag]: `${langTag}.zhfst`,
          },
        }

        if (manifest.windows.extra_locales) {
          for (
            const [tag, zhfstPrefix] of Object.entries(
              manifest.windows.extra_locales,
            )
          ) {
            spellerToml.spellers[tag] = `${zhfstPrefix}.zhfst`
          }
        }

        builder.debug("Writing speller.toml:")
        builder.debug(toml.stringify(spellerToml))
        Deno.writeTextFileSync(
          "./speller.toml",
          toml.stringify(spellerToml),
        )

        code.execPostInstall(
          "{commonpf}\\WinDivvun\\i686\\spelli.exe",
          `refresh`,
          `Could not refresh spellers. Is WinDivvun installed?`,
        )
        code.execPostUninstall(
          "{commonpf}\\WinDivvun\\i686\\spelli.exe",
          `refresh`,
          `Could not refresh spellers. Is WinDivvun installed?`,
        )

        return code
      })
      .write("./install.iss")

    builder.debug("generated install.iss:")
    builder.debug(innoBuilder.build())

    payloadPath = await makeInstaller("./install.iss")
    builder.debug(`Installer created at ${payloadPath}`)
  } else if (spellerType == SpellerType.MacOS) {
    payloadPath = await DivvunBundler.bundleMacOS(
      spellername,
      version,
      packageId,
      langTag,
      spellerPaths,
    )
  } else {
    throw new Error(`Unsupported speller type: ${spellerType}`)
  }

  return {
    payloadPath,
  }
}

// async function run() {
//   const version = await builder.getInput("version", { required: true })
//   const spellerType = (await builder.getInput("speller-type", {
//     required: true,
//   })) as SpellerType
//   const manifest = toml.parse(
//     await Deno.readFile(
//       await builder.getInput("speller-manifest-path", { required: true }),
//       "utf8",
//     ),
//   ) as SpellerManifest
//   const spellerPaths = nonUndefinedProxy(
//     JSON.parse(await builder.getInput("speller-paths", { required: true })),
//     true,
//   ) as SpellerPaths

//   const { payloadPath } = await spellerBundle({
//     version,
//     spellerType,
//     manifest,
//     spellerPaths,
//   })
//   await builder.setOutput("payload-path", payloadPath)
// }
