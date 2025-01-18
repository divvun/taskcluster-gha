// deno-lint-ignore-file no-explicit-any
import path from "node:path"
import * as builder from "~/builder.ts"
import { downloadAppleDevIdCA, Security } from "~/util/security.ts"

import { Buffer } from "node:buffer"
import {
  Bash,
  divvunConfigDir,
  randomString64,
  secrets,
  Tar,
  tmpDir,
} from "~/util/shared.ts"

function debug(input: string[]) {
  const [out, err] = input

  if (out.trim() != "") {
    builder.debug(out)
  }

  if (err.trim() != "") {
    builder.error(err)
  }
}

async function setupMacOSKeychain() {
  const sec = await secrets()

  const name = `divvun-build`
  const password = randomString64()

  try {
    debug(await Security.deleteKeychain(name))
  } catch (_) {
    // Ignore
  }

  debug(await Security.createKeychain(name, password))
  debug(await Security.defaultKeychain(name))
  debug(await Security.unlockKeychain(name, password))
  debug(await Security.setKeychainTimeout(name, 36000))

  // Import certs
  const certPath5 = await downloadAppleDevIdCA("G2")
  debug(await Security.import(name, certPath5))

  const appP12Path = await Deno.makeTempFile({ suffix: ".p12" })
  const appP12Buff = Buffer.from(sec.macos.appP12, "base64")
  await Deno.writeTextFile(appP12Path, appP12Buff)
  debug(await Security.import(name, appP12Path, sec.macos.appP12Password))

  const installerP12Path = await Deno.makeTempFile({ suffix: ".p12" })
  const installerP12Buff = Buffer.from(sec.macos.installerP12, "base64")
  await Deno.writeTextFile(installerP12Path, installerP12Buff)
  debug(
    await Security.import(
      name,
      installerP12Path,
      sec.macos.installerP12Password,
    ),
  )

  debug(
    await Security.setKeyPartitionList(name, password, [
      "apple-tool:",
      "apple:",
      "codesign:",
    ]),
  )

  // This is needed in kbdgen for macOS builds.
  debug(
    await Bash.runScript(
      `security add-generic-password -A -s "${sec.macos.passwordChainItem}" -a "${sec.macos.developerAccount}" -w "${sec.macos.appPassword}" "${name}"`,
    ),
  )
  debug(
    await Bash.runScript(
      `security add-generic-password -A -s "${sec.macos.passwordChainItemMacos}" -a "${sec.macos.developerAccountMacos}" -w "${sec.macos.appPasswordMacos}" "${name}"`,
    ),
  )
  debug(
    await Bash.runScript(
      `security set-generic-password-partition-list -S "apple-tool:,apple:,codesign:,security:" -a "${sec.macos.developerAccount}" -k "${password}" ${name}.keychain`,
    ),
  )
  debug(
    await Bash.runScript(
      `security set-generic-password-partition-list -S "apple-tool:,apple:,codesign:,security:" -a "${sec.macos.developerAccountMacos}" -k "${password}" ${name}.keychain`,
    ),
  )

  debug(await Bash.runScript(`bash ${divvunConfigDir()}/enc/install.sh`))
}

async function cloneConfigRepo(password: string) {
  builder.setSecret(password)

  const dir = tmpDir()
  await Bash.runScript(
    "git clone --depth=1 https://github.com/divvun/divvun-ci-config.git",
    { cwd: dir },
  )

  const repoDir = divvunConfigDir()
  await Bash.runScript(
    `openssl aes-256-cbc -d -in ./config.txz.enc -pass pass:${password} -out config.txz -md md5`,
    { cwd: repoDir },
  )
  await Tar.extractTxz(path.resolve(repoDir, "config.txz"), repoDir)
}

export type Props = {
  divvunKey: string
}

export default async function setup({ divvunKey }: Props) {
  try {
    builder.setSecret(divvunKey)
    console.log("Setting up environment")

    await cloneConfigRepo(divvunKey)

    if (Deno.build.os == "darwin") {
      await setupMacOSKeychain()
    }

    builder.exportVariable("DIVVUN_CI_CONFIG", divvunConfigDir())
    builder.debug(divvunConfigDir())
  } catch (error: any) {
    builder.setFailed(error.message)
  }
}

// async function run() {
//   const divvunKey = await builder.getInput("key", { required: true })
//   await setup({ divvunKey })
// }
