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
  GET_ALL_PROMOTIONS,
  ASSIGN_PROMOTION_TO_USERS,
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
  Image,
  Zap,
  Filter,
  Download,
  Upload,
  Tag,
  Gift,
} from "lucide-react";

// ── Types ────────────────────────────────────────────────────────────

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

interface Promotion {
  id: string;
  name: string;
  description: string;
  code: string;
  type: string;
  discountValue: number;
  maxDiscountCap: number;
  isActive: boolean;
}

type Tab = "campaigns" | "direct" | "promotions";
type StatusFilter = "ALL" | "DRAFT" | "SENDING" | "SENT" | "FAILED";
type RoleFilter = "ALL" | "CUSTOMER" | "DRIVER" | "BUSINESS_OWNER";

// ── Status badge ─────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { bg: string; text: string; icon: typeof Clock }> = {
    DRAFT: { bg: "bg-zinc-800/60", text: "text-zinc-400", icon: Clock },
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

// ── Stats Card ───────────────────────────────────────────────────────

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="bg-[#111] border border-zinc-800 rounded-lg px-4 py-3">
      <p className="text-xs text-zinc-600 uppercase tracking-wider">{label}</p>
      <p className={`text-2xl font-bold mt-1 ${color}`}>{value}</p>
    </div>
  );
}

// ── Notification Preview Card ────────────────────────────────────────

function NotificationPreview({ title, body, imageUrl }: { title: string; body: string; imageUrl?: string }) {
  if (!title && !body && !imageUrl) return null;

  return (
    <div className="bg-[#1a1a1a] border border-[#333] rounded-xl p-3">
      <p className="text-[10px] text-zinc-600 mb-2 uppercase tracking-wider">Push Preview</p>
      <div className="bg-[#222] rounded-xl p-3 flex items-start gap-3 shadow-lg">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-violet-700 flex items-center justify-center flex-shrink-0 shadow-md">
          <Bell size={16} className="text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-white truncate">
              {title || "Notification Title"}
            </p>
            <span className="text-[10px] text-zinc-600 flex-shrink-0 ml-2">now</span>
          </div>
          <p className="text-xs text-zinc-500 mt-0.5 line-clamp-2">
            {body || "Notification body text..."}
          </p>
          {imageUrl && (
            <div className="mt-2 rounded-lg overflow-hidden w-full h-24 bg-zinc-800/60 flex items-center justify-center">
              <Image size={20} className="text-zinc-600" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main Page ────────────────────────────────────────────────────────

export default function NotificationsPage() {
  const [activeTab, setActiveTab] = useState<Tab>("direct");

  // ── Campaign state ──────────────────────────────────
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

  // ── Direct send state ───────────────────────────────
  const [directTitle, setDirectTitle] = useState("");
  const [directBody, setDirectBody] = useState("");
  const [directImageUrl, setDirectImageUrl] = useState("");
  const [directTimeSensitive, setDirectTimeSensitive] = useState(false);
  const [directCategory, setDirectCategory] = useState("");
  const [directSearch, setDirectSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("CUSTOMER");
  const [selectedUsers, setSelectedUsers] = useState<UserItem[]>([]);
  const [directSent, setDirectSent] = useState<{ success: boolean; successCount: number; failureCount: number } | null>(null);

  // ── Promotions state ────────────────────────────────
  const [selectedPromotion, setSelectedPromotion] = useState<string>("");
  const [promoNotifTitle, setPromoNotifTitle] = useState("");
  const [promoNotifBody, setPromoNotifBody] = useState("");
  const [promoImageUrl, setPromoImageUrl] = useState("");
  const [promoUsers, setPromoUsers] = useState<UserItem[]>([]);
  const [promoSearch, setPromoSearch] = useState("");
  const [promoRoleFilter, setPromoRoleFilter] = useState<RoleFilter>("CUSTOMER");
  const [promoSent, setPromoSent] = useState<{ success: boolean; count: number } | null>(null);

  // ── Queries & Mutations ─────────────────────────────
  const { data, loading, refetch } = useQuery(GET_NOTIFICATION_CAMPAIGNS);
  const campaigns: Campaign[] = (data as any)?.notificationCampaigns || [];

  const { data: usersData } = useQuery(USERS_QUERY);
  const allUsers: UserItem[] = (usersData as any)?.users || [];

  const { data: promotionsData } = useQuery(GET_ALL_PROMOTIONS);
  const promotions: Promotion[] = (promotionsData as any)?.getAllPromotions || [];

  const [createCampaign, { loading: creating }] = useMutation(CREATE_CAMPAIGN);
  const [sendCampaignMut, { loading: sending }] = useMutation(SEND_CAMPAIGN);
  const [deleteCampaignMut] = useMutation(DELETE_CAMPAIGN);
  const [sendPushMut, { loading: sendingDirect }] = useMutation(SEND_PUSH_NOTIFICATION);
  const [assignPromoMut, { loading: assigningPromo }] = useMutation(ASSIGN_PROMOTION_TO_USERS);
  const [previewAudience, { loading: previewing }] = useLazyQuery(PREVIEW_CAMPAIGN_AUDIENCE);

  // ── Computed ────────────────────────────────────────
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
    return [...list].reverse();
  }, [campaigns, statusFilter, searchTerm]);

  const filteredUsers = useMemo(() => {
    if (!directSearch.trim()) return [];
    const term = directSearch.toLowerCase();
    let users = allUsers;
    if (roleFilter !== "ALL") {
      users = users.filter((u) => u.role === roleFilter);
    }
    return users
      .filter(
        (u) =>
          !selectedUsers.some((s) => s.id === u.id) &&
          (u.email.toLowerCase().includes(term) ||
            u.firstName.toLowerCase().includes(term) ||
            u.lastName.toLowerCase().includes(term)),
      )
      .slice(0, 10);
  }, [allUsers, directSearch, selectedUsers, roleFilter]);

  const promoFilteredUsers = useMemo(() => {
    if (!promoSearch.trim()) return [];
    const term = promoSearch.toLowerCase();
    let users = allUsers;
    if (promoRoleFilter !== "ALL") {
      users = users.filter((u) => u.role === promoRoleFilter);
    }
    return users
      .filter(
        (u) =>
          !promoUsers.some((s) => s.id === u.id) &&
          (u.email.toLowerCase().includes(term) ||
            u.firstName.toLowerCase().includes(term) ||
            u.lastName.toLowerCase().includes(term)),
      )
      .slice(0, 10);
  }, [allUsers, promoSearch, promoUsers, promoRoleFilter]);

  // ── Handlers ────────────────────────────────────────
  const handlePreview = async () => {
    try {
      const { data } = await previewAudience({ variables: { query: queryGroup } });
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
            imageUrl: directImageUrl.trim() || undefined,
            timeSensitive: directTimeSensitive,
            category: directCategory.trim() || undefined,
          },
        },
      });
      const result = (data as any)?.sendPushNotification;
      if (result) {
        setDirectSent(result);
        setTimeout(() => setDirectSent(null), 5000);
      }
      setDirectTitle("");
      setDirectBody("");
      setDirectImageUrl("");
      setDirectCategory("");
      setDirectTimeSensitive(false);
      setSelectedUsers([]);
    } catch (err) {
      console.error("Direct send failed:", err);
    }
  };

  const handleSelectAllCustomers = () => {
    const customers = allUsers.filter((u) => u.role === "CUSTOMER");
    setSelectedUsers(customers);
  };

  const handlePromoAssign = async () => {
    if (!selectedPromotion || promoUsers.length === 0) return;
    try {
      const { data: assignData } = await assignPromoMut({
        variables: {
          input: {
            promotionId: selectedPromotion,
            userIds: promoUsers.map((u) => u.id),
          },
        },
      });
      
      const assignResult = (assignData as any)?.assignPromotionToUsers;
      if (assignResult) {
        // Send notification if title/body provided
        if (promoNotifTitle.trim() && promoNotifBody.trim()) {
          await sendPushMut({
            variables: {
              input: {
                userIds: promoUsers.map((u) => u.id),
                title: promoNotifTitle.trim(),
                body: promoNotifBody.trim(),
                imageUrl: promoImageUrl.trim() || undefined,
                timeSensitive: true,
                category: "promotion",
              },
            },
          });
        }
        setPromoSent({ success: true, count: assignResult.length });
        setTimeout(() => setPromoSent(null), 5000);
      }
      setSelectedPromotion("");
      setPromoNotifTitle("");
      setPromoNotifBody("");
      setPromoImageUrl("");
      setPromoUsers([]);
    } catch (err) {
      console.error("Promo assign failed:", err);
    }
  };

  // (Remaining UI code follows - campaigns table, modals, etc.)
  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Push Notifications</h1>
        <p className="text-zinc-600 text-sm mt-1">
          Create targeted campaigns or send direct notifications
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <StatCard label="Total Campaigns" value={stats.total} color="text-white" />
        <StatCard label="Drafts" value={stats.draft} color="text-zinc-400" />
        <StatCard label="Sent" value={stats.sent} color="text-green-400" />
        <StatCard label="Failed" value={stats.failed} color="text-red-400" />
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-zinc-800">
        <button
          onClick={() => setActiveTab("direct")}
          className={`px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
            activeTab === "direct"
              ? "text-violet-400 border-violet-500"
              : "text-zinc-600 border-transparent hover:text-zinc-400"
          }`}
        >
          <div className="flex items-center gap-2">
            <Send size={14} />
            Direct Send
          </div>
        </button>
        <button
          onClick={() => setActiveTab("campaigns")}
          className={`px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
            activeTab === "campaigns"
              ? "text-violet-400 border-violet-500"
              : "text-zinc-600 border-transparent hover:text-zinc-400"
          }`}
        >
          <div className="flex items-center gap-2">
            <Megaphone size={14} />
            Campaigns ({campaigns.length})
          </div>
        </button>
        <button
          onClick={() => setActiveTab("promotions")}
          className={`px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
            activeTab === "promotions"
              ? "text-violet-400 border-violet-500"
              : "text-zinc-600 border-transparent hover:text-zinc-400"
          }`}
        >
          <div className="flex items-center gap-2">
            <Gift size={14} />
            Promotions
          </div>
        </button>
      </div>

      {/* Content continues with Direct Send, Campaigns, and Promotions tabs... */}
      {/* Due to length, I'll split this into multiple parts */}
    </div>
  );
}
