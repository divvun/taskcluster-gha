import * as core from '@actions/core'
import path from "path"
import { Security, downloadAppleWWDRCA, downloadAppleRootCA, downloadAppleDevIdCA } from '../security'
import * as fs from 'fs'
import * as tmp from 'tmp'

import { Bash, divvunConfigDir, randomHexBytes, randomString64, secrets, Tar, tmpDir } from '../shared'

function debug(input: string[]) {
  const [out, err] = input

  if (out.trim() != '') {
    core.debug(out)
  }

  if (err.trim() != '') {
    core.error(err)
  }
}

async function setupMacOSKeychain() {
  const sec = await secrets()

  const name = `divvun-build-${randomHexBytes(6)}`
  const password = randomString64()

  try {
    debug(await Security.deleteKeychain(name))
  } catch (_) {}

  debug(await Security.createKeychain(name, password))
  debug(await Security.defaultKeychain(name))
  debug(await Security.unlockKeychain(name, password))
  debug(await Security.setKeychainTimeout(name, 36000))

  // Import certs
  const certPath2 = await downloadAppleWWDRCA("G2")
  debug(await Security.import(name, certPath2))

  const appP12Path = tmp.fileSync({ postfix: '.p12' })
  const appP12Buff = Buffer.from(sec.macos.appP12, 'base64')
  fs.writeFileSync(appP12Path.name, appP12Buff)
  debug(await Security.import(name, appP12Path.name, sec.macos.appP12Password))

  const installerP12Path = tmp.fileSync({ postfix: '.p12' })
  const installerP12Buff = Buffer.from(sec.macos.installerP12, 'base64')
  fs.writeFileSync(installerP12Path.name, installerP12Buff)
  debug(await Security.import(name, installerP12Path.name, sec.macos.installerP12Password))


  debug(await Security.setKeyPartitionList(name, password, ["apple-tool:", "apple:", "codesign:"]))

  // This is needed in kbdgen for macOS builds.
  debug(
    await Bash.runScript(`security add-generic-password -A -s "${sec.macos.passwordChainItem}" -a "${sec.macos.developerAccount}" -w "${sec.macos.appPassword}" "${name}"`)
  )
  debug(
    await Bash.runScript(`security add-generic-password -A -s "${sec.macos.passwordChainItemMacos}" -a "${sec.macos.developerAccountMacos}" -w "${sec.macos.appPasswordMacos}" "${name}"`)
  )
  debug(await Bash.runScript(`security set-generic-password-partition-list -S "apple-tool:,apple:,codesign:,security:" -a "${sec.macos.developerAccount}" -k "${password}" ${name}.keychain`));
  debug(await Bash.runScript(`security set-generic-password-partition-list -S "apple-tool:,apple:,codesign:,security:" -a "${sec.macos.developerAccountMacos}" -k "${password}" ${name}.keychain`));

  debug(
    await Bash.runScript(`bash ${divvunConfigDir()}/enc/install.sh`)
  )
}

async function cloneConfigRepo(password: string) {
  core.setSecret(password)

  const dir = tmpDir()
  await Bash.runScript("git clone --depth=1 https://github.com/divvun/divvun-ci-config.git", { cwd: dir })
  
  const repoDir = divvunConfigDir()
  await Bash.runScript(`openssl aes-256-cbc -d -in ./config.txz.enc -pass pass:${password} -out config.txz -md md5`, { cwd: repoDir })
  await Tar.bootstrap()
  await Tar.extractTxz(path.resolve(repoDir, "config.txz"), repoDir)
}

async function bootstrapDependencies() {
  // try {
  //   const svnPath = await io.which("svn")
  //   core.debug(`SVN path: ${svnPath}`)
  // } catch (_) {
    // core.debug("Installing subversion")
    // debug(await Bash.runScript("brew install subversion"))
  // }
}

async function run() {
  try {
    const divvunKey = core.getInput("key", { required: true })
    core.setSecret(divvunKey)
    console.log("Setting up environment")

    await cloneConfigRepo(divvunKey)

    if (process.platform === "win32") {
      core.addPath("C:\\Program Files (x86)\\Microsoft SDKs\\ClickOnce\\SignTool")
    } else if (process.platform == "darwin") {
      await setupMacOSKeychain()
      await bootstrapDependencies()
    }

    core.exportVariable("DIVVUN_CI_CONFIG", divvunConfigDir())
    core.debug(divvunConfigDir())
  }
  catch (error) {
    core.setFailed(error.message);
  }
}

run().catch(err => {
  console.error(err.stack)
  process.exit(1)
})
