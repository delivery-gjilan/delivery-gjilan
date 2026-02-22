"use client";

import { useState, useMemo } from "react";
import { useQuery, useMutation, useLazyQuery } from "@apollo/client/react";
import {
  GET_NOTIFICATION_CAMPAIGNS,
  CREATE_CAMPAIGN,
  SEND_CAMPAIGN,
  SEND_PUSH_NOTIFICATION,
  PREVIEW_CAMPAIGN_AUDIENCE,
  DELETE_CAMPAIGN,
} from "@/graphql/operations/notifications";
import { USERS_QUERY } from "@/graphql/operations/users/queries";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { Table, Th, Td } from "@/components/ui/Table";
import Modal from "@/components/ui/Modal";
import QueryBuilder, {
  type RuleGroup,
  createDefaultGroup,
} from "@/components/notifications/QueryBuilder";
import {
  Bell,
  Send,
  Plus,
  Eye,
  Trash2,
  Users,
  Copy,
  Megaphone,
  Search,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Clock,
  X,
} from "lucide-react";

// ── Types ────────────────────────────────────────────────────────

interface Campaign {
  id: string;
  title: string;
  body: string;
  data: Record<string, unknown> | null;
  query: Record<string, unknown> | null;
  targetCount: number;
  sentCount: number;
  failedCount: number;
  status: string;
  sentBy: string | null;
  createdAt: string;
  sentAt: string | null;
}

interface UserItem {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
}

type Tab = "campaigns" | "direct";
type StatusFilter = "ALL" | "DRAFT" | "SENDING" | "SENT" | "FAILED";

// ── Status badge ─────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { bg: string; text: string; icon: typeof Clock }> = {
    DRAFT: { bg: "bg-neutral-800", text: "text-neutral-300", icon: Clock },
    SENDING: { bg: "bg-yellow-950", text: "text-yellow-400", icon: AlertCircle },
    SENT: { bg: "bg-green-950", text: "text-green-400", icon: CheckCircle2 },
    FAILED: { bg: "bg-red-950", text: "text-red-400", icon: XCircle },
  };

  const c = config[status] || config.DRAFT;
  const Icon = c.icon;

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${c.bg} ${c.text}`}>
      <Icon size={12} />
      {status}
    </span>
  );
}

// ── Stats Card ───────────────────────────────────────────────────

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="bg-[#111] border border-[#262626] rounded-lg px-4 py-3">
      <p className="text-xs text-neutral-500 uppercase tracking-wider">{label}</p>
      <p className={`text-2xl font-bold mt-1 ${color}`}>{value}</p>
    </div>
  );
}

// ── Notification Preview Card ────────────────────────────────────

function NotificationPreview({ title, body }: { title: string; body: string }) {
  if (!title && !body) return null;

  return (
    <div className="bg-[#1a1a1a] border border-[#333] rounded-xl p-3">
      <p className="text-[10px] text-neutral-600 mb-2 uppercase tracking-wider">Push Preview</p>
      <div className="bg-[#222] rounded-xl p-3 flex items-start gap-3 shadow-lg">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-cyan-700 flex items-center justify-center flex-shrink-0 shadow-md">
          <Bell size={16} className="text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-white truncate">
              {title || "Notification Title"}
            </p>
            <span className="text-[10px] text-neutral-600 flex-shrink-0 ml-2">now</span>
          </div>
          <p className="text-xs text-neutral-400 mt-0.5 line-clamp-2">
            {body || "Notification body text..."}
          </p>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ────────────────────────────────────────────────────

export default function NotificationsPage() {
  const [activeTab, setActiveTab] = useState<Tab>("campaigns");

  // ── Campaign state ──────────────────────────────
  const [showCreate, setShowCreate] = useState(false);
  const [showDetail, setShowDetail] = useState<Campaign | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<Campaign | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [searchTerm, setSearchTerm] = useState("");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [queryGroup, setQueryGroup] = useState<RuleGroup>(createDefaultGroup());
  const [previewCount, setPreviewCount] = useState<number | null>(null);
  const [previewUsers, setPreviewUsers] = useState<UserItem[]>([]);
  const [sendingId, setSendingId] = useState<string | null>(null);

  // ── Direct send state ───────────────────────────
  const [directTitle, setDirectTitle] = useState("");
  const [directBody, setDirectBody] = useState("");
  const [directSearch, setDirectSearch] = useState("");
  const [selectedUsers, setSelectedUsers] = useState<UserItem[]>([]);
  const [directSent, setDirectSent] = useState<{ success: boolean; successCount: number; failureCount: number } | null>(null);

  // ── Queries & Mutations ─────────────────────────
  const { data, loading, refetch } = useQuery(GET_NOTIFICATION_CAMPAIGNS);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const campaigns: Campaign[] = (data as any)?.notificationCampaigns || [];

  const { data: usersData } = useQuery(USERS_QUERY);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const allUsers: UserItem[] = (usersData as any)?.users || [];

  const [createCampaign, { loading: creating }] = useMutation(CREATE_CAMPAIGN);
  const [sendCampaignMut, { loading: sending }] = useMutation(SEND_CAMPAIGN);
  const [deleteCampaignMut] = useMutation(DELETE_CAMPAIGN);
  const [sendPushMut, { loading: sendingDirect }] = useMutation(SEND_PUSH_NOTIFICATION);
  const [previewAudience, { loading: previewing }] = useLazyQuery(PREVIEW_CAMPAIGN_AUDIENCE);

  // ── Computed ────────────────────────────────────
  const stats = useMemo(() => ({
    total: campaigns.length,
    draft: campaigns.filter((c) => c.status === "DRAFT").length,
    sent: campaigns.filter((c) => c.status === "SENT").length,
    failed: campaigns.filter((c) => c.status === "FAILED").length,
  }), [campaigns]);

  const filteredCampaigns = useMemo(() => {
    let list = campaigns;
    if (statusFilter !== "ALL") {
      list = list.filter((c) => c.status === statusFilter);
    }
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      list = list.filter(
        (c) =>
          c.title.toLowerCase().includes(term) ||
          c.body.toLowerCase().includes(term),
      );
    }
    return [...list].reverse(); // newest first
  }, [campaigns, statusFilter, searchTerm]);

  const filteredUsers = useMemo(() => {
    if (!directSearch.trim()) return [];
    const term = directSearch.toLowerCase();
    return allUsers
      .filter(
        (u) =>
          !selectedUsers.some((s) => s.id === u.id) &&
          (u.email.toLowerCase().includes(term) ||
            u.firstName.toLowerCase().includes(term) ||
            u.lastName.toLowerCase().includes(term)),
      )
      .slice(0, 8);
  }, [allUsers, directSearch, selectedUsers]);

  // ── Handlers ───────────────────────────────────
  const handlePreview = async () => {
    try {
      const { data } = await previewAudience({ variables: { query: queryGroup } });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = (data as any)?.previewCampaignAudience;
      if (result) {
        setPreviewCount(result.count);
        setPreviewUsers(result.sampleUsers || []);
      }
    } catch (err) {
      console.error("Preview failed:", err);
    }
  };

  const resetCreateForm = () => {
    setTitle("");
    setBody("");
    setPreviewCount(null);
    setPreviewUsers([]);
    setQueryGroup(createDefaultGroup());
  };

  const handleCreate = async () => {
    if (!title.trim() || !body.trim()) return;
    try {
      await createCampaign({
        variables: { input: { title: title.trim(), body: body.trim(), query: queryGroup } },
      });
      setShowCreate(false);
      resetCreateForm();
      refetch();
    } catch (err) {
      console.error("Create failed:", err);
    }
  };

  const handleSend = async (id: string) => {
    setSendingId(id);
    try {
      await sendCampaignMut({ variables: { id } });
      refetch();
    } catch (err) {
      console.error("Send failed:", err);
    } finally {
      setSendingId(null);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteCampaignMut({ variables: { id } });
      setShowDeleteConfirm(null);
      refetch();
    } catch (err) {
      console.error("Delete failed:", err);
    }
  };

  const handleDuplicate = (campaign: Campaign) => {
    setTitle(campaign.title);
    setBody(campaign.body);
    if (campaign.query) {
      setQueryGroup(campaign.query as unknown as RuleGroup);
    }
    setPreviewCount(null);
    setPreviewUsers([]);
    setShowDetail(null);
    setShowCreate(true);
  };

  const handleDirectSend = async () => {
    if (!directTitle.trim() || !directBody.trim() || selectedUsers.length === 0) return;
    try {
      const { data } = await sendPushMut({
        variables: {
          input: {
            userIds: selectedUsers.map((u) => u.id),
            title: directTitle.trim(),
            body: directBody.trim(),
          },
        },
      });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = (data as any)?.sendPushNotification;
      if (result) {
        setDirectSent(result);
        setTimeout(() => setDirectSent(null), 5000);
      }
      setDirectTitle("");
      setDirectBody("");
      setSelectedUsers([]);
    } catch (err) {
      console.error("Direct send failed:", err);
    }
  };

  // ── Render ──────────────────────────────────────

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-cyan-500 to-cyan-700 flex items-center justify-center">
              <Bell size={18} className="text-white" />
            </div>
            Push Notifications
          </h1>
          <p className="text-neutral-500 text-sm mt-1">
            Create targeted campaigns or send direct notifications
          </p>
        </div>
        {activeTab === "campaigns" && (
          <Button onClick={() => { resetCreateForm(); setShowCreate(true); }}>
            <Plus size={16} className="mr-1.5" />
            New Campaign
          </Button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-[#0a0a0a] border border-[#262626] rounded-lg p-1 w-fit">
        <button
          onClick={() => setActiveTab("campaigns")}
          className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
            activeTab === "campaigns"
              ? "bg-[#1a1a1a] text-white border border-[#333]"
              : "text-neutral-500 hover:text-neutral-300"
          }`}
        >
          <Megaphone size={15} />
          Campaigns
          {stats.draft > 0 && (
            <span className="bg-cyan-900/60 text-cyan-300 text-[10px] font-bold px-1.5 py-0.5 rounded-full">
              {stats.draft}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab("direct")}
          className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
            activeTab === "direct"
              ? "bg-[#1a1a1a] text-white border border-[#333]"
              : "text-neutral-500 hover:text-neutral-300"
          }`}
        >
          <Send size={15} />
          Direct Send
        </button>
      </div>

      {/* ─── CAMPAIGNS TAB ───────────────────────────── */}
      {activeTab === "campaigns" && (
        <>
          {/* Stats row */}
          <div className="grid grid-cols-4 gap-3">
            <StatCard label="Total" value={stats.total} color="text-white" />
            <StatCard label="Drafts" value={stats.draft} color="text-neutral-400" />
            <StatCard label="Sent" value={stats.sent} color="text-green-400" />
            <StatCard label="Failed" value={stats.failed} color="text-red-400" />
          </div>

          {/* Filters */}
          <div className="flex items-center gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search campaigns..."
                className="w-full bg-[#0a0a0a] border border-[#262626] rounded-lg pl-9 pr-3 py-2 text-sm text-white placeholder:text-neutral-600 focus:outline-none focus:border-cyan-600"
              />
            </div>
            <div className="flex gap-1">
              {(["ALL", "DRAFT", "SENT", "FAILED"] as StatusFilter[]).map((s) => (
                <button
                  key={s}
                  onClick={() => setStatusFilter(s)}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                    statusFilter === s
                      ? "bg-[#1a1a1a] text-white border border-[#333]"
                      : "text-neutral-500 hover:text-neutral-300 hover:bg-[#111]"
                  }`}
                >
                  {s === "ALL" ? "All" : s.charAt(0) + s.slice(1).toLowerCase()}
                </button>
              ))}
            </div>
          </div>

          {/* Campaigns Table */}
          <Table>
            <thead>
              <tr>
                <Th>Campaign</Th>
                <Th>Status</Th>
                <Th>Audience</Th>
                <Th>Delivery</Th>
                <Th>Created</Th>
                <Th className="text-right">Actions</Th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <Td colSpan={6}>
                    <div className="text-center text-neutral-500 py-12">
                      <div className="animate-pulse">Loading campaigns...</div>
                    </div>
                  </Td>
                </tr>
              )}

              {!loading && filteredCampaigns.length === 0 && (
                <tr>
                  <Td colSpan={6}>
                    <div className="text-center py-12">
                      <Megaphone size={32} className="text-neutral-700 mx-auto mb-3" />
                      <p className="text-neutral-500 text-sm">
                        {searchTerm || statusFilter !== "ALL"
                          ? "No campaigns match your filters"
                          : "No campaigns yet. Create your first one!"}
                      </p>
                    </div>
                  </Td>
                </tr>
              )}

              {filteredCampaigns.map((campaign) => (
                <tr
                  key={campaign.id}
                  className="border-t border-[#262626] hover:bg-[#0f0f0f] transition-colors cursor-pointer"
                  onClick={() => setShowDetail(campaign)}
                >
                  <Td>
                    <div className="max-w-[280px]">
                      <p className="font-medium text-white truncate">{campaign.title}</p>
                      <p className="text-xs text-neutral-500 mt-0.5 truncate">{campaign.body}</p>
                    </div>
                  </Td>
                  <Td>
                    <StatusBadge status={campaign.status} />
                  </Td>
                  <Td>
                    <div className="flex items-center gap-1.5 text-sm">
                      <Users size={13} className="text-neutral-500" />
                      <span className="text-neutral-300">{campaign.targetCount}</span>
                    </div>
                  </Td>
                  <Td>
                    <div className="flex items-center gap-2 text-xs">
                      <span className="text-green-400">{campaign.sentCount} sent</span>
                      {campaign.failedCount > 0 && (
                        <span className="text-red-400">{campaign.failedCount} failed</span>
                      )}
                    </div>
                  </Td>
                  <Td>
                    <span className="text-neutral-500 text-xs">
                      {new Date(campaign.createdAt).toLocaleDateString("en-GB", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}
                    </span>
                  </Td>
                  <Td>
                    <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                      {campaign.status === "DRAFT" && (
                        <>
                          <Button
                            size="sm"
                            onClick={() => handleSend(campaign.id)}
                            disabled={sendingId === campaign.id || sending}
                          >
                            <Send size={12} className="mr-1" />
                            {sendingId === campaign.id ? "..." : "Send"}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setShowDeleteConfirm(campaign)}
                          >
                            <Trash2 size={12} />
                          </Button>
                        </>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDuplicate(campaign)}
                        title="Duplicate"
                      >
                        <Copy size={12} />
                      </Button>
                    </div>
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        </>
      )}

      {/* ─── DIRECT SEND TAB ─────────────────────────── */}
      {activeTab === "direct" && (
        <div className="grid grid-cols-2 gap-6">
          {/* Left: compose */}
          <div className="space-y-4">
            <div className="bg-[#111] border border-[#262626] rounded-xl p-5 space-y-4">
              <h3 className="text-sm font-semibold text-neutral-300 uppercase tracking-wider flex items-center gap-2">
                <Send size={14} className="text-cyan-500" />
                Compose Notification
              </h3>

              <Input
                label="Title"
                value={directTitle}
                onChange={(e) => setDirectTitle(e.target.value)}
                placeholder="Notification title..."
              />

              <div>
                <label className="block text-sm font-medium text-neutral-300 mb-1">Message</label>
                <textarea
                  value={directBody}
                  onChange={(e) => setDirectBody(e.target.value)}
                  placeholder="Notification body..."
                  className="w-full bg-[#0a0a0a] border border-[#262626] rounded-lg px-3 py-2 text-white placeholder-neutral-600 text-sm resize-none h-24 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                />
              </div>

              <NotificationPreview title={directTitle} body={directBody} />
            </div>

            <Button
              onClick={handleDirectSend}
              disabled={sendingDirect || !directTitle.trim() || !directBody.trim() || selectedUsers.length === 0}
              className="w-full"
            >
              <Send size={14} className="mr-2" />
              {sendingDirect
                ? "Sending..."
                : `Send to ${selectedUsers.length} user${selectedUsers.length !== 1 ? "s" : ""}`}
            </Button>

            {directSent && (
              <div className={`rounded-lg p-3 text-sm ${directSent.success ? "bg-green-950 text-green-300" : "bg-red-950 text-red-300"}`}>
                {directSent.success
                  ? `Sent successfully! ${directSent.successCount} delivered, ${directSent.failureCount} failed.`
                  : "Failed to send notifications."}
              </div>
            )}
          </div>

          {/* Right: user picker */}
          <div className="bg-[#111] border border-[#262626] rounded-xl p-5 space-y-4">
            <h3 className="text-sm font-semibold text-neutral-300 uppercase tracking-wider flex items-center gap-2">
              <Users size={14} className="text-cyan-500" />
              Select Recipients
            </h3>

            {/* Search users */}
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" />
              <input
                type="text"
                value={directSearch}
                onChange={(e) => setDirectSearch(e.target.value)}
                placeholder="Search by name or email..."
                className="w-full bg-[#0a0a0a] border border-[#262626] rounded-lg pl-9 pr-3 py-2 text-sm text-white placeholder:text-neutral-600 focus:outline-none focus:border-cyan-600"
              />
            </div>

            {/* Search results */}
            {filteredUsers.length > 0 && (
              <div className="border border-[#262626] rounded-lg overflow-hidden max-h-48 overflow-y-auto">
                {filteredUsers.map((user) => (
                  <button
                    key={user.id}
                    onClick={() => {
                      setSelectedUsers((prev) => [...prev, user]);
                      setDirectSearch("");
                    }}
                    className="w-full px-3 py-2 flex items-center gap-3 hover:bg-[#1a1a1a] transition-colors text-left border-b border-[#1a1a1a] last:border-0"
                  >
                    <div className="w-7 h-7 rounded-full bg-neutral-800 flex items-center justify-center text-xs text-neutral-400 flex-shrink-0">
                      {user.firstName[0]}{user.lastName[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white truncate">
                        {user.firstName} {user.lastName}
                      </p>
                      <p className="text-xs text-neutral-500 truncate">{user.email}</p>
                    </div>
                    <span className="text-[10px] text-neutral-600 uppercase">{user.role}</span>
                  </button>
                ))}
              </div>
            )}

            {/* Selected users */}
            {selectedUsers.length > 0 && (
              <div>
                <p className="text-xs text-neutral-500 mb-2">
                  {selectedUsers.length} recipient{selectedUsers.length !== 1 ? "s" : ""} selected
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {selectedUsers.map((user) => (
                    <span
                      key={user.id}
                      className="inline-flex items-center gap-1.5 bg-[#1a1a1a] border border-[#333] rounded-full pl-2.5 pr-1.5 py-1 text-xs text-neutral-300"
                    >
                      {user.firstName} {user.lastName}
                      <button
                        onClick={() => setSelectedUsers((prev) => prev.filter((u) => u.id !== user.id))}
                        className="p-0.5 rounded-full hover:bg-neutral-700 transition-colors"
                      >
                        <X size={10} />
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            )}

            {selectedUsers.length === 0 && !directSearch && (
              <div className="text-center py-8">
                <Users size={28} className="text-neutral-700 mx-auto mb-2" />
                <p className="text-neutral-500 text-xs">Search and select users to send notifications to</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── CREATE CAMPAIGN MODAL ────────────────────── */}
      <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title="New Campaign">
        <div className="space-y-6">
          {/* Content */}
          <div className="space-y-3">
            <h3 className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">
              Notification Content
            </h3>
            <Input
              label="Title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Weekend special offer!"
            />
            <div>
              <label className="block text-sm font-medium text-neutral-300 mb-1">Message</label>
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="e.g., Get 20% off all orders this weekend!"
                className="w-full bg-[#0a0a0a] border border-[#262626] rounded-lg px-3 py-2 text-white placeholder-neutral-600 text-sm resize-none h-20 focus:outline-none focus:ring-1 focus:ring-cyan-500"
              />
            </div>
            <NotificationPreview title={title} body={body} />
          </div>

          {/* Query Builder */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">
                Target Audience
              </h3>
              <span className="text-[10px] text-neutral-600">
                Build rules to target specific users
              </span>
            </div>
            <QueryBuilder value={queryGroup} onChange={setQueryGroup} />
          </div>

          {/* Preview */}
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <Button
                size="sm"
                variant="outline"
                onClick={handlePreview}
                disabled={previewing}
              >
                <Eye size={13} className="mr-1.5" />
                {previewing ? "Checking..." : "Preview Audience"}
              </Button>
              {previewCount !== null && (
                <div className="flex items-center gap-1.5 text-sm">
                  <Users size={14} className="text-cyan-400" />
                  <span className="text-white font-semibold">{previewCount}</span>
                  <span className="text-neutral-500">users matched</span>
                </div>
              )}
            </div>

            {previewUsers.length > 0 && (
              <div className="bg-[#0a0a0a] border border-[#262626] rounded-lg overflow-hidden">
                <div className="px-3 py-1.5 border-b border-[#1f1f1f]">
                  <p className="text-[10px] text-neutral-600 uppercase tracking-wider">
                    Sample users (up to 10)
                  </p>
                </div>
                <div className="divide-y divide-[#1f1f1f]">
                  {previewUsers.map((u) => (
                    <div key={u.id} className="px-3 py-2 flex items-center gap-3">
                      <div className="w-6 h-6 rounded-full bg-neutral-800 flex items-center justify-center text-[10px] text-neutral-400 flex-shrink-0">
                        {u.firstName[0]}{u.lastName[0]}
                      </div>
                      <span className="text-xs text-neutral-300">
                        {u.firstName} {u.lastName}
                      </span>
                      <span className="text-xs text-neutral-600 ml-auto">{u.email}</span>
                      <span className="text-[10px] text-neutral-700 uppercase">{u.role}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-3 border-t border-[#262626]">
            <Button variant="outline" onClick={() => setShowCreate(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={creating || !title.trim() || !body.trim()}>
              {creating ? "Creating..." : "Create Campaign"}
            </Button>
          </div>
        </div>
      </Modal>

      {/* ─── CAMPAIGN DETAIL MODAL ────────────────────── */}
      <Modal
        isOpen={!!showDetail}
        onClose={() => setShowDetail(null)}
        title={showDetail?.title || "Campaign Details"}
      >
        {showDetail && (
          <div className="space-y-5">
            <div className="flex items-center gap-3">
              <StatusBadge status={showDetail.status} />
              <span className="text-xs text-neutral-500">
                Created {new Date(showDetail.createdAt).toLocaleDateString("en-GB", {
                  day: "2-digit",
                  month: "long",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            </div>

            {/* Content */}
            <div className="space-y-2">
              <h4 className="text-xs text-neutral-500 uppercase tracking-wider">Content</h4>
              <NotificationPreview title={showDetail.title} body={showDetail.body} />
            </div>

            {/* Delivery stats */}
            <div className="space-y-2">
              <h4 className="text-xs text-neutral-500 uppercase tracking-wider">Delivery</h4>
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-[#0a0a0a] border border-[#262626] rounded-lg p-3 text-center">
                  <p className="text-xs text-neutral-500">Target</p>
                  <p className="text-xl font-bold text-white mt-1">{showDetail.targetCount}</p>
                </div>
                <div className="bg-[#0a0a0a] border border-[#262626] rounded-lg p-3 text-center">
                  <p className="text-xs text-neutral-500">Sent</p>
                  <p className="text-xl font-bold text-green-400 mt-1">{showDetail.sentCount}</p>
                </div>
                <div className="bg-[#0a0a0a] border border-[#262626] rounded-lg p-3 text-center">
                  <p className="text-xs text-neutral-500">Failed</p>
                  <p className="text-xl font-bold text-red-400 mt-1">{showDetail.failedCount}</p>
                </div>
              </div>
              {showDetail.sentAt && (
                <p className="text-xs text-neutral-500">
                  Sent at {new Date(showDetail.sentAt).toLocaleString("en-GB")}
                </p>
              )}
            </div>

            {/* Query summary */}
            {showDetail.query && (
              <div className="space-y-2">
                <h4 className="text-xs text-neutral-500 uppercase tracking-wider">Target Query</h4>
                <div className="bg-[#0a0a0a] border border-[#262626] rounded-lg p-3">
                  <pre className="text-xs text-neutral-400 overflow-x-auto whitespace-pre-wrap">
                    {JSON.stringify(showDetail.query, null, 2)}
                  </pre>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-end gap-2 pt-3 border-t border-[#262626]">
              <Button
                variant="outline"
                onClick={() => handleDuplicate(showDetail)}
              >
                <Copy size={14} className="mr-1.5" />
                Duplicate
              </Button>
              {showDetail.status === "DRAFT" && (
                <>
                  <Button
                    variant="danger"
                    onClick={() => {
                      setShowDeleteConfirm(showDetail);
                      setShowDetail(null);
                    }}
                  >
                    <Trash2 size={14} className="mr-1.5" />
                    Delete
                  </Button>
                  <Button
                    onClick={() => {
                      handleSend(showDetail.id);
                      setShowDetail(null);
                    }}
                  >
                    <Send size={14} className="mr-1.5" />
                    Send Now
                  </Button>
                </>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* ─── DELETE CONFIRM MODAL ─────────────────────── */}
      <Modal
        isOpen={!!showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(null)}
        title="Delete Campaign"
      >
        {showDeleteConfirm && (
          <div className="space-y-4">
            <p className="text-neutral-300 text-sm">
              Are you sure you want to delete <strong className="text-white">&quot;{showDeleteConfirm.title}&quot;</strong>?
              This action cannot be undone.
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setShowDeleteConfirm(null)}>
                Cancel
              </Button>
              <Button variant="danger" onClick={() => handleDelete(showDeleteConfirm.id)}>
                <Trash2 size={14} className="mr-1.5" />
                Delete
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
