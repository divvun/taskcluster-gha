import toml from '@iarna/toml'
import fs from 'fs'
import path from 'path'

import * as builder from "~/builder"
import { InnoSetupBuilder } from '../../inno'
import { makeInstaller } from '../../inno-setup/lib'
import { DivvunBundler, SpellerPaths, Tar, ThfstTools, nonUndefinedProxy } from '../../shared'
import { SpellerManifest, SpellerType, deriveLangTag, derivePackageId } from '../manifest'

async function run() {
    const version = builder.getInput("version", { required: true })
    const spellerType = builder.getInput("speller-type", { required: true }) as SpellerType
    const manifest = toml.parse(fs.readFileSync(
        builder.getInput("speller-manifest-path", { required: true }), "utf8"
    )) as SpellerManifest
    const spellerPaths = nonUndefinedProxy(JSON.parse(
        builder.getInput("speller-paths", { required: true })
    ), true) as SpellerPaths

    let { spellername } = manifest
    const packageId = derivePackageId(spellerType)
    const langTag = deriveLangTag(false)

    if (spellerType == SpellerType.Mobile) {
        const bhfstPaths = []

        for (const [langTag, zhfstPath] of Object.entries(spellerPaths.mobile)) {
            const bhfstPath = await ThfstTools.zhfstToBhfst(zhfstPath)
            const langTagBhfst = `${path.dirname(bhfstPath)}/${langTag}.bhfst`

            builder.debug(`Copying ${bhfstPath} to ${langTagBhfst}`)
            await builder.cp(bhfstPath, langTagBhfst)
            bhfstPaths.push(langTagBhfst)
        }

        const payloadPath = path.resolve(`./${packageId}_${version}_mobile.txz`)
        builder.debug(`Creating txz from [${bhfstPaths.join(", ")}] at ${payloadPath}`)
        await Tar.createFlatTxz(bhfstPaths, payloadPath)

        builder.setOutput("payload-path", payloadPath)
    } else if (spellerType == SpellerType.Windows) {
        if (manifest.windows.system_product_code == null) {
            throw new Error("Missing system_product_code")
        }

        // Fix names of zhfst files to match their tag
        const zhfstPaths: string[] = []
        fs.mkdirSync("./zhfst")
        for (const [key, value] of Object.entries(spellerPaths.desktop)) {
            const out = path.resolve(path.join("./zhfst", `${key}.zhfst`))
            fs.renameSync(value, out)
            zhfstPaths.push(out)
        }

        const innoBuilder = new InnoSetupBuilder()

        innoBuilder.name(`${spellername} Speller`)
            .version(version)
            .publisher("Universitetet i Tromsø - Norges arktiske universitet")
            .url("http://divvun.no/")
            .productCode(manifest.windows.system_product_code)
            .defaultDirName(`{commonpf}\\WinDivvun\\Spellers\\${langTag}`)
            .files(files => {
                const flags = ["ignoreversion", "recursesubdirs", "uninsrestartdelete"]

                for (const zhfstPath of zhfstPaths) {
                    files.add(zhfstPath, "{app}", flags)
                }

                files.add("speller.toml", "{app}", flags)

                return files
            })
            .code(code => {
                if (manifest.windows.legacy_product_codes) {
                    for (const productCode of manifest.windows.legacy_product_codes) {
                        code.uninstallLegacy(productCode.value, productCode.kind)
                    }
                }

                // Generate the speller.toml
                const spellerToml = {
                    spellers: {
                        [langTag]: `${langTag}.zhfst`
                    }
                }

                if (manifest.windows.extra_locales) {
                    for (const [tag, zhfstPrefix] of Object.entries(manifest.windows.extra_locales)) {
                        spellerToml.spellers[tag] = `${zhfstPrefix}.zhfst`
                    }
                }

                builder.debug("Writing speller.toml:")
                builder.debug(toml.stringify(spellerToml))
                fs.writeFileSync("./speller.toml", toml.stringify(spellerToml), "utf8")

                code.execPostInstall(
                        "{commonpf}\\WinDivvun\\i686\\spelli.exe",
                        `refresh`,
                        `Could not refresh spellers. Is WinDivvun installed?`)
                code.execPostUninstall(
                        "{commonpf}\\WinDivvun\\i686\\spelli.exe",
                        `refresh`,
                        `Could not refresh spellers. Is WinDivvun installed?`)

                return code
            })
            .write("./install.iss")

        builder.debug("generated install.iss:")
        builder.debug(innoBuilder.build())

        const payloadPath = await makeInstaller("./install.iss")
        builder.setOutput("payload-path", payloadPath)
        builder.debug(`Installer created at ${payloadPath}`)
    } else if (spellerType == SpellerType.MacOS) {
        const payloadPath = await DivvunBundler.bundleMacOS(spellername, version, packageId, langTag, spellerPaths)
        builder.setOutput("payload-path", payloadPath)
    }
}

run().catch(err => {
    console.error(err.stack)
    process.exit(1)
})
