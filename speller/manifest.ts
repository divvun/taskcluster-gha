import * as github from '@actions/github'

export enum SpellerType {
    MacOS = "speller-macos",
    Mobile = "speller-mobile",
    Windows = "speller-windows"
}

export type WindowsSpellerManifest = {
    system_product_code: string,

    // This includes a list of UUIDs that need to be uninstalled before installing the new one.
    legacy_product_codes?: { value: string, kind: string }[]

    // Extra locales to register, prefix of zhfst is the value
    extra_locales?: { [bcp47: string]: string }
}

export type SpellerManifest = {
    spellername: string,
    spellerversion: string,
    windows: WindowsSpellerManifest,
    macos: {
        system_pkg_id: string,
    }
}

export function deriveLangTag(force3: boolean) {
    const lang = github.context.repo.repo.split("lang-")[1]

    if (force3) {
        return lang
    }

    // It's easier for us to just special case the 3 character variants
    // than to add another dependency.
    if (lang == "sme") {
        return "se"
    }

    if (lang === "fao") {
        return "fo"
    }

    if (lang === "kal") {
        return "kl"
    }

    return lang
}

export function derivePackageId(type: SpellerType) {
    const lang = github.context.repo.repo.split("lang-")[1]

    return `speller-${lang}`
}