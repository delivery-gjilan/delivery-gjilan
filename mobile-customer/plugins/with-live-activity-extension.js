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
    var phaseInitialMinutes: Int
    var phaseStartedAt: Int64
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
    var phaseInitialMinutes: Int
    var phaseStartedAt: Int64
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
          phaseInitialMinutes: (stateDict["phaseInitialMinutes"] as? NSNumber)?.intValue ?? ((stateDict["estimatedMinutes"] as? NSNumber)?.intValue ?? 0),
          phaseStartedAt: (stateDict["phaseStartedAt"] as? NSNumber)?.int64Value ?? Int64(Date().timeIntervalSince1970 * 1000),
            status: stateDict["status"] as? String ?? "",
            orderId: stateDict["orderId"] as? String ?? "",
            lastUpdated: (stateDict["lastUpdated"] as? NSNumber)?.int64Value ?? Int64(Date().timeIntervalSince1970 * 1000)
        )

        if !contentState.orderId.isEmpty,
           let existing = Activity<DeliveryActivityAttributes>.activities.first(where: { $0.content.state.orderId == contentState.orderId }) {
          resolve(existing.id)
          return
        }

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
          phaseInitialMinutes: (stateDict["phaseInitialMinutes"] as? NSNumber)?.intValue ?? ((stateDict["estimatedMinutes"] as? NSNumber)?.intValue ?? 0),
          phaseStartedAt: (stateDict["phaseStartedAt"] as? NSNumber)?.int64Value ?? Int64(Date().timeIntervalSince1970 * 1000),
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

      // MARK: - endAllActivities
      @objc
      func endAllActivities(_ resolver: @escaping RCTPromiseResolveBlock,
                  rejecter reject: @escaping RCTPromiseRejectBlock) {
        guard #available(iOS 16.2, *) else {
          resolver(nil)
          return
        }

        Task {
          for activity in Activity<DeliveryActivityAttributes>.activities {
            await activity.end(nil, dismissalPolicy: .immediate)
          }
          resolver(nil)
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
        func findActivityByOrderId(_ orderId: String,
                       resolver resolve: @escaping RCTPromiseResolveBlock,
                       rejecter reject: @escaping RCTPromiseRejectBlock) {
          guard #available(iOS 16.2, *) else {
            resolve(nil)
            return
          }
          guard !orderId.isEmpty else {
            resolve(nil)
            return
          }

          if let activity = Activity<DeliveryActivityAttributes>.activities.first(where: { $0.content.state.orderId == orderId }) {
            resolve(activity.id)
            return
          }

          resolve(nil)
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

RCT_EXTERN_METHOD(endAllActivities:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(getPushToken:(NSString *)activityId
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(findActivityByOrderId:(NSString *)orderId
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
  private func statusKey(_ rawStatus: String) -> String {
    return rawStatus
      .trimmingCharacters(in: .whitespacesAndNewlines)
      .lowercased()
      .replacingOccurrences(of: " ", with: "_")
  }

  private func normalizedStatus(_ status: String) -> String {
    return status.replacingOccurrences(of: "_", with: " ").capitalized
  }

  private func statusIconName(_ status: String) -> String {
    switch statusKey(status) {
    case "pending":
      return "clock.badge.questionmark"
    case "accepted":
      return "checkmark.seal"
    case "preparing":
      return "fork.knife"
    case "ready", "ready_for_pickup":
      return "bag.badge.checkmark"
    case "picked_up", "on_the_way", "out_for_delivery":
      return "scooter"
    case "delivered":
      return "checkmark.circle.fill"
    case "cancelled", "canceled":
      return "xmark.circle.fill"
    default:
      return "shippingbox.fill"
    }
  }

  private func statusTint(_ status: String) -> Color {
    switch statusKey(status) {
    case "pending":
      return Color(red: 0.918, green: 0.620, blue: 0.043) // #EAB308 yellow
    case "preparing":
      return Color(red: 0.976, green: 0.451, blue: 0.086) // #F97316 orange
    case "accepted", "ready", "ready_for_pickup":
      return Color(red: 0.231, green: 0.510, blue: 0.965) // #3B82F6 blue
    case "picked_up", "on_the_way", "out_for_delivery":
      return Color(red: 0.133, green: 0.773, blue: 0.369) // #22C55E green
    case "delivered":
      return Color(red: 0.133, green: 0.773, blue: 0.369) // #22C55E green
    case "cancelled", "canceled":
      return .red
    default:
      return .accentColor
    }
  }

  private func liveProgress(_ context: ActivityViewContext<DeliveryActivityAttributes>) -> Double {
    let total = max(1, context.state.phaseInitialMinutes)
    let startedAtSeconds = Double(context.state.phaseStartedAt) / 1000
    let elapsed = max(0, Date().timeIntervalSince1970 - startedAtSeconds)
    let elapsedMinutes = elapsed / 60
    let inferredRemaining = max(0, Double(total) - elapsedMinutes)
    let currentRemaining = min(Double(total), max(0, min(Double(context.state.estimatedMinutes), inferredRemaining)))
    return max(0, min(1, (Double(total) - currentRemaining) / Double(total)))
  }

  private func resolvedProgress(_ context: ActivityViewContext<DeliveryActivityAttributes>) -> Double {
    switch statusKey(context.state.status) {
    case "pending":
      return 0
    case "delivered":
      return 1
    case "cancelled", "canceled":
      return 0
    default:
      return liveProgress(context)
    }
  }

  private func shouldShowProgress(_ context: ActivityViewContext<DeliveryActivityAttributes>) -> Bool {
    switch statusKey(context.state.status) {
    case "preparing", "out_for_delivery", "on_the_way", "picked_up", "delivered":
      return true
    default:
      return false
    }
  }

  private func phaseStartDate(_ context: ActivityViewContext<DeliveryActivityAttributes>) -> Date {
    return Date(timeIntervalSince1970: Double(context.state.phaseStartedAt) / 1000)
  }

  private func waitingDots(_ context: ActivityViewContext<DeliveryActivityAttributes>) -> String {
    let elapsed = max(0, Int(Date().timeIntervalSince(phaseStartDate(context))))
    switch elapsed % 4 {
    case 0: return "."
    case 1: return ".."
    case 2: return "..."
    default: return "...."
    }
  }

  private func etaText(_ context: ActivityViewContext<DeliveryActivityAttributes>) -> String {
    let total = max(1, context.state.phaseInitialMinutes)
    let startedAtSeconds = Double(context.state.phaseStartedAt) / 1000
    let elapsed = max(0, Date().timeIntervalSince1970 - startedAtSeconds)
    let elapsedMinutes = elapsed / 60
    let inferredRemaining = max(0, Double(total) - elapsedMinutes)
    let currentRemaining = Int(max(0, min(Double(context.state.estimatedMinutes), inferredRemaining)).rounded(.up))
    return "~\\(currentRemaining)m"
  }

  private func resolvedEtaText(_ context: ActivityViewContext<DeliveryActivityAttributes>) -> String {
    switch statusKey(context.state.status) {
    case "delivered":
      return "Done"
    case "cancelled", "canceled":
      return "Canceled"
    case "pending":
      return "Waiting"
    case "accepted":
      return "Accepted"
    case "ready", "ready_for_pickup":
      return "Pickup"
    default:
      return etaText(context)
    }
  }

  private func etaTint(_ context: ActivityViewContext<DeliveryActivityAttributes>) -> Color {
    switch statusKey(context.state.status) {
    case "out_for_delivery", "on_the_way", "picked_up":
      return .cyan
    default:
      return .primary
    }
  }

  private func pendingMessage() -> String {
    return "Waiting for restaurant to approve order"
  }

    var body: some WidgetConfiguration {
        ActivityConfiguration(for: DeliveryActivityAttributes.self) { context in
      VStack(alignment: .leading, spacing: 10) {
        HStack {
          Text(context.attributes.businessName)
            .font(.headline)
            .lineLimit(1)
          Spacer()
          if statusKey(context.state.status) == "pending" {
            Text(phaseStartDate(context), style: .timer)
              .font(.headline.weight(.semibold))
              .monospacedDigit()
          } else {
            Text(resolvedEtaText(context))
              .font(.headline.weight(.semibold))
              .foregroundStyle(etaTint(context))
          }
                }
        HStack(spacing: 6) {
          Image(systemName: statusIconName(context.state.status))
            .font(.caption)
            .foregroundStyle(statusTint(context.state.status))
          Text(normalizedStatus(context.state.status))
                    .font(.caption)
                    .foregroundStyle(.secondary)
        }

        if shouldShowProgress(context) {
          ProgressView(value: resolvedProgress(context))
            .progressViewStyle(.linear)
            .tint(statusTint(context.state.status))
        } else {
          Text(statusKey(context.state.status) == "pending" ? pendingMessage() : "Waiting\(waitingDots(context))")
            .font(.caption2)
            .foregroundStyle(.secondary)
            .lineLimit(2)
        }

        HStack {
          Text("Order #\\(context.attributes.orderDisplayId)")
            .font(.caption2)
            .foregroundStyle(.secondary)
          Spacer()
          Text(context.state.driverName)
            .font(.caption2)
            .foregroundStyle(.secondary)
            .lineLimit(1)
        }
            }
            .padding(12)
          .widgetURL(URL(string: "zipp://order/\\(context.state.orderId)"))
            .activityBackgroundTint(Color(.systemBackground))
            .activitySystemActionForegroundColor(Color.accentColor)
    } dynamicIsland: { context in
      DynamicIsland {
        DynamicIslandExpandedRegion(.leading) {
          if statusKey(context.state.status) == "pending" {
            EmptyView()
          } else {
            HStack(spacing: 4) {
              Image(systemName: statusIconName(context.state.status))
                .font(.caption2.weight(.semibold))
                .foregroundStyle(statusTint(context.state.status))
              Text(normalizedStatus(context.state.status))
                .font(.caption.weight(.semibold))
                .lineLimit(1)
            }
          }
        }
        DynamicIslandExpandedRegion(.trailing) {
          if statusKey(context.state.status) == "pending" {
            EmptyView()
          } else {
            Text(resolvedEtaText(context))
              .font(.caption.weight(.bold))
              .foregroundStyle(etaTint(context))
          }
        }
        DynamicIslandExpandedRegion(.bottom) {
          if statusKey(context.state.status) == "pending" {
            EmptyView()
          } else if shouldShowProgress(context) {
            ProgressView(value: resolvedProgress(context))
              .progressViewStyle(.linear)
              .tint(statusTint(context.state.status))
          } else {
            Text("Waiting\(waitingDots(context))")
              .font(.caption2)
              .foregroundStyle(.secondary)
          }
        }
      } compactLeading: {
        Image(systemName: statusKey(context.state.status) == "pending" ? "clock.badge.questionmark" : statusIconName(context.state.status))
          .font(.system(size: 11, weight: .semibold))
          .foregroundStyle(statusKey(context.state.status) == "pending" ? .orange : statusTint(context.state.status))
      } compactTrailing: {
        if statusKey(context.state.status) == "pending" {
          EmptyView()
        } else {
          Text(resolvedEtaText(context))
            .font(.system(size: 11, weight: .semibold))
            .foregroundStyle(etaTint(context))
        }
      } minimal: {
        if statusKey(context.state.status) == "pending" {
          Image(systemName: "clock.badge.questionmark")
            .font(.system(size: 11, weight: .semibold))
            .foregroundStyle(.orange)
        } else {
          ZStack {
            Circle()
              .stroke(Color.secondary.opacity(0.35), lineWidth: 2)
            Circle()
              .trim(from: 0, to: resolvedProgress(context))
              .stroke(statusTint(context.state.status), style: StrokeStyle(lineWidth: 2, lineCap: .round))
              .rotationEffect(.degrees(-90))
            Image(systemName: statusIconName(context.state.status))
              .font(.system(size: 10, weight: .semibold))
              .foregroundStyle(statusTint(context.state.status))
          }
          .frame(width: 20, height: 20)
        }
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
        // App extensions must produce an executable binary inside the .appex bundle.
        buildConfig.buildSettings.MACH_O_TYPE = 'mh_execute';
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

    const appBundleId = cfg.ios?.bundleIdentifier || 'com.artshabani.mobilecustomer';
    const extensionBundleId = `${appBundleId}.${EXTENSION_TARGET_NAME}`;

    const ensureTargetBuildPhases = (targetUuid) => {
      if (!targetUuid || typeof project.addBuildPhase !== 'function') return;
      const objects = project.hash.project.objects || {};
      const sources = objects.PBXSourcesBuildPhase || {};
      const frameworks = objects.PBXFrameworksBuildPhase || {};
      const resources = objects.PBXResourcesBuildPhase || {};

      const hasSources = Object.values(sources).some(
        (phase) => typeof phase === 'object' && phase && phase.target === targetUuid,
      );
      const hasFrameworks = Object.values(frameworks).some(
        (phase) => typeof phase === 'object' && phase && phase.target === targetUuid,
      );
      const hasResources = Object.values(resources).some(
        (phase) => typeof phase === 'object' && phase && phase.target === targetUuid,
      );

      if (!hasSources) {
        project.addBuildPhase([], 'PBXSourcesBuildPhase', 'Sources', targetUuid);
      }
      if (!hasFrameworks) {
        project.addBuildPhase([], 'PBXFrameworksBuildPhase', 'Frameworks', targetUuid);
      }
      if (!hasResources) {
        project.addBuildPhase([], 'PBXResourcesBuildPhase', 'Resources', targetUuid);
      }
    };

    const linkSourceFile = (filepath, targetUuid) => {
      const fileRefs = project.pbxFileReferenceSection();
      const filename = path.basename(filepath);
      const existingFileKey = Object.keys(fileRefs).find((key) => {
        const ref = fileRefs[key];
        return (
          typeof ref === 'object' &&
          (ref.path === `"${filepath}"` ||
            ref.path === filepath ||
            ref.name === `"${filename}"` ||
            ref.name === filename)
        );
      });

      if (existingFileKey) {
        const pbxFile = {
          fileRef: existingFileKey,
          basename: filename,
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

    const ensureDependencyAndEmbedding = (targetUuid, productFileRef) => {
      const mainTargetUuid = Object.keys(project.pbxNativeTargetSection()).find((uuid) => {
        const t = project.pbxNativeTargetSection()[uuid];
        return typeof t === 'object' && t.productType === '"com.apple.product-type.application"';
      });

      if (!mainTargetUuid) {
        return;
      }

      project.addTargetDependency(mainTargetUuid, [targetUuid]);

      const pbxCopyFilesBuildPhase = project.hash.project.objects.PBXCopyFilesBuildPhase || {};
      let embedPhaseUuid = Object.keys(pbxCopyFilesBuildPhase).find((key) => {
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

      const productFile = productFileRef ? project.pbxFileReferenceSection()[productFileRef] : null;
      if (!productFile || !embedPhaseUuid) {
        return;
      }

      const phase = project.hash.project.objects.PBXCopyFilesBuildPhase[embedPhaseUuid];
      if (!phase.files) {
        phase.files = [];
      }

      const alreadyEmbedded = phase.files.some(
        (entry) => entry && typeof entry === 'object' && entry.comment === String(productFile.path || '').replace(/"/g, ''),
      );
      if (alreadyEmbedded) {
        return;
      }

      const file = {
        fileRef: productFileRef,
        basename: productFile.path,
        settings: { ATTRIBUTES: ['RemoveHeadersOnCopy'] },
      };
      const buildFile = project.addToPbxBuildFileSection(file);
      if (buildFile && buildFile.uuid) {
        phase.files.push({
          value: buildFile.uuid,
          comment: String(productFile.path || '').replace(/"/g, ''),
        });
      }
    };

    const ensureExtensionTargetWiring = (targetUuid, productFileRef) => {
      ensureGroupRecursively(project, EXTENSION_TARGET_NAME);
      ensureTargetBuildPhases(targetUuid);
      linkSourceFile(`${EXTENSION_TARGET_NAME}/DeliveryActivityAttributes.swift`, targetUuid);
      linkSourceFile(`${EXTENSION_TARGET_NAME}/DeliveryLiveActivityWidget.swift`, targetUuid);
      ensureDependencyAndEmbedding(targetUuid, productFileRef);

      const frameworks = ['ActivityKit.framework', 'WidgetKit.framework', 'SwiftUI.framework'];
      for (const framework of frameworks) {
        project.addFramework(framework, { target: targetUuid });
      }
    };

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
        const nativeTarget = project.pbxNativeTargetSection()[existingTarget.uuid];
        const productFileRef = existingTarget?.pbxNativeTarget?.productReference || nativeTarget?.productReference;
        ensureExtensionTargetWiring(existingTarget.uuid, productFileRef);
      }
      setMainTargetSourceExclusions();
      console.log('[LiveActivityExtension] Updated existing extension target build settings and wiring');
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

    ensureExtensionTargetWiring(targetUuid, target?.pbxNativeTarget?.productReference);

    setTargetBuildSettings(
      target.uuid,
      resolvedDevelopmentTeam,
      extensionBundleId,
      marketingVersion,
      currentProjectVersion
    );

    setMainTargetSourceExclusions();

    if (resolvedDevelopmentTeam) {
      console.log('[LiveActivityExtension] Applied extension signing team', { developmentTeam: resolvedDevelopmentTeam });
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
