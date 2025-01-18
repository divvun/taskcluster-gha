// deno-lint-ignore-file require-await

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

  for (const item of Deno.readDirSync(".")) {
    if (item.name.endsWith(".kbdgen")) {
      return item.name
    }
  }

  throw new Error("Did not find bundle with .kbdgen suffix.")
}
