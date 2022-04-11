import * as core from '@actions/core'
import path from "path"
import { Security, downloadAppleWWDRCA } from '../security'

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
  const certPath = await downloadAppleWWDRCA()
  debug(await Security.import(name, certPath))
  debug(await Security.import(name, path.resolve(divvunConfigDir(), sec.macos.appCer)))
  debug(await Security.import(name, path.resolve(divvunConfigDir(), sec.macos.installerCer)))

  // Import keys
  debug(await Security.import(name, path.resolve(
    divvunConfigDir(), sec.macos.installerP12), sec.macos.installerP12Password))
  debug(await Security.import(name, path.resolve(
    divvunConfigDir(), sec.macos.appP12), sec.macos.appP12Password))

  debug(await Security.setKeyPartitionList(name, password, ["apple-tool:", "apple:", "codesign:"]))

  // This is needed in kbdgen for macOS builds.
  debug(
    // await Bash.runScript(`xcrun altool --store-password-in-keychain-item "${sec.macos.passwordChainItem}" -u "${sec.macos.developerAccount}" -p "${sec.macos.appPassword}"`)
    await Bash.runScript(`security add-generic-password -A -s "${sec.macos.passwordChainItem}" -a "${sec.macos.developerAccount}" -w "${sec.macos.appPassword}" "${name}"`)
  )
  debug(await Bash.runScript(`security set-generic-password-partition-list -S "apple-tool:,apple:,codesign:,security:" -a "${sec.macos.developerAccount}" -k "${password}" ${name}.keychain`));

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
