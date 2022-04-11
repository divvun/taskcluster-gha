import * as tc from "@actions/tool-cache"
import * as core from '@actions/core'
import { Bash } from './shared'

export async function downloadAppleWWDRCA() {
  return await tc.downloadTool("https://www.apple.com/certificateauthority/AppleWWDRCAG3.cer")
}

export class Security {
  constructor() { throw new Error("cannot be instantiated") }

  private static async run(subcommand: string, args: string[]) {
    return await Bash.runScript(`security ${subcommand} ${args.join(" ")}`)
  }

  public static async deleteKeychain(name: string) {
    return await Security.run("delete-keychain", [`${name}.keychain`])
  }

  public static async createKeychain(name: string, password: string) {
    core.setSecret(password)
    return await Security.run("create-keychain", ["-p", `"${password}"`, `${name}.keychain`])
  }

  public static async defaultKeychain(name: string) {
    await Security.run("list-keychains", ["-s", "/Users/admin/Library/Keychains/login.keychain-db", `${name}.keychain`]);
    return await Security.run("default-keychain", ["-s", `${name}.keychain`])
  }

  public static async unlockKeychain(name: string, password: string) {
    core.setSecret(password)
    return await Security.run("unlock-keychain", ["-p", `"${password}"`, `${name}.keychain`])
  }

  public static async setKeychainTimeout(name: string, timeout: number) {
    const intTimeout = (timeout | 0).toString()
    return await Security.run("set-keychain-settings", ["-t", intTimeout, "-u", `${name}.keychain`])
  }

  public static async import(keychainName: string, certOrKeyPath: string, keyPassword?: string) {
    if (keyPassword != null) {
      core.setSecret(keyPassword)
      return await Security.run("import", [certOrKeyPath, "-k", `~/Library/Keychains/${keychainName}.keychain`, "-P", `"${keyPassword}"`, "-A"])
    } else {
      return await Security.run("import", [certOrKeyPath, "-k", `~/Library/Keychains/${keychainName}.keychain`, "-A"])
    }
  }

  public static async setKeyPartitionList(keychainName: string, password: string, partitionList: string[]) {
    core.setSecret(password)
    return await Security.run(
      "set-key-partition-list",
      ["-S", partitionList.join(","), "-s", "-k", `"${password}"`, `${keychainName}.keychain`]
    )
  }
}


