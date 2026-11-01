import os
import hashlib

def gen_id(name):
    return hashlib.md5(name.encode()).hexdigest()[:24].upper()

base_dir = "/mnt/data/Package Center/kv-music/ios-app"
source_dir = os.path.join(base_dir, "KVMusic")

swift_files = []
for root, dirs, files in os.walk(source_dir):
    for f in files:
        if f.endswith(".swift"):
            rel_path = os.path.relpath(os.path.join(root, f), base_dir)
            swift_files.append(rel_path)

swift_files.sort()
print(f"Found {len(swift_files)} Swift source files.")

# Generate PBXBuildFile and PBXFileReference
build_files = []
file_refs = []
source_build_files = []

# Asset catalog
assets_rel = "KVMusic/Assets.xcassets"
assets_ref_id = gen_id(assets_rel + "_ref")
assets_build_id = gen_id(assets_rel + "_build")
file_refs.append(f'\t\t{assets_ref_id} /* Assets.xcassets */ = {{isa = PBXFileReference; lastKnownFileType = folder.assetcatalog; path = Assets.xcassets; sourceTree = "<group>"; }};')
build_files.append(f'\t\t{assets_build_id} /* Assets.xcassets in Resources */ = {{isa = PBXBuildFile; fileRef = {assets_ref_id}; }};')

# Info.plist
plist_rel = "KVMusic/Config/Info.plist"
plist_ref_id = gen_id(plist_rel + "_ref")
file_refs.append(f'\t\t{plist_ref_id} /* Info.plist */ = {{isa = PBXFileReference; lastKnownFileType = text.plist.xml; path = Info.plist; sourceTree = "<group>"; }};')

# Swift files
for sf in swift_files:
    fname = os.path.basename(sf)
    fref_id = gen_id(sf + "_ref")
    bfile_id = gen_id(sf + "_build")
    file_refs.append(f'\t\t{fref_id} /* {fname} */ = {{isa = PBXFileReference; lastKnownFileType = sourcecode.swift; path = "{fname}"; sourceTree = "<group>"; }};')
    build_files.append(f'\t\t{bfile_id} /* {fname} in Sources */ = {{isa = PBXBuildFile; fileRef = {fref_id}; }};')
    source_build_files.append(f'\t\t\t\t{bfile_id} /* {fname} in Sources */,')

# Target Product
product_ref_id = gen_id("KVMusic.app_ref")
file_refs.append(f'\t\t{product_ref_id} /* KVMusic.app */ = {{isa = PBXFileReference; explicitFileType = wrapper.application; includeInIndex = 0; path = "KVMusic.app"; sourceTree = BUILT_PRODUCTS_DIR; }};')

# PBXGroups hierarchy
# Group tree:
# KVMusic/
#   App (KVMusicApp.swift, ContentView.swift)
#   Assets.xcassets
#   Config (Info.plist)
#   Models (Track.swift)
#   Services/
#     Network (KVMusicApi.swift)
#     Playback (PlayerManager.swift)
#     Storage (MusicDatabase.swift)
#   Theme (Theme.swift)
#   Views/
#     Components (MiniPlayerBar.swift, SoundCloudWaveformView.swift, SoundCloudTrackCard.swift, LyricsSheetView.swift)
#     Detail (DetailView.swift)
#     Home (HomeView.swift)
#     Library (LibraryView.swift)
#     Player (FullPlayerView.swift)
#     Search (SearchView.swift)
#     Settings (SettingsView.swift)

def make_group(gid, name, path, children_ids):
    c_str = "\n".join([f"\t\t\t\t{cid}," for cid in children_ids])
    return f"""\t\t{gid} /* {name} */ = {{
\t\t\tisa = PBXGroup;
\t\t\tchildren = (
{c_str}
\t\t\t);
\t\t\tpath = "{path}";
\t\t\tsourceTree = "<group>";
\t\t}};"""

groups = []

# Subgroups of Services
net_files = [gen_id(sf + "_ref") + f" /* {os.path.basename(sf)} */" for sf in swift_files if "Services/Network" in sf]
net_group_id = gen_id("group_Services_Network")
groups.append(make_group(net_group_id, "Network", "Network", net_files))

play_files = [gen_id(sf + "_ref") + f" /* {os.path.basename(sf)} */" for sf in swift_files if "Services/Playback" in sf]
play_group_id = gen_id("group_Services_Playback")
groups.append(make_group(play_group_id, "Playback", "Playback", play_files))

store_files = [gen_id(sf + "_ref") + f" /* {os.path.basename(sf)} */" for sf in swift_files if "Services/Storage" in sf]
store_group_id = gen_id("group_Services_Storage")
groups.append(make_group(store_group_id, "Storage", "Storage", store_files))

services_group_id = gen_id("group_Services")
groups.append(make_group(services_group_id, "Services", "Services", [
    f"{net_group_id} /* Network */",
    f"{play_group_id} /* Playback */",
    f"{store_group_id} /* Storage */"
]))

# Subgroups of Views
view_subgroups = ["Components", "Detail", "Home", "Library", "Player", "Search", "Settings"]
view_children = []
for sub in view_subgroups:
    sub_files = [gen_id(sf + "_ref") + f" /* {os.path.basename(sf)} */" for sf in swift_files if f"Views/{sub}" in sf]
    sub_id = gen_id(f"group_Views_{sub}")
    groups.append(make_group(sub_id, sub, sub, sub_files))
    view_children.append(f"{sub_id} /* {sub} */")

views_group_id = gen_id("group_Views")
groups.append(make_group(views_group_id, "Views", "Views", view_children))

# App, Config, Models, Theme groups
app_files = [gen_id(sf + "_ref") + f" /* {os.path.basename(sf)} */" for sf in swift_files if "App/" in sf]
app_group_id = gen_id("group_App")
groups.append(make_group(app_group_id, "App", "App", app_files))

config_group_id = gen_id("group_Config")
groups.append(make_group(config_group_id, "Config", "Config", [f"{plist_ref_id} /* Info.plist */"]))

models_files = [gen_id(sf + "_ref") + f" /* {os.path.basename(sf)} */" for sf in swift_files if "Models/" in sf]
models_group_id = gen_id("group_Models")
groups.append(make_group(models_group_id, "Models", "Models", models_files))

theme_files = [gen_id(sf + "_ref") + f" /* {os.path.basename(sf)} */" for sf in swift_files if "Theme/" in sf]
theme_group_id = gen_id("group_Theme")
groups.append(make_group(theme_group_id, "Theme", "Theme", theme_files))

# Main KVMusic group
kvmusic_group_id = gen_id("group_KVMusic")
groups.append(make_group(kvmusic_group_id, "KVMusic", "KVMusic", [
    f"{app_group_id} /* App */",
    f"{assets_ref_id} /* Assets.xcassets */",
    f"{config_group_id} /* Config */",
    f"{models_group_id} /* Models */",
    f"{services_group_id} /* Services */",
    f"{theme_group_id} /* Theme */",
    f"{views_group_id} /* Views */"
]))

# Products group
products_group_id = gen_id("group_Products")
groups.append(make_group(products_group_id, "Products", "", [f"{product_ref_id} /* KVMusic.app */"]))

# Root main group
root_group_id = gen_id("group_Root")
groups.append(f"""\t\t{root_group_id} /* Main Group */ = {{
\t\t\tisa = PBXGroup;
\t\t\tchildren = (
\t\t\t\t{kvmusic_group_id} /* KVMusic */,
\t\t\t\t{products_group_id} /* Products */,
\t\t\t);
\t\t\tsourceTree = "<group>";
\t\t}};""")

# IDs
target_id = gen_id("native_target_KVMusic")
project_id = gen_id("project_KVMusic")
sources_phase_id = gen_id("sources_phase_KVMusic")
resources_phase_id = gen_id("resources_phase_KVMusic")
frameworks_phase_id = gen_id("frameworks_phase_KVMusic")

proj_dbg_conf_id = gen_id("proj_dbg_conf")
proj_rel_conf_id = gen_id("proj_rel_conf")
proj_conf_list_id = gen_id("proj_conf_list")

target_dbg_conf_id = gen_id("target_dbg_conf")
target_rel_conf_id = gen_id("target_rel_conf")
target_conf_list_id = gen_id("target_conf_list")

pbxproj_content = f"""// !$*UTF8*$!
{{
	archiveVersion = 1;
	classes = {{
	}};
	objectVersion = 56;
	objects = {{

/* Begin PBXBuildFile section */
{chr(10).join(build_files)}
/* End PBXBuildFile section */

/* Begin PBXFileReference section */
{chr(10).join(file_refs)}
/* End PBXFileReference section */

/* Begin PBXFrameworksBuildPhase section */
\t\t{frameworks_phase_id} /* Frameworks */ = {{
\t\t\tisa = PBXFrameworksBuildPhase;
\t\t\tbuildActionMask = 2147483647;
\t\t\tfiles = (
\t\t\t);
\t\t\trunOnlyForDeploymentPostprocessing = 0;
\t\t}};
/* End PBXFrameworksBuildPhase section */

/* Begin PBXGroup section */
{chr(10).join(groups)}
/* End PBXGroup section */

/* Begin PBXNativeTarget section */
\t\t{target_id} /* KVMusic */ = {{
\t\t\tisa = PBXNativeTarget;
\t\t\tbuildConfigurationList = {target_conf_list_id} /* Build configuration list for PBXNativeTarget "KVMusic" */;
\t\t\tbuildPhases = (
\t\t\t\t{sources_phase_id} /* Sources */,
\t\t\t\t{frameworks_phase_id} /* Frameworks */,
\t\t\t\t{resources_phase_id} /* Resources */,
\t\t\t);
\t\t\tbuildRules = (
\t\t\t);
\t\t\tdependencies = (
\t\t\t);
\t\t\tname = KVMusic;
\t\t\tproductName = KVMusic;
\t\t\tproductReference = {product_ref_id} /* KVMusic.app */;
\t\t\tproductType = "com.apple.product-type.application";
\t\t}};
/* End PBXNativeTarget section */

/* Begin PBXProject section */
\t\t{project_id} /* Project object */ = {{
\t\t\tisa = PBXProject;
\t\t\tattributes = {{
\t\t\t\tBuildIndependentTargetsInParallel = 1;
\t\t\t\tLastSwiftUpdateCheck = 1540;
\t\t\t\tLastUpgradeCheck = 1540;
\t\t\t\tTargetAttributes = {{
\t\t\t\t\t{target_id} = {{
\t\t\t\t\t\tCreatedOnToolsVersion = 15.4;
\t\t\t\t\t}};
\t\t\t\t}};
\t\t\t}};
\t\t\tbuildConfigurationList = {proj_conf_list_id} /* Build configuration list for PBXProject "KVMusic" */;
\t\t\tcompatibilityVersion = "Xcode 14.0";
\t\t\tdevelopmentRegion = en;
\t\t\thasScannedForEncodings = 0;
\t\t\tknownRegions = (
\t\t\t\ten,
\t\t\t\tBase,
\t\t\t);
\t\t\tmainGroup = {root_group_id} /* Main Group */;
\t\t\tproductRefGroup = {products_group_id} /* Products */;
\t\t\tprojectDirPath = "";
\t\t\tprojectRoot = "";
\t\t\ttargets = (
\t\t\t\t{target_id} /* KVMusic */,
\t\t\t);
\t\t}};
/* End PBXProject section */

/* Begin PBXResourcesBuildPhase section */
\t\t{resources_phase_id} /* Resources */ = {{
\t\t\tisa = PBXResourcesBuildPhase;
\t\t\tbuildActionMask = 2147483647;
\t\t\tfiles = (
\t\t\t\t{assets_build_id} /* Assets.xcassets in Resources */,
\t\t\t);
\t\t\trunOnlyForDeploymentPostprocessing = 0;
\t\t}};
/* End PBXResourcesBuildPhase section */

/* Begin PBXSourcesBuildPhase section */
\t\t{sources_phase_id} /* Sources */ = {{
\t\t\tisa = PBXSourcesBuildPhase;
\t\t\tbuildActionMask = 2147483647;
\t\t\tfiles = (
{chr(10).join(source_build_files)}
\t\t\t);
\t\t\trunOnlyForDeploymentPostprocessing = 0;
\t\t}};
/* End PBXSourcesBuildPhase section */

/* Begin XCBuildConfiguration section */
\t\t{proj_dbg_conf_id} /* Debug */ = {{
\t\t\tisa = XCBuildConfiguration;
\t\t\tbuildSettings = {{
\t\t\t\tALWAYS_SEARCH_USER_PATHS = NO;
\t\t\t\tASSETCATALOG_COMPILER_GENERATE_SWIFT_ASSET_SYMBOL_EXTENSIONS = YES;
\t\t\t\tCLANG_ANALYZER_NONNULL = YES;
\t\t\t\tCLANG_ANALYZER_NUMBER_OBJECT_CONVERSION = YES_AGGRESSIVE;
\t\t\t\tCLANG_CXX_LANGUAGE_STANDARD = "gnu++20";
\t\t\t\tCLANG_ENABLE_MODULES = YES;
\t\t\t\tCLANG_ENABLE_OBJC_ARC = YES;
\t\t\t\tCLANG_ENABLE_OBJC_WEAK = YES;
\t\t\t\tCOPY_PHASE_STRIP = NO;
\t\t\t\tDEBUG_INFORMATION_FORMAT = dwarf;
\t\t\t\tENABLE_STRICT_OBJC_MSGSEND = YES;
\t\t\t\tENABLE_TESTABILITY = YES;
\t\t\t\tENABLE_USER_SCRIPT_SANDBOXING = YES;
\t\t\t\tGCC_C_LANGUAGE_STANDARD = gnu17;
\t\t\t\tGCC_DYNAMIC_NO_PIC = NO;
\t\t\t\tGCC_NO_COMMON_BLOCKS = YES;
\t\t\t\tGCC_OPTIMIZATION_LEVEL = 0;
\t\t\t\tGCC_PREPROCESSOR_DEFINITIONS = (
\t\t\t\t\t"DEBUG=1",
\t\t\t\t\t"$(inherited)",
\t\t\t\t);
\t\t\t\tIPHONEOS_DEPLOYMENT_TARGET = 17.0;
\t\t\t\tMTL_ENABLE_DEBUG_INFO = INCLUDE_SOURCE;
\t\t\t\tMTL_FAST_MATH = YES;
\t\t\t\tONLY_ACTIVE_ARCH = YES;
\t\t\t\tSDKROOT = iphoneos;
\t\t\t\tSWIFT_ACTIVE_COMPILATION_CONDITIONS = "DEBUG $(inherited)";
\t\t\t\tSWIFT_OPTIMIZATION_LEVEL = "-Onone";
\t\t\t\tSWIFT_VERSION = 5.0;
\t\t\t}};
\t\t\tname = Debug;
\t\t}};
\t\t{proj_rel_conf_id} /* Release */ = {{
\t\t\tisa = XCBuildConfiguration;
\t\t\tbuildSettings = {{
\t\t\t\tALWAYS_SEARCH_USER_PATHS = NO;
\t\t\t\tASSETCATALOG_COMPILER_GENERATE_SWIFT_ASSET_SYMBOL_EXTENSIONS = YES;
\t\t\t\tCLANG_ANALYZER_NONNULL = YES;
\t\t\t\tCLANG_ANALYZER_NUMBER_OBJECT_CONVERSION = YES_AGGRESSIVE;
\t\t\t\tCLANG_CXX_LANGUAGE_STANDARD = "gnu++20";
\t\t\t\tCLANG_ENABLE_MODULES = YES;
\t\t\t\tCLANG_ENABLE_OBJC_ARC = YES;
\t\t\t\tCLANG_ENABLE_OBJC_WEAK = YES;
\t\t\t\tCOPY_PHASE_STRIP = NO;
\t\t\t\tDEBUG_INFORMATION_FORMAT = "dwarf-with-dsym";
\t\t\t\tENABLE_NS_ASSERTIONS = NO;
\t\t\t\tENABLE_USER_SCRIPT_SANDBOXING = YES;
\t\t\t\tGCC_C_LANGUAGE_STANDARD = gnu17;
\t\t\t\tGCC_NO_COMMON_BLOCKS = YES;
\t\t\t\tIPHONEOS_DEPLOYMENT_TARGET = 17.0;
\t\t\t\tMTL_ENABLE_DEBUG_INFO = NO;
\t\t\t\tMTL_FAST_MATH = YES;
\t\t\t\tSDKROOT = iphoneos;
\t\t\t\tSWIFT_COMPILATION_MODE = wholemodule;
\t\t\t\tSWIFT_VERSION = 5.0;
\t\t\t\tVALIDATE_PRODUCT = YES;
\t\t\t}};
\t\t\tname = Release;
\t\t}};
\t\t{target_dbg_conf_id} /* Debug */ = {{
\t\t\tisa = XCBuildConfiguration;
\t\t\tbuildSettings = {{
\t\t\t\tASSETCATALOG_COMPILER_APPICON_NAME = AppIcon;
\t\t\t\tASSETCATALOG_COMPILER_GLOBAL_ACCENT_COLOR_NAME = AccentColor;
\t\t\t\tCODE_SIGN_STYLE = Automatic;
\t\t\t\tCURRENT_PROJECT_VERSION = 1;
\t\t\t\tDEVELOPMENT_ASSET_PATHS = "";
\t\t\t\tENABLE_PREVIEWS = YES;
\t\t\t\tGENERATE_INFOPLIST_FILE = NO;
\t\t\t\tINFOPLIST_FILE = KVMusic/Config/Info.plist;
\t\t\t\tLD_RUNPATH_SEARCH_PATHS = (
\t\t\t\t\t"$(inherited)",
\t\t\t\t\t"@executable_path/Frameworks",
\t\t\t\t);
\t\t\t\tMARKETING_VERSION = 1.0.0;
\t\t\t\tPRODUCT_BUNDLE_IDENTIFIER = com.kvmusic.ios;
\t\t\t\tPRODUCT_NAME = "$(TARGET_NAME)";
\t\t\t\tSWIFT_EMIT_LOC_STRINGS = YES;
\t\t\t\tTARGETED_DEVICE_FAMILY = "1,2";
\t\t\t}};
\t\t\tname = Debug;
\t\t}};
\t\t{target_rel_conf_id} /* Release */ = {{
\t\t\tisa = XCBuildConfiguration;
\t\t\tbuildSettings = {{
\t\t\t\tASSETCATALOG_COMPILER_APPICON_NAME = AppIcon;
\t\t\t\tASSETCATALOG_COMPILER_GLOBAL_ACCENT_COLOR_NAME = AccentColor;
\t\t\t\tCODE_SIGN_STYLE = Automatic;
\t\t\t\tCURRENT_PROJECT_VERSION = 1;
\t\t\t\tDEVELOPMENT_ASSET_PATHS = "";
\t\t\t\tENABLE_PREVIEWS = YES;
\t\t\t\tGENERATE_INFOPLIST_FILE = NO;
\t\t\t\tINFOPLIST_FILE = KVMusic/Config/Info.plist;
\t\t\t\tLD_RUNPATH_SEARCH_PATHS = (
\t\t\t\t\t"$(inherited)",
\t\t\t\t\t"@executable_path/Frameworks",
\t\t\t\t);
\t\t\t\tMARKETING_VERSION = 1.0.0;
\t\t\t\tPRODUCT_BUNDLE_IDENTIFIER = com.kvmusic.ios;
\t\t\t\tPRODUCT_NAME = "$(TARGET_NAME)";
\t\t\t\tSWIFT_EMIT_LOC_STRINGS = YES;
\t\t\t\tTARGETED_DEVICE_FAMILY = "1,2";
\t\t\t}};
\t\t\tname = Release;
\t\t}};
/* End XCBuildConfiguration section */

/* Begin XCConfigurationList section */
\t\t{proj_conf_list_id} /* Build configuration list for PBXProject "KVMusic" */ = {{
\t\t\tisa = XCConfigurationList;
\t\t\tbuildConfigurations = (
\t\t\t\t{proj_dbg_conf_id} /* Debug */,
\t\t\t\t{proj_rel_conf_id} /* Release */,
\t\t\t);
\t\t\tdefaultConfigurationIsVisible = 0;
\t\t\tdefaultConfigurationName = Release;
\t\t}};
\t\t{target_conf_list_id} /* Build configuration list for PBXNativeTarget "KVMusic" */ = {{
\t\t\tisa = XCConfigurationList;
\t\t\tbuildConfigurations = (
\t\t\t\t{target_dbg_conf_id} /* Debug */,
\t\t\t\t{target_rel_conf_id} /* Release */,
\t\t\t);
\t\t\tdefaultConfigurationIsVisible = 0;
\t\t\tdefaultConfigurationName = Release;
\t\t}};
/* End XCConfigurationList section */

	}};
	rootObject = {project_id} /* Project object */;
}}
"""

proj_dir = os.path.join(base_dir, "KVMusic.xcodeproj")
os.makedirs(proj_dir, exist_ok=True)
pbxproj_path = os.path.join(proj_dir, "project.pbxproj")
with open(pbxproj_path, "w") as f:
    f.write(pbxproj_content)

# Shared scheme
scheme_dir = os.path.join(proj_dir, "xcshareddata", "xcschemes")
os.makedirs(scheme_dir, exist_ok=True)
scheme_path = os.path.join(scheme_dir, "KVMusic.xcscheme")

scheme_content = f"""<?xml version="1.0" encoding="UTF-8"?>
<Scheme
   LastUpgradeVersion = "1540"
   version = "1.7">
   <BuildAction
      parallelizeBuildables = "YES"
      buildImplicitDependencies = "YES">
      <BuildActionEntries>
         <BuildActionEntry
            buildForTesting = "YES"
            buildForRunning = "YES"
            buildForProfiling = "YES"
            buildForArchiving = "YES"
            buildForAnalyzing = "YES">
            <BuildableReference
               BuildableIdentifier = "primary"
               BlueprintIdentifier = "{target_id}"
               BuildableName = "KVMusic.app"
               BlueprintName = "KVMusic"
               ReferencedContainer = "container:KVMusic.xcodeproj">
            </BuildableReference>
         </BuildActionEntry>
      </BuildActionEntries>
   </BuildAction>
   <LaunchAction
      buildConfiguration = "Debug"
      selectedDebuggerIdentifier = "Xcode.DebuggerFoundation.Debugger.LLDB"
      selectedLauncherIdentifier = "Xcode.DebuggerFoundation.Launcher.LLDB"
      launchStyle = "0"
      useRelativeToInfoPlist = "NO"
      ignoresPersistentStateOnLaunch = "NO"
      debugDocumentVersioning = "YES"
      debugServiceExtension = "internal"
      allowLocationSimulation = "YES">
      <BuildableProductRunnable
         runnableDebuggingMode = "0">
         <BuildableReference
            BuildableIdentifier = "primary"
            BlueprintIdentifier = "{target_id}"
            BuildableName = "KVMusic.app"
            BlueprintName = "KVMusic"
            ReferencedContainer = "container:KVMusic.xcodeproj">
         </BuildableReference>
      </BuildableProductRunnable>
   </LaunchAction>
   <ProfileAction
      buildConfiguration = "Release"
      shouldUseLaunchSchemeArgsEnv = "YES"
      savedToolIdentifier = ""
      useRelativeToInfoPlist = "NO"
      debugDocumentVersioning = "YES">
      <BuildableProductRunnable
         runnableDebuggingMode = "0">
         <BuildableReference
            BuildableIdentifier = "primary"
            BlueprintIdentifier = "{target_id}"
            BuildableName = "KVMusic.app"
            BlueprintName = "KVMusic"
            ReferencedContainer = "container:KVMusic.xcodeproj">
         </BuildableReference>
      </BuildableProductRunnable>
   </ProfileAction>
   <AnalyzeAction
      buildConfiguration = "Debug">
   </AnalyzeAction>
   <ArchiveAction
      buildConfiguration = "Release"
      revealArchiveInOrganizer = "YES">
   </ArchiveAction>
</Scheme>
"""

with open(scheme_path, "w") as f:
    f.write(scheme_content)

print(f"Generated {pbxproj_path} and {scheme_path} successfully!")
