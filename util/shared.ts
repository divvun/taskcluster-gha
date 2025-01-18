// deno-lint-ignore-file require-await no-explicit-any
import { crypto } from "@std/crypto"
import { encodeBase64 } from "@std/encoding/base64"
import { encodeHex } from "@std/encoding/hex"
import * as fs from "@std/fs"
import * as path from "@std/path"
import * as yaml from "@std/yaml"
import * as builder from "~/builder.ts"
import { Security } from "./security.ts"

// export const WINDOWS_SIGNING_HASH_ALGORITHM = "sha256"
export const RFC3161_URL = "http://ts.ssl.com"
const delay = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(() => resolve(), ms))

export function tmpDir() {
  return builder.tempDir()
}

export function divvunConfigDir() {
  return path.resolve(tmpDir(), "divvun-ci-config")
}

export function randomString64() {
  return encodeBase64(crypto.getRandomValues(new Uint8Array(48)))
}

export function randomHexBytes(count: number) {
  return encodeHex(crypto.getRandomValues(new Uint8Array(count)))
}

export const DIVVUN_PFX =
  `${divvunConfigDir()}\\enc\\creds\\windows\\divvun.pfx`

function env() {
  const langs = {
    LANG: "C.UTF-8",
    LC_ALL: "C.UTF-8",
  }

  if (Deno.build.os === "darwin") {
    langs.LANG = "en_US.UTF-8"
    langs.LC_ALL = "en_US.UTF-8"
  }

  return {
    ...Deno.env.toObject(),
    ...langs,
    DEBIAN_FRONTEND: "noninteractive",
    DEBCONF_NONINTERACTIVE_SEEN: "true",
    PYTHONUTF8: "1",
  }
}

function assertExit0(code: number) {
  if (code !== 0) {
    builder.setFailed(`Process exited with exit code ${code}.`)
  }
}

export class Apt {
  static async update(requiresSudo: boolean) {
    if (requiresSudo) {
      assertExit0(
        await builder.exec("sudo", ["apt-get", "-qy", "update"], {
          env: env(),
        }),
      )
    } else {
      assertExit0(
        await builder.exec("apt-get", ["-qy", "update"], { env: env() }),
      )
    }
  }

  static async install(packages: string[], requiresSudo: boolean) {
    if (requiresSudo) {
      assertExit0(
        await builder.exec(
          "sudo",
          ["apt-get", "install", "-qfy", ...packages],
          { env: env() },
        ),
      )
    } else {
      assertExit0(
        await builder.exec("apt-get", ["install", "-qfy", ...packages], {
          env: env(),
        }),
      )
    }
  }
}

export class Pip {
  static async install(packages: string[]) {
    assertExit0(
      await builder.exec("pip3", ["install", "--user", ...packages], {
        env: env(),
      }),
    )
    builder.addPath(path.join(Deno.env.get("HOME")!, ".local", "bin"))
  }
}

export class Pipx {
  static async ensurepath() {
    assertExit0(await builder.exec("pipx", ["ensurepath"], { env: env() }))
  }

  static async install(packages: string[]) {
    assertExit0(
      await builder.exec("pipx", ["install", ...packages], { env: env() }),
    )
  }
}

export class Powershell {
  static async runScript(
    script: string,
    opts: {
      cwd?: string
      env?: { [key: string]: string }
    } = {},
  ) {
    const thisEnv = Object.assign({}, env(), opts.env)

    const out: string[] = []
    const err: string[] = []

    const listeners = {
      stdout: (data: Uint8Array) => {
        out.push(data.toString())
      },
      stderr: (data: Uint8Array) => {
        err.push(data.toString())
      },
    }

    assertExit0(
      await builder.exec("pwsh", ["-c", script], {
        env: thisEnv,
        cwd: opts.cwd,
        listeners,
      }),
    )
    return [out.join(""), err.join("")]
  }
}

export class DefaultShell {
  static async runScript(
    script: string,
    args: {
      sudo?: boolean
      cwd?: string
      env?: { [key: string]: string }
    } = {},
  ) {
    if (Deno.build.os === "windows") {
      return await Powershell.runScript(script, args)
    } else {
      return await Bash.runScript(script, args)
    }
  }
}

export class Bash {
  static async runScript(
    scriptInput: string | string[],
    args: {
      sudo?: boolean
      cwd?: string
      env?: { [key: string]: string }
    } = {},
  ) {
    const script = typeof scriptInput === "string"
      ? scriptInput
      : scriptInput.join(";\n")
    const thisEnv = Object.assign({}, env(), args.env)

    const out: string[] = []
    const err: string[] = []

    const listeners = {
      stdout: (data: Uint8Array) => {
        out.push(data.toString())
      },
      stderr: (data: Uint8Array) => {
        err.push(data.toString())
      },
    }

    if (args.sudo) {
      assertExit0(
        await builder.exec("sudo", ["bash", "-c", script], {
          env: thisEnv,
          cwd: args.cwd,
          listeners,
        }),
      )
    } else {
      assertExit0(
        await builder.exec("bash", ["-c", script], {
          env: thisEnv,
          cwd: args.cwd,
          listeners,
        }),
      )
    }

    return [out.join(""), err.join("")]
  }
}

export class Tar {
  static async extractTxz(filePath: string, outputDir?: string) {
    const platform = Deno.build.os

    if (platform === "linux") {
      return await builder.extractTar(filePath, outputDir || tmpDir(), "Jx")
    } else if (platform === "darwin") {
      return await builder.extractTar(filePath, outputDir || tmpDir())
    } else if (platform === "windows") {
      // Now we unxz it
      builder.debug("Attempt to unxz")
      await builder.exec("xz", ["-d", filePath])

      builder.debug("Attempted to extract tarball")
      return await builder.extractTar(
        `${path.dirname(filePath)}\\${path.basename(filePath, ".txz")}.tar`,
        outputDir || tmpDir(),
      )
    } else {
      throw new Error(`Unsupported platform: ${platform}`)
    }
  }

  static async createFlatTxz(paths: string[], outputPath: string) {
    const tmpDir = await Deno.makeTempDir()
    const stagingDir = path.join(tmpDir, "staging")
    await Deno.mkdir(stagingDir)

    builder.debug(`Created tmp dir: ${tmpDir}`)

    for (const p of paths) {
      builder.debug(`Copying ${p} into ${stagingDir}`)
      await builder.cp(p, stagingDir, { recursive: true })
    }

    builder.debug(`Tarring`)
    await Bash.runScript(`tar cf ../file.tar *`, { cwd: stagingDir })

    builder.debug("xz -9'ing")
    await Bash.runScript(`xz -9 ../file.tar`, { cwd: stagingDir })

    builder.debug("Copying file.tar.xz to " + outputPath)
    await builder.cp(path.join(tmpDir, "file.tar.xz"), outputPath)
  }
}

export enum RebootSpec {
  Install = "install",
  Uninstall = "uninstall",
  Update = "update",
}
export enum WindowsExecutableKind {
  Inno = "inno",
  Nsis = "nsis",
  Msi = "msi",
}

export class PahkatPrefix {
  static URL_LINUX =
    "https://pahkat.uit.no/devtools/download/pahkat-prefix-cli?platform=linux&channel=nightly"
  static URL_MACOS =
    "https://pahkat.uit.no/devtools/download/pahkat-prefix-cli?platform=macos&channel=nightly"
  static URL_WINDOWS =
    "https://pahkat.uit.no/devtools/download/pahkat-prefix-cli?platform=windows&channel=nightly"

  static get path(): string {
    return path.join(tmpDir(), "pahkat-prefix")
  }

  static async bootstrap() {
    const platform = Deno.build.os

    let txz
    if (platform === "linux") {
      txz = await builder.downloadTool(PahkatPrefix.URL_LINUX)
    } else if (platform === "darwin") {
      txz = await builder.downloadTool(PahkatPrefix.URL_MACOS)
    } else if (platform === "windows") {
      // Now we can download things
      txz = await builder.downloadTool(
        PahkatPrefix.URL_WINDOWS,
        path.join(tmpDir(), "pahkat-dl.txz"),
      )
    } else {
      throw new Error(`Unsupported platform: ${platform}`)
    }

    // Extract the file
    const outputPath = await Tar.extractTxz(txz)
    const binPath = path.resolve(outputPath, "bin")

    console.log(`Bin path: ${binPath}, platform: ${Deno.build.os}`)
    builder.addPath(binPath)

    // Init the repo
    if (await fs.exists(PahkatPrefix.path)) {
      builder.debug(`${PahkatPrefix.path} exists; deleting first.`)
      await Deno.remove(PahkatPrefix.path, { recursive: true })
    }
    await DefaultShell.runScript(`pahkat-prefix init -c ${PahkatPrefix.path}`)
  }

  static async addRepo(url: string, channel?: string) {
    if (channel != null) {
      await DefaultShell.runScript(
        `pahkat-prefix config repo add -c ${PahkatPrefix.path} ${url} ${channel}`,
      )
    } else {
      await DefaultShell.runScript(
        `pahkat-prefix config repo add -c ${PahkatPrefix.path} ${url}`,
      )
    }
  }

  static async install(packages: string[]) {
    await DefaultShell.runScript(
      `pahkat-prefix install ${packages.join(" ")} -c ${PahkatPrefix.path}`,
    )

    for (const pkg of packages) {
      builder.addPath(
        path.join(PahkatPrefix.path, "pkg", pkg.split("@").shift()!, "bin"),
      )
    }
  }
}

export enum MacOSPackageTarget {
  System = "system",
  User = "user",
}

export type ReleaseRequest = {
  version: string
  platform: string
  arch?: string
  channel?: string
  authors?: string[]
  license?: string
  licenseUrl?: string
  dependencies?: { [key: string]: string }
}

export class PahkatUploader {
  static ARTIFACTS_URL: string = "https://pahkat.uit.no/artifacts/"

  private static async run(args: string[]): Promise<string> {
    if (Deno.env.get("PAHKAT_NO_DEPLOY") === "true") {
      builder.debug("Skipping deploy because `PAHKAT_NO_DEPLOY` is true")
      return ""
    }
    const sec = await secrets()
    let output: string = ""

    let exe: string
    if (Deno.build.os === "windows") {
      exe = "pahkat-uploader.exe"
    } else {
      exe = "pahkat-uploader"
    }

    assertExit0(
      await builder.exec(exe, args, {
        env: Object.assign({}, env(), {
          PAHKAT_API_KEY: sec.pahkat.apiKey,
        }),
        listeners: {
          stdout: (data: Uint8Array) => {
            output += data.toString()
          },
        },
      }),
    )
    return output
  }

  static async upload(
    artifactPath: string,
    _artifactUrl: string,
    releaseMetadataPath: string,
    repoUrl: string,
    metadataJsonPath: string | null = null,
    manifestTomlPath: string | null = null,
    packageType: string | null = null,
  ) {
    const fileName = path.parse(artifactPath).base

    if (Deno.env.get("PAHKAT_NO_DEPLOY") === "true") {
      builder.debug(
        "Skipping upload because `PAHKAT_NO_DEPLOY` is true. Creating artifact instead",
      )
      await builder.createArtifact(fileName, artifactPath)
      return
    }

    if (!await fs.exists(releaseMetadataPath)) {
      throw new Error(
        `Missing required payload manifest at path ${releaseMetadataPath}`,
      )
    }

    const sec = await secrets()

    console.log(`Uploading ${artifactPath} to S3`)

    let retries = 0
    await builder.exec("aws", [
      "configure",
      "set",
      "default.s3.multipart_threshold",
      "500MB",
    ])
    while (true) {
      try {
        await builder.exec(
          "aws",
          [
            "s3",
            "cp",
            "--cli-connect-timeout",
            "6000",
            "--endpoint",
            "https://ams3.digitaloceanspaces.com",
            "--acl",
            "public-read",
            artifactPath,
            `s3://divvun/pahkat/artifacts/${fileName}`,
          ],
          {
            env: Object.assign({}, env(), {
              AWS_ACCESS_KEY_ID: sec.aws.accessKeyId,
              AWS_SECRET_ACCESS_KEY: sec.aws.secretAccessKey,
              AWS_DEFAULT_REGION: "ams3",
            }),
          },
        )
        console.log("Upload successful")
        break
      } catch (err) {
        console.log(err)
        if (retries >= 5) {
          throw err
        }
        await delay(10000)
        console.log("Retrying")
        retries += 1
      }
    }

    // Step 2: Push the manifest to the server.
    const args = [
      "upload",
      "--url",
      repoUrl,
      "--release-meta",
      releaseMetadataPath,
    ]
    if (metadataJsonPath != null) {
      args.push("--metadata-json")
      args.push(metadataJsonPath)
    }
    if (manifestTomlPath != null) {
      args.push("--manifest-toml")
      args.push(manifestTomlPath)
    }
    if (packageType != null) {
      args.push("--package-type")
      args.push(packageType)
    }
    console.log(await PahkatUploader.run(args))
  }

  static releaseArgs(release: ReleaseRequest) {
    const args = ["release"]

    if (release.authors) {
      args.push("--authors")
      for (const item of release.authors) {
        args.push(item)
      }
    }

    if (release.arch) {
      args.push("--arch")
      args.push(release.arch)
    }

    if (release.dependencies) {
      const deps = Object.entries(release.dependencies)
        .map((x) => `${x[0]}::${x[1]}`)
        .join(",")

      args.push("-d")
      args.push(deps)
    }

    if (release.channel) {
      args.push("--channel")
      args.push(release.channel)
    }

    if (release.license) {
      args.push("-l")
      args.push(release.license)
    }

    if (release.licenseUrl) {
      args.push("--license-url")
      args.push(release.licenseUrl)
    }

    args.push("-p")
    args.push(release.platform)

    args.push("--version")
    args.push(release.version)

    return args
  }

  static release = {
    async windowsExecutable(
      release: ReleaseRequest,
      artifactUrl: string,
      installSize: number,
      size: number,
      kind: WindowsExecutableKind | null,
      productCode: string,
      requiresReboot: RebootSpec[],
    ): Promise<string> {
      const payloadArgs = [
        "windows-executable",
        "-i",
        (installSize | 0).toString(),
        "-s",
        (size | 0).toString(),
        "-p",
        productCode,
        "-u",
        artifactUrl,
      ]

      if (kind != null) {
        payloadArgs.push("-k")
        payloadArgs.push(kind)
      }

      if (requiresReboot.length > 0) {
        payloadArgs.push("-r")
        payloadArgs.push(requiresReboot.join(","))
      }

      const releaseArgs = PahkatUploader.releaseArgs(release)
      return await PahkatUploader.run([...releaseArgs, ...payloadArgs])
    },

    async macosPackage(
      release: ReleaseRequest,
      artifactUrl: string,
      installSize: number,
      size: number,
      pkgId: string,
      requiresReboot: RebootSpec[],
      targets: MacOSPackageTarget[],
    ): Promise<string> {
      const payloadArgs = [
        "macos-package",
        "-i",
        (installSize | 0).toString(),
        "-s",
        (size | 0).toString(),
        "-p",
        pkgId,
        "-u",
        artifactUrl,
      ]

      if (targets.length > 0) {
        payloadArgs.push("-t")
        payloadArgs.push(targets.join(","))
      }

      if (requiresReboot.length > 0) {
        payloadArgs.push("-r")
        payloadArgs.push(requiresReboot.join(","))
      }

      const releaseArgs = PahkatUploader.releaseArgs(release)
      return await PahkatUploader.run([...releaseArgs, ...payloadArgs])
    },

    async tarballPackage(
      release: ReleaseRequest,
      artifactUrl: string,
      installSize: number,
      size: number,
    ): Promise<string> {
      const payloadArgs = [
        "tarball-package",
        "-i",
        (installSize | 0).toString(),
        "-s",
        (size | 0).toString(),
        "-u",
        artifactUrl,
      ]

      const releaseArgs = PahkatUploader.releaseArgs(release)
      return await PahkatUploader.run([...releaseArgs, ...payloadArgs])
    },
  }
}

// Since some state remains after the builds, don't grow known_hosts infinitely
const CLEAR_KNOWN_HOSTS_SH = `\
mkdir -pv ~/.ssh
ssh-keyscan github.com | tee -a ~/.ssh/known_hosts
cat ~/.ssh/known_hosts | sort | uniq > ~/.ssh/known_hosts.new
mv ~/.ssh/known_hosts.new ~/.ssh/known_hosts
`

export class Ssh {
  static async cleanKnownHosts() {
    await Bash.runScript(CLEAR_KNOWN_HOSTS_SH)
  }
}

const PROJECTJJ_NIGHTLY_SH = `\
wget -q https://apertium.projectjj.com/apt/install-nightly.sh -O install-nightly.sh && bash install-nightly.sh
`

export class ProjectJJ {
  static async addNightlyToApt(requiresSudo: boolean) {
    await Bash.runScript(PROJECTJJ_NIGHTLY_SH, { sudo: requiresSudo })
  }
}

export class Kbdgen {
  static async fetchMetaBundle(metaBundlePath: string) {
    await Bash.runScript(`kbdgen fetch -b ${metaBundlePath}`)
  }

  private static async resolveOutput(p: string): Promise<string> {
    const globber = await builder.globber(p, {
      followSymbolicLinks: false,
    })
    const files = await globber.glob()

    if (files[0] == null) {
      throw new Error("No output found for build.")
    }

    builder.debug("Got file for bundle: " + files[0])
    return files[0]
  }

  static async loadTarget(bundlePath: string, target: string) {
    return nonUndefinedProxy(
      yaml.parse(
        await Deno.readTextFile(
          path.resolve(bundlePath, "targets", `${target}.yaml`),
        ),
      ),
      true,
    )
  }

  static async loadProjectBundle(bundlePath: string) {
    return nonUndefinedProxy(
      yaml.parse(
        await Deno.readTextFile(path.resolve(bundlePath, "project.yaml")),
      ),
      true,
    )
  }

  static async loadProjectBundleWithoutProxy(bundlePath: string) {
    return yaml.parse(
      await Deno.readTextFile(path.resolve(bundlePath, "project.yaml")),
    )
  }

  static async loadLayouts(bundlePath: string) {
    const globber = await builder.globber(
      path.resolve(bundlePath, "layouts/*.yaml"),
      {
        followSymbolicLinks: false,
      },
    )
    const layoutFiles = await globber.glob()
    const layouts: { [locale: string]: any } = {}
    for (const layoutFile of layoutFiles) {
      const locale = path.parse(layoutFile).base.split(".", 1)[0]
      layouts[locale] = yaml.parse(await Deno.readTextFile(layoutFile))
    }
    return layouts
  }

  static async setNightlyVersion(bundlePath: string, target: string) {
    const targetData = await Kbdgen.loadTarget(bundlePath, target)

    // Set to minute-based timestamp
    targetData["version"] = await versionAsNightly(targetData["version"])

    await Deno.writeTextFile(
      path.resolve(bundlePath, "targets", `${target}.yaml`),
      yaml.stringify({ ...targetData }),
    )

    return targetData["version"]
  }

  static async setBuildNumber(
    bundlePath: string,
    target: string,
    start: number = 0,
  ) {
    const targetData = await Kbdgen.loadTarget(bundlePath, target)

    // Set to run number
    const versionNumber = parseInt(
      (await Bash.runScript("git rev-list --count HEAD"))[0],
      10,
    )
    targetData["build"] = start + versionNumber
    builder.debug("Set build number to " + targetData["build"])

    await Deno.writeTextFile(
      path.resolve(bundlePath, "targets", `${target}.yaml`),
      yaml.stringify({ ...targetData }),
    )

    return targetData["build"]
  }

  static async build_iOS(bundlePath: string): Promise<string> {
    const abs = path.resolve(bundlePath)
    const cwd = path.dirname(abs)
    const sec = await secrets()

    // await Bash.runScript("brew install imagemagick")
    await Security.unlockKeychain("login", sec.macos.adminPassword)

    const env = {
      GITHUB_USERNAME: sec.github.username,
      GITHUB_TOKEN: sec.github.token,
      MATCH_GIT_URL: sec.ios.matchGitUrl,
      MATCH_PASSWORD: sec.ios.matchPassword,
      FASTLANE_USER: sec.ios.fastlaneUser,
      PRODUCE_USERNAME: sec.ios.fastlaneUser,
      FASTLANE_PASSWORD: sec.ios.fastlanePassword,
      APP_STORE_KEY_JSON: path.join(
        divvunConfigDir(),
        sec.macos.appStoreKeyJson,
      ),
      MATCH_KEYCHAIN_NAME: "login.keychain",
      MATCH_KEYCHAIN_PASSWORD: sec.macos.adminPassword,
      LANG: "C.UTF-8",
      RUST_LOG: "kbdgen=debug",
    }

    builder.debug("Gonna import certificates")
    builder.debug("Deleting previous keychain for fastlane")
    try {
      builder.debug("Creating keychain for fastlane")
    } catch (_) {
      // Ignore error here, the keychain probably doesn't exist
    }

    builder.debug("ok, next")

    // Initialise any missing languages first
    // XXX: this no longer works since changes to the API!
    // await Bash.runScript(
    //     `kbdgen --logging debug build ios ${abs} init`,
    //     {
    //         cwd,
    //         env
    //     }
    // )

    // Do the build
    await Bash.runScript(
      `kbdgen target --output-path output --bundle-path ${abs} ios build`,
      {
        cwd,
        env,
      },
    )
    const globber = await builder.globber(
      path.resolve(abs, "../output/ipa/*.ipa"),
      {
        followSymbolicLinks: false,
      },
    )
    const files = await globber.glob()

    if (files[0] == null) {
      throw new Error("No output found for build.")
    }

    return files[0]
  }

  static async buildAndroid(
    bundlePath: string,
    githubRepo: string,
  ): Promise<string> {
    const abs = path.resolve(bundlePath)
    const cwd = path.dirname(abs)
    const sec = await secrets()
    // await Bash.runScript("brew install imagemagick")

    builder.debug(`ANDROID_HOME: ${Deno.env.get("ANDROID_HOME")}`)

    await Bash.runScript(
      `kbdgen target --output-path output --bundle-path ${abs} android build`,
      {
        cwd,
        env: {
          GITHUB_USERNAME: sec.github.username,
          GITHUB_TOKEN: sec.github.token,
          NDK_HOME: Deno.env.get("ANDROID_NDK_HOME")!,
          ANDROID_KEYSTORE: path.join(
            divvunConfigDir(),
            sec.android[githubRepo].keystore,
          ),
          ANDROID_KEYALIAS: sec.android[githubRepo].keyalias,
          STORE_PW: sec.android[githubRepo].storePassword,
          KEY_PW: sec.android[githubRepo].keyPassword,
          PLAY_STORE_P12: path.join(
            divvunConfigDir(),
            sec.android.playStoreP12,
          ),
          PLAY_STORE_ACCOUNT: sec.android.playStoreAccount,
          RUST_LOG: "debug",
        },
      },
    )

    return await Kbdgen.resolveOutput(
      path.join(
        cwd,
        "output/repo/app/build/outputs/apk/release",
        `*-release.apk`,
      ),
    )
  }

  static async buildMacOS(bundlePath: string): Promise<string> {
    const abs = path.resolve(bundlePath)
    const cwd = path.dirname(abs)
    const sec = await secrets()

    // Install imagemagick if we're not using the self-hosted runner
    // if (Deno.env.get(""ImageOS"] != null) {")
    //   await Bash.runScript("brew install imagemagick")
    // }

    await Bash.runScript(`kbdgen -V`)
    await Bash.runScript(
      `kbdgen target --output-path output --bundle-path ${abs} macos generate`,
      {
        env: {
          DEVELOPER_PASSWORD_CHAIN_ITEM: sec.macos.passwordChainItem,
          DEVELOPER_ACCOUNT: sec.macos.developerAccount,
        },
      },
    )

    await Bash.runScript(
      `kbdgen target --output-path output --bundle-path ${abs} macos build`,
      {
        env: {
          DEVELOPER_PASSWORD_CHAIN_ITEM: sec.macos.passwordChainItem,
          DEVELOPER_ACCOUNT: sec.macos.developerAccount,
        },
      },
    )

    return await Kbdgen.resolveOutput(path.join(cwd, "output", `*.pkg`))
  }

  static async buildWindows(bundlePath: string): Promise<string> {
    const abs = path.resolve(bundlePath)
    const cwd = Deno.cwd()

    await Powershell.runScript(
      `kbdgen target --output-path output --bundle-path ${abs} windows`,
    )

    return `${cwd}/output`
  }
}

export class ThfstTools {
  static async zhfstToBhfst(zhfstPath: string): Promise<string> {
    await DefaultShell.runScript(`thfst-tools zhfst-to-bhfst ${zhfstPath}`)
    return `${path.basename(zhfstPath, ".zhfst")}.bhfst`
  }
}

const SEMVER_RE =
  /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\.(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*))*))?(?:\+([0-9a-zA-Z-]+(?:\.[0-9a-zA-Z-]+)*))?$/

export async function versionAsNightly(version: string): Promise<string> {
  const verChunks = SEMVER_RE.exec(version)?.slice(1, 4)
  if (verChunks == null) {
    throw new Error(`Provided version '${version}' is not semantic.`)
  }

  // const queueService = new taskcluster.Queue({
  //   rootUrl: Deno.env.get("TASKCLUSTER_PROXY_URL,")
  // })

  // const task = await queueService.task(Deno.env.get("TASK_ID)")

  const nightlyTs = new Date().toISOString().replace(/[-:\.]/g, "")

  return `${verChunks.join(".")}-nightly.${nightlyTs}`
}

function deriveBundlerArgs(
  spellerPaths: SpellerPaths,
  withZhfst: boolean = true,
) {
  const args = []
  for (const [langTag, zhfstPath] of Object.entries(spellerPaths.desktop)) {
    args.push("-l")
    args.push(langTag)

    if (withZhfst) {
      args.push("-z")
      args.push(zhfstPath)
    }
  }
  return args
}

export type SpellerPaths = {
  desktop: { [key: string]: string }
  mobile: { [key: string]: string }
}

export class DivvunBundler {
  static async bundleMacOS(
    name: string,
    version: string,
    packageId: string,
    langTag: string,
    spellerPaths: SpellerPaths,
  ): Promise<string> {
    const sec = await secrets()

    const args = [
      "-R",
      "-o",
      "output",
      "-t",
      "osx",
      "-H",
      name,
      "-V",
      version,
      "-a",
      `Developer ID Application: The University of Tromso (2K5J2584NX)`,
      "-i",
      `Developer ID Installer: The University of Tromso (2K5J2584NX)`,
      "-n",
      sec.macos.developerAccount,
      "-p",
      sec.macos.appPassword,
      "-d",
      sec.macos.teamId,
      "speller",
      "-f",
      langTag,
      ...deriveBundlerArgs(spellerPaths),
    ]

    assertExit0(
      await builder.exec("divvun-bundler", args, {
        env: Object.assign({}, env(), {
          RUST_LOG: "trace",
        }),
      }),
    )

    // FIXME: workaround bundler issue creating invalid files
    await builder.cp(
      path.resolve(`output/${langTag}-${version}.pkg`),
      path.resolve(`output/${packageId}-${version}.pkg`),
    )

    const outputFile = path.resolve(`output/${packageId}-${version}.pkg`)
    return outputFile
  }

  // static async bundleWindows(
  //     name: string,
  //     version: string,
  //     manifest: WindowsSpellerManifest,
  //     packageId: string,
  //     langTag: string,
  //     spellerPaths: SpellerPaths
  // ) {
  //     const sec = secrets();

  //     let exe: string
  //     if (Deno.build.os === "windows") {
  //         exe = path.join(PahkatPrefix.path, "pkg", "divvun-bundler", "bin", "divvun-bundler.exe")
  //     } else {
  //         exe = "divvun-bundler"
  //     }

  //     const args = ["-R", "-t", "win", "-o", "output",
  //         "--uuid", productCode,
  //         "-H", name,
  //         "-V", version,
  //         "-c", DIVVUN_PFX,
  //         "speller",
  //         "-f", langTag,
  //         ...deriveBundlerArgs(spellerPaths)
  //     ]

  //     assertExit0(await builder.exec(exe, args, {
  //         env: Object.assign({}, env(), {
  //             "RUST_LOG": "trace",
  //             "SIGN_PFX_PASSWORD": sec.windows.pfxPassword,
  //         })
  //     }))

  //     try {
  //         builder.debug(fs.readdirSync("output").join(", "))
  //     } catch (err) {
  //         builder.debug("Failed to read output dir")
  //         builder.debug(err)
  //     }

  //     // FIXME: workaround bundler issue creating invalid files
  //     await builder.cp(
  //         path.resolve(`output/${langTag}-${version}.exe`),
  //         path.resolve(`output/${packageId}-${version}.exe`))

  //     return path.resolve(`output/${packageId}-${version}.exe`)
  // }
}

export function nonUndefinedProxy(obj: any, withNull: boolean = false): any {
  return new Proxy(obj, {
    get: (target, prop, receiver) => {
      const v = Reflect.get(target, prop, receiver)
      if (v === undefined) {
        throw new Error(
          `'${
            String(
              prop,
            )
          }' was undefined and this is disallowed. Available keys: ${
            Object.keys(
              obj,
            ).join(", ")
          }`,
        )
      }

      if (withNull && v === null) {
        throw new Error(
          `'${
            String(
              prop,
            )
          }' was null and this is disallowed. Available keys: ${
            Object.keys(
              obj,
            ).join(", ")
          }`,
        )
      }

      if (v != null && (Array.isArray(v) || typeof v === "object")) {
        return nonUndefinedProxy(v, withNull)
      } else {
        return v
      }
    },
  })
}

export function validateProductCode(
  kind: WindowsExecutableKind,
  code: string,
): string {
  if (kind === null) {
    builder.debug("Found no kind, returning original code")
    return code
  }

  if (kind === WindowsExecutableKind.Inno) {
    if (code.startsWith("{") && code.endsWith("}_is1")) {
      builder.debug("Found valid product code for Inno installer: " + code)
      return code
    }

    let updatedCode = code

    if (!code.endsWith("}_is1") && !code.startsWith("{")) {
      builder.debug(
        "Found plain UUID for Inno installer, wrapping in {...}_is1",
      )
      updatedCode = `{${code}}_is1`
    } else if (code.endsWith("}") && code.startsWith("{")) {
      builder.debug("Found wrapped GUID for Inno installer, adding _is1")
      updatedCode = `${code}_is1`
    } else {
      throw new Error(`Could not handle invalid Inno product code: ${code}`)
    }

    builder.debug(`'${code}' -> '${updatedCode}`)
    return updatedCode
  }

  if (kind === WindowsExecutableKind.Nsis) {
    if (code.startsWith("{") && code.endsWith("}")) {
      builder.debug("Found valid product code for Nsis installer: " + code)
      return code
    }

    let updatedCode = code

    if (!code.endsWith("}") && !code.startsWith("{")) {
      builder.debug("Found plain UUID for Nsis installer, wrapping in {...}")
      updatedCode = `{${code}}`
    } else {
      throw new Error(`Could not handle invalid Nsis product code: ${code}`)
    }

    builder.debug(`'${code}' -> '${updatedCode}`)
    return updatedCode
  }

  throw new Error("Unhandled kind: " + kind)
}

export function isCurrentBranch(names: string[]) {
  const value = builder.context.ref

  builder.debug(`names: ${names}`)
  builder.debug(`GIT REF: '${value}'`)

  if (value == null) {
    return false
  }

  for (const name of names) {
    if (value === `refs/heads/${name}`) {
      return true
    }
  }

  return false
}

export function isMatchingTag(tagPattern: RegExp) {
  let value = builder.context.ref

  builder.debug(`tag pattern: ${tagPattern}`)
  builder.debug(`GIT REF: '${value}'`)

  if (value == null) {
    return false
  }

  const prefix = "refs/tags/"
  if (!value.startsWith(prefix)) {
    return false
  }

  value = value.substring(prefix.length)
  return tagPattern.test(value)
}

export function getArtifactSize(path: string): number {
  try {
    const stats = Deno.statSync(path)
    return stats.size
  } catch (_) {
    return 0
  }
}

const secrets = builder.secrets
export { secrets }
