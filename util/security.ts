import * as builder from "~/builder.ts"
import { Bash } from "./shared.ts"

export async function downloadAppleWWDRCA(version?: string) {
  if (version == undefined) {
    return await builder.downloadTool(
      "https://developer.apple.com/certificationauthority/AppleWWDRCA.cer",
    )
  } else {
    return await builder.downloadTool(
      `https://www.apple.com/certificateauthority/AppleWWDRCA${version}.cer`,
    )
  }
}

export async function downloadAppleRootCA(version?: string) {
  if (version == undefined) {
    return await builder.downloadTool(
      "https://www.apple.com/appleca/AppleIncRootCertificate.cer",
    )
  } else {
    return await builder.downloadTool(
      `https://www.apple.com/certificateauthority/AppleRootCA-${version}.cer`,
    )
  }
}

export async function downloadAppleDevIdCA(version?: string) {
  if (version == undefined) {
    return await builder.downloadTool(
      "https://www.apple.com/certificateauthority/DeveloperIDCA.cer",
    )
  } else {
    return await builder.downloadTool(
      `https://www.apple.com/certificateauthority/DeveloperID${version}CA.cer`,
    )
  }
}

export class Security {
  constructor() {
    throw new Error("cannot be instantiated")
  }

  private static async run(subcommand: string, args: string[]) {
    return await Bash.runScript(`security ${subcommand} ${args.join(" ")}`)
  }

  public static async deleteKeychain(name: string) {
    return await Security.run("delete-keychain", [`${name}.keychain`])
  }

  public static async createKeychain(name: string, password: string) {
    builder.redactSecret(password)
    return await Security.run("create-keychain", [
      "-p",
      `"${password}"`,
      `${name}.keychain`,
    ])
  }

  public static async defaultKeychain(name: string) {
    await Security.run("list-keychains", [
      "-s",
      "/Users/admin/Library/Keychains/login.keychain-db",
      `${name}.keychain`,
    ])
    return await Security.run("default-keychain", ["-s", `${name}.keychain`])
  }

  public static async unlockKeychain(name: string, password: string) {
    builder.redactSecret(password)
    return await Security.run("unlock-keychain", [
      "-p",
      `"${password}"`,
      `${name}.keychain`,
    ])
  }

  public static async setKeychainTimeout(name: string, timeout: number) {
    const intTimeout = (timeout | 0).toString()
    return await Security.run("set-keychain-settings", [
      "-t",
      intTimeout,
      "-u",
      `${name}.keychain`,
    ])
  }

  public static async import(
    keychainName: string,
    certOrKeyPath: string,
    keyPassword?: string,
  ) {
    if (keyPassword != null) {
      builder.redactSecret(keyPassword)
      return await Security.run("import", [
        certOrKeyPath,
        "-k",
        `~/Library/Keychains/${keychainName}.keychain`,
        "-P",
        `"${keyPassword}"`,
        "-A",
        "-T",
        "/usr/bin/codesign",
        "-T",
        "/usr/bin/security",
        "-T",
        "/usr/bin/productbuild",
      ])
    } else {
      return await Security.run("import", [
        certOrKeyPath,
        "-k",
        `~/Library/Keychains/${keychainName}.keychain`,
        "-A",
      ])
    }
  }

  public static async setKeyPartitionList(
    keychainName: string,
    password: string,
    partitionList: string[],
  ) {
    builder.redactSecret(password)
    return await Security.run("set-key-partition-list", [
      "-S",
      partitionList.join(","),
      "-s",
      "-k",
      `"${password}"`,
      `${keychainName}.keychain`,
    ])
  }
}
