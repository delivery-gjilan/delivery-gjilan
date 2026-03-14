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
    var body: some WidgetConfiguration {
        ActivityConfiguration(for: DeliveryActivityAttributes.self) { context in
            VStack(alignment: .leading, spacing: 8) {
                Text(context.attributes.businessName)
                    .font(.headline)
                Text("Order #\\(context.attributes.orderDisplayId)")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
                HStack {
                    Text(context.state.status.replacingOccurrences(of: "_", with: " ").capitalized)
                        .font(.body)
                    Spacer()
                    Text("~\\(context.state.estimatedMinutes) min")
                        .font(.body.weight(.semibold))
                }
                Text(context.state.driverName)
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }
            .padding(12)
            .activityBackgroundTint(Color(.systemBackground))
            .activitySystemActionForegroundColor(Color.accentColor)
        } dynamicIsland: { context in
            DynamicIsland {
                DynamicIslandExpandedRegion(.leading) {
                    Text("\\(context.state.estimatedMinutes)m")
                        .font(.headline)
                }
                DynamicIslandExpandedRegion(.trailing) {
                    Text(context.state.status.replacingOccurrences(of: "_", with: " ").capitalized)
                        .font(.caption)
                }
                DynamicIslandExpandedRegion(.bottom) {
                    HStack {
                        Text(context.attributes.businessName)
                        Spacer()
                        Text(context.state.driverName)
                    }
                    .font(.caption)
                }
            } compactLeading: {
                Text("\\(context.state.estimatedMinutes)m")
                    .font(.caption2)
            } compactTrailing: {
                Image(systemName: "bicycle")
            } minimal: {
                Image(systemName: "bicycle")
            }
            .keylineTint(Color.accentColor)
        }
    }
}
`;

const EXTENSION_INFO_PLIST = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>NSExtension</key>
  <dict>
    <key>NSExtensionPointIdentifier</key>
    <string>com.apple.widgetkit-extension</string>
    <key>NSExtensionPrincipalClass</key>
    <string>$(PRODUCT_MODULE_NAME).DeliveryLiveActivityBundle</string>
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

      ensureFile(
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
            '$(inherited)',
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

    const setTargetSigning = (targetUuid, developmentTeam) => {
      if (!targetUuid || !developmentTeam) {
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

        buildConfig.buildSettings.DEVELOPMENT_TEAM = developmentTeam;
        buildConfig.buildSettings.CODE_SIGN_STYLE = 'Automatic';
      }
    };

    const resolvedDevelopmentTeam =
      cfg.ios?.appleTeamId ||
      process.env.EXPO_APPLE_TEAM_ID ||
      process.env.APPLE_TEAM_ID ||
      getMainAppDevelopmentTeam();

    if (project.pbxTargetByName(EXTENSION_TARGET_NAME)) {
      const existingTarget = project.pbxTargetByName(EXTENSION_TARGET_NAME);
      if (existingTarget?.uuid && resolvedDevelopmentTeam) {
        setTargetSigning(existingTarget.uuid, resolvedDevelopmentTeam);
      }
      setMainTargetSourceExclusions();
      console.log('[LiveActivityExtension] Extension target already exists, skipping target creation');
      return cfg;
    }

    const appBundleId = cfg.ios?.bundleIdentifier || 'com.anonymous.mobilecustomer';
    const extensionBundleId = `${appBundleId}.${EXTENSION_TARGET_NAME}`;

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

    ensureGroupRecursively(project, EXTENSION_TARGET_NAME);

    addBuildSourceFileToGroup({
      filepath: `${EXTENSION_TARGET_NAME}/DeliveryActivityAttributes.swift`,
      groupName: EXTENSION_TARGET_NAME,
      project,
      targetUuid: target.uuid,
      verbose: true,
    });

    addBuildSourceFileToGroup({
      filepath: `${EXTENSION_TARGET_NAME}/DeliveryLiveActivityWidget.swift`,
      groupName: EXTENSION_TARGET_NAME,
      project,
      targetUuid: target.uuid,
      verbose: true,
    });

    if (resolvedDevelopmentTeam) {
      setTargetSigning(target.uuid, resolvedDevelopmentTeam);
      console.log('[LiveActivityExtension] Applied extension signing team', { developmentTeam: resolvedDevelopmentTeam });
    } else {
      console.warn('[LiveActivityExtension] Could not resolve development team for extension target');
    }

    setMainTargetSourceExclusions();

    console.log('[LiveActivityExtension] Created extension target and linked Swift sources');

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
