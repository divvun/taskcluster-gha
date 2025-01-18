// deno-lint-ignore-file require-await
import fs from "node:fs"

export enum KeyboardType {
  iOS = "keyboard-ios",
  Android = "keyboard-android",
  MacOS = "keyboard-macos",
  Windows = "keyboard-windows",
  ChromeOS = "keyboard-chromeos",
  M17n = "keyboard-m17n",
  X11 = "keyboard-x11",
}

export async function getBundle(override: string | null) {
  if (override) {
    return override
  }

  for (const item of fs.readdirSync(".")) {
    if (item.endsWith(".kbdgen")) {
      return item
    }
  }

  throw new Error("Did not find bundle with .kbdgen suffix.")
}
