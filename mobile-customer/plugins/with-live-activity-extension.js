const { withDangerousMod, withXcodeProject } = require('expo/config-plugins');
const {
  addBuildSourceFileToGroup,
  ensureGroupRecursively,
} = require('@expo/config-plugins/build/ios/utils/Xcodeproj');
const fs = require('fs');
const path = require('path');

const EXTENSION_TARGET_NAME = 'DeliveryLiveActivityExtension';

const DELIVERY_ACTIVITY_ATTRIBUTES_SWIFT = `import ActivityKit
import Foundation

struct DeliveryActivityAttributes: ActivityAttributes {
    public struct ContentState: Codable, Hashable {
        var driverName: String
        var estimatedMinutes: Int
        var status: String
        var orderId: String
        var lastUpdated: Date
    }

    var orderDisplayId: String
    var businessName: String
}
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

function ensureFile(filePath, content) {
  if (fs.existsSync(filePath)) {
    return;
  }

  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content, 'utf8');
}

function withLiveActivityExtensionFiles(config) {
  return withDangerousMod(config, [
    'ios',
    async (cfg) => {
      const extensionDir = path.join(cfg.modRequest.platformProjectRoot, EXTENSION_TARGET_NAME);

      ensureFile(
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

    if (project.pbxTargetByName(EXTENSION_TARGET_NAME)) {
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
      filepath: 'DeliveryActivityAttributes.swift',
      groupName: EXTENSION_TARGET_NAME,
      project,
      targetUuid: target.uuid,
      verbose: true,
    });

    addBuildSourceFileToGroup({
      filepath: 'DeliveryLiveActivityWidget.swift',
      groupName: EXTENSION_TARGET_NAME,
      project,
      targetUuid: target.uuid,
      verbose: true,
    });

    console.log('[LiveActivityExtension] Created extension target and linked Swift sources');

    return cfg;
  });
}

function withLiveActivityExtension(config) {
  config = withLiveActivityExtensionFiles(config);
  config = withLiveActivityExtensionTarget(config);
  return config;
}

module.exports = withLiveActivityExtension;
