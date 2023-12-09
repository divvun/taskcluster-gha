"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateKbdInnoFromBundle = void 0;
const core = __importStar(require("@actions/core"));
const path_1 = __importDefault(require("path"));
const inno_1 = require("../../inno");
const shared_1 = require("../../shared");
const uuid_1 = require("uuid");
const KBDGEN_NAMESPACE = uuid_1.v5("divvun.no", uuid_1.v5.DNS);
function layoutTarget(layout) {
    const targets = layout["targets"] || {};
    return targets["windows"] || {};
}
function getKbdId(locale, layout) {
    if ("id" in layout) {
        return "kbd" + layout["id"];
    }
    return "kbd" + locale.replace(/[^A-Za-z0-9-]/g, "").substr(0, 5);
}
async function generateKbdInnoFromBundle(bundlePath, buildDir) {
    var bundle = shared_1.Kbdgen.loadTarget(bundlePath, "windows");
    var project = shared_1.Kbdgen.loadProjectBundle(bundlePath);
    var layouts = await shared_1.Kbdgen.loadLayouts(bundlePath);
    var builder = new inno_1.InnoSetupBuilder();
    builder.name(bundle.appName)
        .publisher(project.organisation)
        .version(bundle.version)
        .url(bundle.url)
        .productCode(`{${bundle.uuid}`)
        .defaultDirName("{pf}\\" + bundle.appName)
        .files((builder) => {
        builder.add(`${buildDir}\\kbdi.exe`, "{app}", ["restartreplace", "uninsrestartdelete", "ignoreversion"], "not Is64BitInstallMode");
        builder.add(`${buildDir}\\kbdi-x64.exe`, "{app}", ["restartreplace", "uninsrestartdelete", "ignoreversion"], "Is64BitInstallMode", "kbdi.exe");
        builder.add(`${buildDir}\\i386\\*`, "{sys}", ["restartreplace", "uninsrestartdelete", "ignoreversion"], "not Is64BitInstallMode");
        builder.add(`${buildDir}\\amd64\\*`, "{sys}", ["restartreplace", "uninsrestartdelete", "ignoreversion"], "Is64BitInstallMode");
        builder.add(`${buildDir}\\wow64\\*`, "{syswow64}", ["restartreplace", "uninsrestartdelete", "ignoreversion"], "Is64BitInstallMode");
        return builder;
    });
    for (const [locale, layout] of Object.entries(layouts)) {
        if ("windows" in layout) {
            addLayoutToInstaller(builder, locale, layout);
        }
    }
    const fileName = path_1.default.join(buildDir, `install.all.iss`);
    console.log(builder.build());
    builder.write(fileName);
    return fileName;
}
exports.generateKbdInnoFromBundle = generateKbdInnoFromBundle;
function addLayoutToInstaller(builder, locale, layout) {
    const target = layoutTarget(layout);
    const kbdId = getKbdId(locale, target);
    const dllName = kbdId + ".dll";
    const languageCode = target["locale"] || locale;
    const languageName = target["languageName"];
    const layoutDisplayName = layout["displayNames"][locale];
    const guidStr = uuid_1.v5(kbdId, KBDGEN_NAMESPACE);
    core.debug("addLayoutToInstaller. Locale: " + locale + " layoutDisplayName: " + layoutDisplayName + " languageCode: " + languageCode + " languageName: " + languageName + " guidStr: " + guidStr + " dllName: " + dllName + " kbdId: " + kbdId);
    console.log("layout:: ", layout);
    console.log("target:: ", target);
    if (!layoutDisplayName) {
        throw new Error(`Display name for ${locale} not found`);
    }
    builder.run((builder) => {
        builder.withFilename("{app}\\kbdi.exe")
            .withParameter("keyboard_install")
            .withParameter(`-t ""${languageCode}""`);
        if (languageName) {
            builder.withParameter(`-l ""${languageName}""`);
        }
        builder.withParameter(`-g ""{{${guidStr}""`)
            .withParameter(`-d ${dllName}`)
            .withParameter(`-n ""${layoutDisplayName}""`)
            .withParameter("-e")
            .withFlags(["runhidden", "waituntilterminated"]);
        return builder;
    })
        .uninstallRun((builder) => {
        builder.withFilename("{app}\\kbdi.exe")
            .withParameter("keyboard_uninstall")
            .withParameter(`""${guidStr}""`)
            .withFlags(["runhidden", "waituntilterminated"]);
        return builder;
    })
        .icons((builder) => {
        builder.withName(`{group}\\Enable ${layoutDisplayName}`)
            .withFilename("{app}\\kbdi.exe")
            .withParameter("keyboard_enable")
            .withParameter(`-g ""{{${guidStr}""`)
            .withParameter(`-t ${languageCode}`)
            .withFlags(["runminimized", "preventpinning", "excludefromshowinnewinstall"]);
        return builder;
    });
}
