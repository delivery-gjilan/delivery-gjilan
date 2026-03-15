const { withDangerousMod, withXcodeProject } = require('expo/config-plugins');
const {
  addBuildSourceFileToGroup,
  ensureGroupRecursively,
} = require('@expo/config-plugins/build/ios/utils/Xcodeproj');
const fs = require('fs');
const path = require('path');

const EXTENSION_TARGET_NAME = 'DeliveryLiveActivityExtension';

// Shared between extension AND main app targets
const DELIVERY_ACTIVITY_ATTRIBUTES_SWIFT = `import ActivityKit
import Foundation

@available(iOS 16.1, *)
struct DeliveryActivityAttributes: ActivityAttributes {
    public struct ContentState: Codable, Hashable {
        var driverName: String
        var estimatedMinutes: Int
        var status: String
        var orderId: String
        var lastUpdated: Int64  // Unix timestamp ms
    }

    var orderDisplayId: String
    var businessName: String
}
`;

// Custom native module – added to the MAIN APP target so it can call Activity<T>.request(...)
// NOTE: DeliveryActivityAttributes is defined here (not as a separate file) to avoid a
// duplicate-filename conflict with the extension target's DeliveryActivityAttributes.swift.
const DELIVERY_LIVE_ACTIVITIES_SWIFT = `import Foundation
import ActivityKit
import React

@available(iOS 16.1, *)
struct DeliveryActivityAttributes: ActivityAttributes {
    public struct ContentState: Codable, Hashable {
        var driverName: String
        var estimatedMinutes: Int
        var status: String
        var orderId: String
        var lastUpdated: Int64  // Unix timestamp ms
    }
    var orderDisplayId: String
    var businessName: String
}

@objc(DeliveryLiveActivities)
class DeliveryLiveActivities: NSObject {

    // MARK: - startActivity
    @objc
    func startActivity(_ attributesDict: NSDictionary,
                       state stateDict: NSDictionary,
                       resolver resolve: @escaping RCTPromiseResolveBlock,
                       rejecter reject: @escaping RCTPromiseRejectBlock) {
        guard #available(iOS 16.2, *) else {
            reject("NOT_SUPPORTED", "Live Activities require iOS 16.2+", nil)
            return
        }
        let attrs = DeliveryActivityAttributes(
            orderDisplayId: attributesDict["orderDisplayId"] as? String ?? "",
            businessName: attributesDict["businessName"] as? String ?? ""
        )
        let contentState = DeliveryActivityAttributes.ContentState(
            driverName: stateDict["driverName"] as? String ?? "",
            estimatedMinutes: (stateDict["estimatedMinutes"] as? NSNumber)?.intValue ?? 0,
            status: stateDict["status"] as? String ?? "",
            orderId: stateDict["orderId"] as? String ?? "",
            lastUpdated: (stateDict["lastUpdated"] as? NSNumber)?.int64Value ?? Int64(Date().timeIntervalSince1970 * 1000)
        )
        do {
            let content = ActivityContent(state: contentState, staleDate: nil)
            let activity = try Activity<DeliveryActivityAttributes>.request(
                attributes: attrs,
                content: content,
                pushType: .token
            )
            resolve(activity.id)
        } catch {
            reject("START_ACTIVITY_ERROR", error.localizedDescription, error)
        }
    }

    // MARK: - updateActivity
    @objc
    func updateActivity(_ activityId: String,
                        state stateDict: NSDictionary,
                        resolver resolve: @escaping RCTPromiseResolveBlock,
                        rejecter reject: @escaping RCTPromiseRejectBlock) {
        guard #available(iOS 16.2, *) else {
            resolve(nil)
            return
        }
        guard let activity = Activity<DeliveryActivityAttributes>.activities.first(where: { $0.id == activityId }) else {
            reject("ACTIVITY_NOT_FOUND", "Activity not found: \\(activityId)", nil)
            return
        }
        let newState = DeliveryActivityAttributes.ContentState(
            driverName: stateDict["driverName"] as? String ?? "",
            estimatedMinutes: (stateDict["estimatedMinutes"] as? NSNumber)?.intValue ?? 0,
            status: stateDict["status"] as? String ?? "",
            orderId: stateDict["orderId"] as? String ?? "",
            lastUpdated: (stateDict["lastUpdated"] as? NSNumber)?.int64Value ?? Int64(Date().timeIntervalSince1970 * 1000)
        )
        Task {
            let content = ActivityContent(state: newState, staleDate: nil)
            await activity.update(content)
            resolve(activityId)
        }
    }

    // MARK: - endActivity
    @objc
    func endActivity(_ activityId: String,
                     resolver resolve: @escaping RCTPromiseResolveBlock,
                     rejecter reject: @escaping RCTPromiseRejectBlock) {
        guard #available(iOS 16.2, *) else {
            resolve(nil)
            return
        }
        guard let activity = Activity<DeliveryActivityAttributes>.activities.first(where: { $0.id == activityId }) else {
            resolve(nil)
            return
        }
        Task {
            await activity.end(nil, dismissalPolicy: .immediate)
            resolve(nil)
        }
    }

    // MARK: - getPushToken
    @objc
    func getPushToken(_ activityId: String,
                      resolver resolve: @escaping RCTPromiseResolveBlock,
                      rejecter reject: @escaping RCTPromiseRejectBlock) {
        guard #available(iOS 16.1, *) else {
            reject("NOT_SUPPORTED", "Live Activities require iOS 16.1+", nil)
            return
        }
        guard let activity = Activity<DeliveryActivityAttributes>.activities.first(where: { $0.id == activityId }) else {
            reject("ACTIVITY_NOT_FOUND", "Activity not found: \\(activityId)", nil)
            return
        }
        if let tokenData = activity.pushToken {
            resolve(tokenData.map { String(format: "%02x", $0) }.joined())
            return
        }
        Task {
            for await tokenData in activity.pushTokenUpdates {
                resolve(tokenData.map { String(format: "%02x", $0) }.joined())
                return
            }
            reject("NO_PUSH_TOKEN", "No push token available for activity \\(activityId)", nil)
        }
    }

    @objc
    static func requiresMainQueueSetup() -> Bool { return false }
}
`;

// Objective-C bridge so RN can find the Swift module via NativeModules.DeliveryLiveActivities
const DELIVERY_LIVE_ACTIVITIES_OBJC = `#import <React/RCTBridgeModule.h>

@interface RCT_EXTERN_MODULE(DeliveryLiveActivities, NSObject)

RCT_EXTERN_METHOD(startActivity:(NSDictionary *)attributesDict
                  state:(NSDictionary *)stateDict
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(updateActivity:(NSString *)activityId
                  state:(NSDictionary *)stateDict
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(endActivity:(NSString *)activityId
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(getPushToken:(NSString *)activityId
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

@end
`;

const DELIVERY_LIVE_ACTIVITY_WIDGET_SWIFT = `import ActivityKit
import SwiftUI
import WidgetKit

@main
struct DeliveryLiveActivityBundle: WidgetBundle {
    var body: some Widget {
        DeliveryLiveActivityWidget()
    }
}

struct DeliveryLiveActivityWidget: Widget {
  private let islandPurple = Color(red: 0.43, green: 0.27, blue: 0.86)
  private let pendingAmber = Color(red: 0.96, green: 0.67, blue: 0.16)
  private let preparingOrange = Color(red: 0.98, green: 0.49, blue: 0.13)
  private let etaGreen = Color(red: 0.16, green: 0.82, blue: 0.43)

  private func driverInitial(from name: String) -> String {
    let trimmed = name.trimmingCharacters(in: .whitespacesAndNewlines)
    guard let first = trimmed.first else { return "D" }
    return String(first).uppercased()
  }

  private func normalizedEtaMinutes(_ minutes: Int) -> Int {
    max(0, min(minutes, 120))
  }

  private func etaProgress(_ minutes: Int) -> Double {
    let normalized = Double(normalizedEtaMinutes(minutes)) / 120.0
    return max(0.05, 1.0 - normalized)
  }

  private func etaLabel(_ minutes: Int) -> String {
    "\\(max(0, minutes))m"
  }

  private func normalizedStatus(_ status: String) -> String {
    switch status.lowercased() {
    case "pending":
      return "pending"
    case "out_for_delivery":
      return "out_for_delivery"
    case "preparing", "ready":
      return "preparing"
    default:
      return "preparing"
    }
  }

  private func statusAccent(_ status: String) -> Color {
    switch normalizedStatus(status) {
    case "pending":
      return pendingAmber
    case "out_for_delivery":
      return etaGreen
    default:
      return preparingOrange
    }
  }

  private func statusTitle(_ status: String) -> String {
    switch normalizedStatus(status) {
    case "pending":
      return "Order Received"
    case "out_for_delivery":
      return "On the Way"
    default:
      return "Preparing"
    }
  }

  private func statusSubtitle(_ status: String) -> String {
    switch normalizedStatus(status) {
    case "pending":
      return "Waiting for business confirmation"
    case "out_for_delivery":
      return "Driver is heading to your address"
    default:
      return "Kitchen is preparing your order"
    }
  }

  private func statusSymbol(_ status: String) -> String {
    switch normalizedStatus(status) {
    case "pending":
      return "clock.badge"
    case "out_for_delivery":
      return "location.fill"
    default:
      return "fork.knife"
    }
  }

  private func showsEta(_ status: String) -> Bool {
    let key = normalizedStatus(status)
    return key == "preparing" || key == "out_for_delivery"
  }

    var body: some WidgetConfiguration {
        ActivityConfiguration(for: DeliveryActivityAttributes.self) { context in
            let accent = statusAccent(context.state.status)
            VStack(alignment: .leading, spacing: 8) {
                Text(statusTitle(context.state.status))
                    .font(.headline)
                    .foregroundStyle(Color.white)
                Text(context.attributes.businessName)
                    .font(.subheadline)
                    .foregroundStyle(Color.white.opacity(0.8))
                HStack(spacing: 6) {
                    Image(systemName: statusSymbol(context.state.status))
                        .font(.caption.weight(.semibold))
                    Text(statusSubtitle(context.state.status))
                        .font(.caption)
                }
                .foregroundStyle(accent)
            }
            .padding(12)
            .activityBackgroundTint(accent.opacity(0.3))
            .activitySystemActionForegroundColor(Color.white)
        } dynamicIsland: { context in
            let statusKey = normalizedStatus(context.state.status)
            let accent = statusAccent(context.state.status)
            DynamicIsland {
                DynamicIslandExpandedRegion(.leading) {
                HStack(spacing: 6) {
                  Text(driverInitial(from: context.state.driverName))
                    .font(.system(size: 20, weight: .bold, design: .rounded))
                    .foregroundStyle(islandPurple)
                  Image(systemName: "scooter")
                    .font(.system(size: 16, weight: .semibold))
                    .foregroundStyle(islandPurple)
                }
                }
                DynamicIslandExpandedRegion(.trailing) {
                if showsEta(statusKey) {
                  let progress = etaProgress(context.state.estimatedMinutes)
                  ZStack {
                    Circle()
                      .stroke(accent.opacity(0.22), lineWidth: 5)
                    Circle()
                      .trim(from: 0, to: progress)
                      .stroke(accent, style: StrokeStyle(lineWidth: 5, lineCap: .round))
                      .rotationEffect(.degrees(-90))
                    Text(etaLabel(context.state.estimatedMinutes))
                      .font(.system(size: 11, weight: .bold, design: .rounded))
                      .foregroundStyle(accent)
                  }
                  .frame(width: 44, height: 44)
                } else {
                  ZStack {
                    Circle()
                      .fill(accent.opacity(0.18))
                    Image(systemName: "clock")
                      .font(.system(size: 15, weight: .bold))
                      .foregroundStyle(accent)
                  }
                  .frame(width: 34, height: 34)
                }
                }
                DynamicIslandExpandedRegion(.bottom) {
                VStack(alignment: .leading, spacing: 2) {
                  Text(context.attributes.businessName)
                    .font(.caption)
                    .foregroundStyle(Color.white.opacity(0.85))
                  if showsEta(statusKey) {
                    Text("ETA \\(etaLabel(context.state.estimatedMinutes)) - \\(statusTitle(context.state.status))")
                      .font(.subheadline)
                      .foregroundStyle(accent)
                  } else {
                    Text("Order is pending confirmation")
                      .font(.subheadline)
                      .foregroundStyle(accent)
                  }
                }
                }
            } compactLeading: {
              HStack(spacing: 3) {
                Text(driverInitial(from: context.state.driverName))
                  .font(.system(size: 14, weight: .bold, design: .rounded))
                Image(systemName: "scooter")
                  .font(.system(size: 11, weight: .semibold))
              }
              .foregroundStyle(islandPurple)
            } compactTrailing: {
              if showsEta(statusKey) {
                let progress = etaProgress(context.state.estimatedMinutes)
                ZStack {
                  Circle()
                    .stroke(accent.opacity(0.22), lineWidth: 3)
                  Circle()
                    .trim(from: 0, to: progress)
                    .stroke(accent, style: StrokeStyle(lineWidth: 3, lineCap: .round))
                    .rotationEffect(.degrees(-90))
                  Text(etaLabel(context.state.estimatedMinutes))
                    .font(.system(size: 8, weight: .bold, design: .rounded))
                    .foregroundStyle(accent)
                }
                .frame(width: 30, height: 30)
              } else {
                Image(systemName: "clock.badge")
                  .font(.system(size: 13, weight: .bold))
                  .foregroundStyle(accent)
              }
            } minimal: {
              Image(systemName: "scooter")
                .foregroundStyle(accent)
            }
        }
    }
}
`;

const EXTENSION_INFO_PLIST = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>CFBundleDisplayName</key>
  <string>$(PRODUCT_NAME)</string>
  <key>CFBundleExecutable</key>
  <string>$(EXECUTABLE_NAME)</string>
  <key>CFBundleIdentifier</key>
  <string>$(PRODUCT_BUNDLE_IDENTIFIER)</string>
  <key>CFBundleInfoDictionaryVersion</key>
  <string>6.0</string>
  <key>CFBundleName</key>
  <string>$(PRODUCT_NAME)</string>
  <key>CFBundlePackageType</key>
  <string>XPC!</string>
  <key>CFBundleShortVersionString</key>
  <string>$(MARKETING_VERSION)</string>
  <key>CFBundleVersion</key>
  <string>$(CURRENT_PROJECT_VERSION)</string>
  <key>NSExtension</key>
  <dict>
    <key>NSExtensionPointIdentifier</key>
    <string>com.apple.widgetkit-extension</string>
  </dict>
</dict>
</plist>
`;

// Always write – ensures files track the plugin definition after every prebuild
function writeFile(filePath, content) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content, 'utf8');
}

// Keep ensureFile for widget UI files (users may want to customise the widget appearance)
function ensureFile(filePath, content) {
  if (fs.existsSync(filePath)) {
    return;
  }
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content, 'utf8');
}

// ─── Widget extension files ──────────────────────────────────────────────────

function withLiveActivityExtensionFiles(config) {
  return withDangerousMod(config, [
    'ios',
    async (cfg) => {
      const extensionDir = path.join(cfg.modRequest.platformProjectRoot, EXTENSION_TARGET_NAME);

      // Always keep attributes in sync with the main app copy
      writeFile(
        path.join(extensionDir, 'DeliveryActivityAttributes.swift'),
        DELIVERY_ACTIVITY_ATTRIBUTES_SWIFT,
      );

      writeFile(
        path.join(extensionDir, 'DeliveryLiveActivityWidget.swift'),
        DELIVERY_LIVE_ACTIVITY_WIDGET_SWIFT,
      );

      ensureFile(
        path.join(extensionDir, `${EXTENSION_TARGET_NAME}-Info.plist`),
        EXTENSION_INFO_PLIST,
      );

      console.log('[LiveActivityExtension] Ensured extension Swift and Info.plist files');
      return cfg;
    },
  ]);
}

function withLiveActivityExtensionTarget(config) {
  return withXcodeProject(config, (cfg) => {
    const project = cfg.modResults;

    const setMainTargetSourceExclusions = () => {
      const nativeTargets = project.pbxNativeTargetSection();
      const buildConfigLists = project.pbxXCConfigurationList();
      const buildConfigSection = project.pbxXCBuildConfigurationSection();

      const mainAppTargetEntry = Object.entries(nativeTargets).find(([, target]) => {
        return (
          target &&
          typeof target === 'object' &&
          target.productType === '"com.apple.product-type.application"'
        );
      });

      if (!mainAppTargetEntry) {
        return;
      }

      const [mainTargetUuid] = mainAppTargetEntry;
      const mainTarget = nativeTargets[mainTargetUuid];
      if (!mainTarget || !mainTarget.buildConfigurationList) {
        return;
      }

      const configListId = String(mainTarget.buildConfigurationList).split(' ')[0].replace(/"/g, '');
      const configList = buildConfigLists[configListId];
      if (!configList || !Array.isArray(configList.buildConfigurations)) {
        return;
      }

      for (const configRef of configList.buildConfigurations) {
        const configId = String(configRef.value || configRef).split(' ')[0].replace(/"/g, '');
        const buildConfig = buildConfigSection[configId];
        if (!buildConfig || !buildConfig.buildSettings) {
          continue;
        }

        const exclusionsToEnsure = [
          'DeliveryActivityAttributes.swift',
          'DeliveryLiveActivityWidget.swift',
        ];
        const existing = buildConfig.buildSettings.EXCLUDED_SOURCE_FILE_NAMES;

        if (!existing) {
          buildConfig.buildSettings.EXCLUDED_SOURCE_FILE_NAMES = [
            ...exclusionsToEnsure,
          ];
          continue;
        }

        const existingValues = Array.isArray(existing) ? existing : [existing];
        const nextValues = [...existingValues];
        for (const exclusion of exclusionsToEnsure) {
          if (!nextValues.includes(exclusion)) {
            nextValues.push(exclusion);
          }
        }
        buildConfig.buildSettings.EXCLUDED_SOURCE_FILE_NAMES = nextValues;
      }
    };

    const getMainAppDevelopmentTeam = () => {
      const nativeTargets = project.pbxNativeTargetSection();
      const buildConfigLists = project.pbxXCConfigurationList();
      const buildConfigSection = project.pbxXCBuildConfigurationSection();

      const mainAppTargetEntry = Object.values(nativeTargets).find((target) => {
        return (
          target &&
          typeof target === 'object' &&
          target.productType === '"com.apple.product-type.application"'
        );
      });

      if (!mainAppTargetEntry || !mainAppTargetEntry.buildConfigurationList) {
        return null;
      }

      const configListId = String(mainAppTargetEntry.buildConfigurationList).split(' ')[0].replace(/"/g, '');
      const configList = buildConfigLists[configListId];
      if (!configList || !Array.isArray(configList.buildConfigurations)) {
        return null;
      }

      for (const configRef of configList.buildConfigurations) {
        const configId = String(configRef.value || configRef).split(' ')[0].replace(/"/g, '');
        const buildConfig = buildConfigSection[configId];
        const teamId = buildConfig?.buildSettings?.DEVELOPMENT_TEAM;
        if (teamId && String(teamId).trim().length > 0) {
          return String(teamId).replace(/"/g, '');
        }
      }

      return null;
    };

    const setTargetBuildSettings = (targetUuid, developmentTeam, bundleId, marketingVersion, currentProjectVersion) => {
      if (!targetUuid) {
        return;
      }

      const nativeTargets = project.pbxNativeTargetSection();
      const buildConfigLists = project.pbxXCConfigurationList();
      const buildConfigSection = project.pbxXCBuildConfigurationSection();
      const target = nativeTargets[targetUuid];

      if (!target || !target.buildConfigurationList) {
        return;
      }

      const configListId = String(target.buildConfigurationList).split(' ')[0].replace(/"/g, '');
      const configList = buildConfigLists[configListId];
      if (!configList || !Array.isArray(configList.buildConfigurations)) {
        return;
      }

      for (const configRef of configList.buildConfigurations) {
        const configId = String(configRef.value || configRef).split(' ')[0].replace(/"/g, '');
        const buildConfig = buildConfigSection[configId];
        if (!buildConfig || !buildConfig.buildSettings) {
          continue;
        }

        if (developmentTeam) {
          buildConfig.buildSettings.DEVELOPMENT_TEAM = developmentTeam;
          buildConfig.buildSettings.CODE_SIGN_STYLE = 'Automatic';
        }

        buildConfig.buildSettings.PRODUCT_BUNDLE_PACKAGE_TYPE = '"com.apple.package-type.app-extension"';
        buildConfig.buildSettings.MACH_O_TYPE = 'mh_bundle';
        buildConfig.buildSettings.INFOPLIST_FILE = `${EXTENSION_TARGET_NAME}/${EXTENSION_TARGET_NAME}-Info.plist`;
        buildConfig.buildSettings.GENERATE_INFOPLIST_FILE = 'NO';
        buildConfig.buildSettings.PRODUCT_NAME = EXTENSION_TARGET_NAME;
        buildConfig.buildSettings.SKIP_INSTALL = 'YES';
        buildConfig.buildSettings.APPLICATION_EXTENSION_API_ONLY = 'YES';
        buildConfig.buildSettings.SWIFT_VERSION = '5.0';
        buildConfig.buildSettings.IPHONEOS_DEPLOYMENT_TARGET = '16.2';
        buildConfig.buildSettings.ASSETCATALOG_COMPILER_GLOBAL_ACCENT_COLOR_NAME = 'AccentColor';
        buildConfig.buildSettings.ASSETCATALOG_COMPILER_WIDGET_BACKGROUND_COLOR_NAME = 'WidgetBackground';
        buildConfig.buildSettings.LD_RUNPATH_SEARCH_PATHS = '"$(inherited) @executable_path/Frameworks @executable_path/../../Frameworks"';
        if (bundleId) {
          buildConfig.buildSettings.PRODUCT_BUNDLE_IDENTIFIER = bundleId;
        }

        if (marketingVersion) {
          buildConfig.buildSettings.MARKETING_VERSION = marketingVersion;
        }

        if (currentProjectVersion) {
          buildConfig.buildSettings.CURRENT_PROJECT_VERSION = currentProjectVersion;
        }
      }
    };

    const getMainAppBuildSettings = () => {
      const nativeTargets = project.pbxNativeTargetSection();
      const buildConfigLists = project.pbxXCConfigurationList();
      const buildConfigSection = project.pbxXCBuildConfigurationSection();

      const mainAppTargetEntry = Object.values(nativeTargets).find((target) => {
        return (
          target &&
          typeof target === 'object' &&
          target.productType === '"com.apple.product-type.application"'
        );
      });

      if (!mainAppTargetEntry || !mainAppTargetEntry.buildConfigurationList) {
        return {};
      }

      const configListId = String(mainAppTargetEntry.buildConfigurationList).split(' ')[0].replace(/"/g, '');
      const configList = buildConfigLists[configListId];
      if (!configList || !Array.isArray(configList.buildConfigurations)) {
        return {};
      }

      const settings = {};

      for (const configRef of configList.buildConfigurations) {
        const configId = String(configRef.value || configRef).split(' ')[0].replace(/"/g, '');
        const buildConfig = buildConfigSection[configId];
        const buildSettings = buildConfig?.buildSettings;
        if (!buildSettings) continue;

        if (!settings.DEVELOPMENT_TEAM && buildSettings.DEVELOPMENT_TEAM) {
          settings.DEVELOPMENT_TEAM = String(buildSettings.DEVELOPMENT_TEAM).replace(/"/g, '');
        }
        if (!settings.MARKETING_VERSION && buildSettings.MARKETING_VERSION) {
          settings.MARKETING_VERSION = buildSettings.MARKETING_VERSION;
        }
        if (!settings.CURRENT_PROJECT_VERSION && buildSettings.CURRENT_PROJECT_VERSION) {
          settings.CURRENT_PROJECT_VERSION = buildSettings.CURRENT_PROJECT_VERSION;
        }
      }

      return settings;
    };

    const mainAppSettings = getMainAppBuildSettings();

    const resolvedDevelopmentTeam =
      cfg.ios?.appleTeamId ||
      process.env.EXPO_APPLE_TEAM_ID ||
      process.env.APPLE_TEAM_ID ||
      mainAppSettings.DEVELOPMENT_TEAM;

    const marketingVersion = cfg.version || mainAppSettings.MARKETING_VERSION || '1.0.0';
    const currentProjectVersion = cfg.ios?.buildNumber || mainAppSettings.CURRENT_PROJECT_VERSION || '1';

    const appBundleId = cfg.ios?.bundleIdentifier || 'com.anonymous.mobilecustomer';
    const extensionBundleId = `${appBundleId}.${EXTENSION_TARGET_NAME}`;

    if (project.pbxTargetByName(EXTENSION_TARGET_NAME)) {
      const existingTarget = project.pbxTargetByName(EXTENSION_TARGET_NAME);
      if (existingTarget?.uuid) {
        setTargetBuildSettings(
          existingTarget.uuid,
          resolvedDevelopmentTeam,
          extensionBundleId,
          marketingVersion,
          currentProjectVersion
        );
      }
      setMainTargetSourceExclusions();
      console.log('[LiveActivityExtension] Updated existing extension target build settings');
      return cfg;
    }

    const target = project.addTarget(
      EXTENSION_TARGET_NAME,
      'app_extension',
      EXTENSION_TARGET_NAME,
      extensionBundleId,
    );

    if (!target || !target.uuid) {
      console.warn('[LiveActivityExtension] Failed to create extension target');
      return cfg;
    }

    console.log('[LiveActivityExtension] Created target:', target.uuid || target);
    const targetUuid = target.uuid || target;

    ensureGroupRecursively(project, EXTENSION_TARGET_NAME);

    // Ensure the extension target has build phases
    if (typeof project.addBuildPhase === 'function') {
        project.addBuildPhase([], 'PBXSourcesBuildPhase', 'Sources', targetUuid);
        project.addBuildPhase([], 'PBXFrameworksBuildPhase', 'Frameworks', targetUuid);
        project.addBuildPhase([], 'PBXResourcesBuildPhase', 'Resources', targetUuid);
    }

    // Helper to add file and link to target
    const linkSourceFile = (filepath, targetUuid) => {
      const fileRefs = project.pbxFileReferenceSection();
      const filename = path.basename(filepath);
      const existingFileKey = Object.keys(fileRefs).find(key => {
        const ref = fileRefs[key];
        return typeof ref === 'object' && (ref.path === `"${filepath}"` || ref.path === filepath || ref.name === `"${filename}"` || ref.name === filename);
      });

      if (existingFileKey) {
        const pbxFile = {
            fileRef: existingFileKey,
            basename: filename
        };
        project.addToPbxBuildFileSection(pbxFile);
        if (typeof project.addToPbxSourcesBuildPhase === 'function') {
            project.addToPbxSourcesBuildPhase(pbxFile, targetUuid);
        }
      } else {
        addBuildSourceFileToGroup({
          filepath,
          groupName: EXTENSION_TARGET_NAME,
          project,
          targetUuid,
          verbose: true,
        });
      }
    };

    linkSourceFile(`${EXTENSION_TARGET_NAME}/DeliveryActivityAttributes.swift`, targetUuid);
    linkSourceFile(`${EXTENSION_TARGET_NAME}/DeliveryLiveActivityWidget.swift`, targetUuid);

    setTargetBuildSettings(
      target.uuid,
      resolvedDevelopmentTeam,
      extensionBundleId,
      marketingVersion,
      currentProjectVersion
    );

    setMainTargetSourceExclusions();

    const mainTargetUuid = Object.keys(project.pbxNativeTargetSection()).find((uuid) => {
      const t = project.pbxNativeTargetSection()[uuid];
      return typeof t === 'object' && t.productType === '"com.apple.product-type.application"';
    });

    if (mainTargetUuid) {
      // 1. Add target dependency
      project.addTargetDependency(mainTargetUuid, [target.uuid]);

      // 2. Embed the extension (PlugIns)
      const pbxCopyFilesBuildPhase = project.hash.project.objects['PBXCopyFilesBuildPhase'] || {};
      let embedPhaseUuid = Object.keys(pbxCopyFilesBuildPhase).find(key => {
          const phase = pbxCopyFilesBuildPhase[key];
          return typeof phase === 'object' && (phase.name === '"Embed App Extensions"' || phase.dstSubfolderSpec === '13');
      });

      if (!embedPhaseUuid) {
        const newPhase = project.addBuildPhase([], 'PBXCopyFilesBuildPhase', 'Embed App Extensions', mainTargetUuid, 'app_extension');
        if (newPhase && newPhase.buildPhase) {
          newPhase.buildPhase.dstSubfolderSpec = 13;
        }
        embedPhaseUuid = newPhase.uuid;
      }

      const productFileRef = target.pbxNativeTarget.productReference;
      const productFile = project.pbxFileReferenceSection()[productFileRef];
      if (productFile && embedPhaseUuid) {
        const file = {
            fileRef: productFileRef,
            basename: productFile.path,
            settings: { ATTRIBUTES: ['RemoveHeadersOnCopy'] }
        };
        const buildFile = project.addToPbxBuildFileSection(file);
        if (buildFile && buildFile.uuid) {
          if (!project.hash.project.objects['PBXCopyFilesBuildPhase'][embedPhaseUuid].files) {
            project.hash.project.objects['PBXCopyFilesBuildPhase'][embedPhaseUuid].files = [];
          }
          project.hash.project.objects['PBXCopyFilesBuildPhase'][embedPhaseUuid].files.push({
            value: buildFile.uuid,
            comment: productFile.path.replace(/"/g, '')
          });
        }
      }
    }

    if (resolvedDevelopmentTeam) {
      console.log('[LiveActivityExtension] Applied extension signing team', { developmentTeam: resolvedDevelopmentTeam });
    }

    // Link frameworks necessary for Live Activities
    const frameworks = ['ActivityKit.framework', 'WidgetKit.framework', 'SwiftUI.framework'];
    for (const framework of frameworks) {
      project.addFramework(framework, { target: target.uuid });
    }

    console.log('[LiveActivityExtension] Created extension target, added dependency, and linked Swift sources/frameworks');

    return cfg;
  });
}

// ─── Custom native module (main app target) ──────────────────────────────────

function withDeliveryLiveActivitiesModuleFiles(config) {
  return withDangerousMod(config, [
    'ios',
    async (cfg) => {
      const appName = cfg.modRequest.projectName;
      const appDir = path.join(cfg.modRequest.platformProjectRoot, appName);

      // DeliveryActivityAttributes is embedded inside DeliveryLiveActivities.swift
      // (no separate file) to avoid a duplicate-filename conflict with the extension target.

      // Always overwrite so changes to the module are picked up on every prebuild.
      writeFile(
        path.join(appDir, 'DeliveryLiveActivities.swift'),
        DELIVERY_LIVE_ACTIVITIES_SWIFT,
      );

      writeFile(
        path.join(appDir, 'DeliveryLiveActivities.m'),
        DELIVERY_LIVE_ACTIVITIES_OBJC,
      );

      console.log('[LiveActivityExtension] Wrote DeliveryLiveActivities native module to main app target dir:', appDir);
      return cfg;
    },
  ]);
}

function withDeliveryLiveActivitiesModuleTarget(config) {
  return withXcodeProject(config, (cfg) => {
    const project = cfg.modResults;
    const appName = cfg.modRequest.projectName;

    // Find the main application target UUID
    const targets = project.pbxNativeTargetSection();
    const mainTargetEntry = Object.entries(targets).find(([, target]) => {
      return (
        typeof target === 'object' &&
        target.productType === '"com.apple.product-type.application"'
      );
    });

    if (!mainTargetEntry) {
      console.warn('[LiveActivityExtension] Could not locate main app target – skipping native module Xcode registration');
      return cfg;
    }

    const [mainTargetUuid] = mainTargetEntry;

    // Guard against duplicate file references on incremental prebuilds
    const existingRefs = Object.values(project.pbxFileReferenceSection());
    const alreadyAdded = existingRefs.some(
      (ref) =>
        typeof ref === 'object' &&
        (ref.path === '"DeliveryLiveActivities.swift"' || ref.name === '"DeliveryLiveActivities.swift"'),
    );

    if (alreadyAdded) {
      console.log('[LiveActivityExtension] Native module already registered in Xcode project, skipping');
      return cfg;
    }

    ensureGroupRecursively(project, appName);

    const nativeModuleFiles = [
      `${appName}/DeliveryLiveActivities.swift`,
      `${appName}/DeliveryLiveActivities.m`,
    ];

    for (const file of nativeModuleFiles) {
      addBuildSourceFileToGroup({
        filepath: file,
        groupName: appName,
        project,
        targetUuid: mainTargetUuid,
        verbose: true,
      });
    }

    console.log('[LiveActivityExtension] Registered DeliveryLiveActivities native module in main app Xcode target');
    return cfg;
  });
}

// ─── Podfile fix: disable code signing for resource bundle targets (Xcode 14+) ─

function withResourceBundleSigningFix(config) {
  return withDangerousMod(config, [
    'ios',
    async (cfg) => {
      const podfilePath = path.join(cfg.modRequest.platformProjectRoot, 'Podfile');
      if (!fs.existsSync(podfilePath)) {
        console.warn('[ResourceBundleSigningFix] Podfile not found, skipping');
        return cfg;
      }

      let podfile = fs.readFileSync(podfilePath, 'utf8');

      const fixSnippet = `
  # Fix Xcode 14+ resource bundle code signing
  installer.pods_project.targets.each do |target|
    if target.respond_to?(:product_type) && target.product_type == "com.apple.product-type.bundle"
      target.build_configurations.each do |config|
        config.build_settings['CODE_SIGNING_ALLOWED'] = 'NO'
      end
    end
  end`;

      if (podfile.includes('CODE_SIGNING_ALLOWED')) {
        console.log('[ResourceBundleSigningFix] Podfile already patched, skipping');
        return cfg;
      }

      // Insert our snippet into an existing post_install block if present,
      // otherwise add a new post_install block.
      if (podfile.includes('post_install do |installer|')) {
        podfile = podfile.replace(
          'post_install do |installer|',
          `post_install do |installer|\n${fixSnippet}`,
        );
      } else {
        podfile += `\npost_install do |installer|\n${fixSnippet}\nend\n`;
      }

      fs.writeFileSync(podfilePath, podfile, 'utf8');
      console.log('[ResourceBundleSigningFix] Patched Podfile for Xcode 14+ resource bundle signing');
      return cfg;
    },
  ]);
}

// ─── Compose ─────────────────────────────────────────────────────────────────

function withLiveActivityExtension(config) {
  config = withLiveActivityExtensionFiles(config);
  config = withLiveActivityExtensionTarget(config);
  config = withDeliveryLiveActivitiesModuleFiles(config);
  config = withDeliveryLiveActivitiesModuleTarget(config);
  config = withResourceBundleSigningFix(config);
  return config;
}

module.exports = withLiveActivityExtension;
