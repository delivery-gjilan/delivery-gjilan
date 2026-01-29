"use client";

import { Settings as SettingsIcon, Save } from "lucide-react";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";

export default function SettingsPage() {
  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-3">
          <SettingsIcon size={28} />
          Settings
        </h1>
        <p className="text-neutral-400 mt-1">Manage your account and preferences</p>
      </div>

      {/* Business Settings */}
      <div className="bg-[#161616] border border-[#262626] rounded-lg p-6">
        <h3 className="text-white font-semibold mb-4">Business Settings</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-neutral-300 mb-2">
              Average Preparation Time (minutes)
            </label>
            <Input type="number" placeholder="15" />
            <p className="text-xs text-neutral-500 mt-1">
              This affects customer ETA calculations
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-300 mb-2">
              Business Name
            </label>
            <Input placeholder="Your Business Name" />
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-300 mb-2">
              Contact Email
            </label>
            <Input type="email" placeholder="contact@business.com" />
          </div>
        </div>
      </div>

      {/* Notifications */}
      <div className="bg-[#161616] border border-[#262626] rounded-lg p-6">
        <h3 className="text-white font-semibold mb-4">Notification Preferences</h3>
        <div className="space-y-3">
          <label className="flex items-center gap-3">
            <input type="checkbox" className="w-4 h-4" defaultChecked />
            <span className="text-neutral-300">New order notifications</span>
          </label>
          <label className="flex items-center gap-3">
            <input type="checkbox" className="w-4 h-4" defaultChecked />
            <span className="text-neutral-300">Order status updates</span>
          </label>
          <label className="flex items-center gap-3">
            <input type="checkbox" className="w-4 h-4" />
            <span className="text-neutral-300">Weekly reports</span>
          </label>
        </div>
      </div>

      {/* Save Button */}
      <Button>
        <Save size={18} className="mr-2" />
        Save Changes
      </Button>
    </div>
  );
}
