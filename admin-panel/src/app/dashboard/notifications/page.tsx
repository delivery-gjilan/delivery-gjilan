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
  Gift,
  Tag,
} from "lucide-react";

// â”€â”€ Types â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

interface Campaign {
  id: string;
  title: string;
  body: string;
  data: Record<string, unknown> | null;
  imageUrl: string | null;
  timeSensitive: boolean;
  category: string | null;
  relevanceScore: number | null;
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
  startsAt: string;
  endsAt: string;
}

type Tab = "campaigns" | "direct" | "promotions";
type StatusFilter = "ALL" | "DRAFT" | "SENDING" | "SENT" | "FAILED";
type RoleFilter = "ALL" | "CUSTOMER" | "DRIVER" | "BUSINESS_OWNER";

const CAMPAIGN_CATEGORY_OPTIONS = [
  { value: "", label: "None" },
  { value: "promotion", label: "Promotion" },
  { value: "general", label: "General" },
  { value: "order-on-the-way", label: "Order On The Way" },
  { value: "order-delivered", label: "Order Delivered" },
  { value: "order-cancelled", label: "Order Cancelled" },
];

function isoDateDaysAgo(days: number) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString().slice(0, 10);
}

const AUDIENCE_PRESETS: Array<{ label: string; build: () => RuleGroup }> = [
  {
    label: "All Customers",
    build: () => ({ operator: "AND", rules: [{ field: "role", op: "eq", value: "CUSTOMER" }] }),
  },
  {
    label: "All Drivers",
    build: () => ({ operator: "AND", rules: [{ field: "role", op: "eq", value: "DRIVER" }] }),
  },
  {
    label: "Business Owners",
    build: () => ({ operator: "AND", rules: [{ field: "role", op: "eq", value: "BUSINESS_OWNER" }] }),
  },
  {
    label: "High Value Customers",
    build: () => ({
      operator: "AND",
      rules: [
        { field: "role", op: "eq", value: "CUSTOMER" },
        { field: "totalSpend", op: "gte", value: "100" },
      ],
    }),
  },
  {
    label: "Dormant Customers",
    build: () => ({
      operator: "AND",
      rules: [
        { field: "role", op: "eq", value: "CUSTOMER" },
        { field: "lastOrderAt", op: "lt", value: isoDateDaysAgo(30) },
      ],
    }),
  },
];

// â”€â”€ Status badge â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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

// â”€â”€ Stats Card â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="bg-[#111] border border-zinc-800 rounded-lg px-4 py-3">
      <p className="text-xs text-zinc-600 uppercase tracking-wider">{label}</p>
      <p className={`text-2xl font-bold mt-1 ${color}`}>{value}</p>
    </div>
  );
}

// â”€â”€ Notification Preview Card â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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
            <div className="mt-2 rounded-lg overflow-hidden w-full h-20 bg-zinc-800/40 flex items-center justify-center border border-zinc-800">
              <Image size={16} className="text-zinc-600" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// â”€â”€ Main Page â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export default function NotificationsPage() {
  const [activeTab, setActiveTab] = useState<Tab>("campaigns");

  // â”€â”€ Campaign state â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const [showCreate, setShowCreate] = useState(false);
  const [showDetail, setShowDetail] = useState<Campaign | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<Campaign | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [searchTerm, setSearchTerm] = useState("");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [campaignImageUrl, setCampaignImageUrl] = useState("");
  const [campaignCategory, setCampaignCategory] = useState("");
  const [campaignTimeSensitive, setCampaignTimeSensitive] = useState(false);
  const [campaignRelevanceScore, setCampaignRelevanceScore] = useState("");
  const [queryGroup, setQueryGroup] = useState<RuleGroup>(createDefaultGroup());
  const [previewCount, setPreviewCount] = useState<number | null>(null);
  const [previewUsers, setPreviewUsers] = useState<UserItem[]>([]);
  const [sendingId, setSendingId] = useState<string | null>(null);

  // â”€â”€ Direct send state â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const [directTitle, setDirectTitle] = useState("");
  const [directBody, setDirectBody] = useState("");
  const [directSearch, setDirectSearch] = useState("");
  const [selectedUsers, setSelectedUsers] = useState<UserItem[]>([]);
  const [directSent, setDirectSent] = useState<{ success: boolean; successCount: number; failureCount: number } | null>(null);
  const [directImageUrl, setDirectImageUrl] = useState("");
  const [directTimeSensitive, setDirectTimeSensitive] = useState(false);
  const [directCategory, setDirectCategory] = useState("");
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("ALL");

  const [selectedPromotion, setSelectedPromotion] = useState<string>("");
  const [promoUsers, setPromoUsers] = useState<UserItem[]>([]);
  const [promoSearch, setPromoSearch] = useState("");
  const [promoRoleFilter, setPromoRoleFilter] = useState<RoleFilter>("ALL");
  const [promoNotifTitle, setPromoNotifTitle] = useState("");
  const [promoNotifBody, setPromoNotifBody] = useState("");
  const [promoImageUrl, setPromoImageUrl] = useState("");
  const [promoSent, setPromoSent] = useState<{ success: boolean; count: number } | null>(null);

  // â”€â”€ Queries & Mutations â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const { data, loading, refetch } = useQuery(GET_NOTIFICATION_CAMPAIGNS);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const campaigns: Campaign[] = (data as any)?.notificationCampaigns || [];

  const { data: usersData } = useQuery(USERS_QUERY);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const allUsers: UserItem[] = (usersData as any)?.users || [];

  const { data: promotionsData } = useQuery(GET_ALL_PROMOTIONS);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const allPromotions: Promotion[] = (promotionsData as any)?.getAllPromotions || [];

  const [createCampaign, { loading: creating }] = useMutation(CREATE_CAMPAIGN);
  const [sendCampaignMut, { loading: sending }] = useMutation(SEND_CAMPAIGN);
  const [deleteCampaignMut] = useMutation(DELETE_CAMPAIGN);
  const [sendPushMut, { loading: sendingDirect }] = useMutation(SEND_PUSH_NOTIFICATION);
  const [previewAudience, { loading: previewing }] = useLazyQuery(PREVIEW_CAMPAIGN_AUDIENCE);
  const [assignPromotionMut, { loading: assigningPromo }] = useMutation(ASSIGN_PROMOTION_TO_USERS);

  // â”€â”€ Computed â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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
          (roleFilter === "ALL" || u.role === roleFilter) &&
          (u.email.toLowerCase().includes(term) ||
            u.firstName.toLowerCase().includes(term) ||
            u.lastName.toLowerCase().includes(term)),
      )
      .slice(0, 8);
  }, [allUsers, directSearch, selectedUsers, roleFilter]);

  const filteredPromoUsers = useMemo(() => {
    if (!promoSearch.trim()) return [];
    const term = promoSearch.toLowerCase();
    return allUsers
      .filter(
        (u) =>
          !promoUsers.some((s) => s.id === u.id) &&
          (promoRoleFilter === "ALL" || u.role === promoRoleFilter) &&
          (u.email.toLowerCase().includes(term) ||
            u.firstName.toLowerCase().includes(term) ||
            u.lastName.toLowerCase().includes(term)),
      )
      .slice(0, 8);
  }, [allUsers, promoSearch, promoUsers, promoRoleFilter]);

  // â”€â”€ Handlers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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
    setCampaignImageUrl("");
    setCampaignCategory("");
    setCampaignTimeSensitive(false);
    setCampaignRelevanceScore("");
    setPreviewCount(null);
    setPreviewUsers([]);
    setQueryGroup(createDefaultGroup());
  };

  const handleCreate = async () => {
    if (!title.trim() || !body.trim()) return;
    try {
      await createCampaign({
        variables: {
          input: {
            title: title.trim(),
            body: body.trim(),
            imageUrl: campaignImageUrl.trim() || undefined,
            category: campaignCategory || undefined,
            timeSensitive: campaignTimeSensitive,
            relevanceScore: campaignRelevanceScore.trim() ? Number(campaignRelevanceScore) : undefined,
            query: queryGroup,
          },
        },
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
    setCampaignImageUrl(campaign.imageUrl || "");
    setCampaignCategory(campaign.category || "");
    setCampaignTimeSensitive(campaign.timeSensitive);
    setCampaignRelevanceScore(campaign.relevanceScore != null ? String(campaign.relevanceScore) : "");
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
            category: directCategory || undefined,
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
      setDirectImageUrl("");
      setDirectTimeSensitive(false);
      setDirectCategory("");
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
      const { data } = await assignPromotionMut({
        variables: {
          input: {
            promotionId: selectedPromotion,
            userIds: promoUsers.map((u) => u.id),
          },
        },
      });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const assignments = (data as any)?.assignPromotionToUsers || [];
      const count = assignments.length;

      if (promoNotifTitle.trim() && promoNotifBody.trim()) {
        await sendPushMut({
          variables: {
            input: {
              userIds: promoUsers.map((u) => u.id),
              title: promoNotifTitle.trim(),
              body: promoNotifBody.trim(),
              imageUrl: promoImageUrl.trim() || undefined,
              category: "promotion",
            },
          },
        });
      }

      setPromoSent({ success: true, count });
      setTimeout(() => setPromoSent(null), 5000);
      setSelectedPromotion("");
      setPromoUsers([]);
      setPromoNotifTitle("");
      setPromoNotifBody("");
      setPromoImageUrl("");
    } catch (err) {
      console.error("Promo assign failed:", err);
      setPromoSent({ success: false, count: 0 });
      setTimeout(() => setPromoSent(null), 5000);
    }
  };

  // â”€â”€ Render â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-violet-500 to-violet-700 flex items-center justify-center">
              <Bell size={18} className="text-white" />
            </div>
            Push Notifications
          </h1>
          <p className="text-zinc-600 text-sm mt-1">
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
      <div className="flex gap-1 bg-[#09090b] border border-zinc-800 rounded-lg p-1 w-fit">
        <button
          onClick={() => setActiveTab("campaigns")}
          className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
            activeTab === "campaigns"
              ? "bg-[#1a1a1a] text-white border border-[#333]"
              : "text-zinc-600 hover:text-zinc-400"
          }`}
        >
          <Megaphone size={15} />
          Campaigns
          {stats.draft > 0 && (
            <span className="bg-violet-900/60 text-violet-300 text-[10px] font-bold px-1.5 py-0.5 rounded-full">
              {stats.draft}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab("direct")}
          className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
            activeTab === "direct"
              ? "bg-[#1a1a1a] text-white border border-[#333]"
              : "text-zinc-600 hover:text-zinc-400"
          }`}
        >
          <Send size={15} />
          Direct Send
        </button>
        <button
          onClick={() => setActiveTab("promotions")}
          className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
            activeTab === "promotions"
              ? "bg-[#1a1a1a] text-white border border-[#333]"
              : "text-zinc-600 hover:text-zinc-400"
          }`}
        >
          <Gift size={15} />
          Promotions
        </button>
      </div>

      {/* â”€â”€â”€ CAMPAIGNS TAB â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      {activeTab === "campaigns" && (
        <>
          {/* Stats row */}
          <div className="grid grid-cols-4 gap-3">
            <StatCard label="Total" value={stats.total} color="text-white" />
            <StatCard label="Drafts" value={stats.draft} color="text-zinc-500" />
            <StatCard label="Sent" value={stats.sent} color="text-green-400" />
            <StatCard label="Failed" value={stats.failed} color="text-red-400" />
          </div>

          {/* Filters */}
          <div className="flex items-center gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search campaigns..."
                className="w-full bg-[#09090b] border border-zinc-800 rounded-lg pl-9 pr-3 py-2 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-violet-600"
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
                      : "text-zinc-600 hover:text-zinc-400 hover:bg-[#111]"
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
                    <div className="text-center text-zinc-600 py-12">
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
                      <p className="text-zinc-600 text-sm">
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
                  className="border-t border-zinc-800 hover:bg-[#0f0f0f] transition-colors cursor-pointer"
                  onClick={() => setShowDetail(campaign)}
                >
                  <Td>
                    <div className="max-w-[280px]">
                      <p className="font-medium text-white truncate">{campaign.title}</p>
                      <p className="text-xs text-zinc-600 mt-0.5 truncate">{campaign.body}</p>
                    </div>
                  </Td>
                  <Td>
                    <StatusBadge status={campaign.status} />
                  </Td>
                  <Td>
                    <div className="flex items-center gap-1.5 text-sm">
                      <Users size={13} className="text-zinc-600" />
                      <span className="text-zinc-400">{campaign.targetCount}</span>
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
                    <span className="text-zinc-600 text-xs">
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

      {/* â”€â”€â”€ DIRECT SEND TAB â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      {activeTab === "direct" && (
        <div className="grid grid-cols-2 gap-6">
          {/* Left: compose */}
          <div className="space-y-4">
            <div className="bg-[#111] border border-zinc-800 rounded-xl p-5 space-y-4">
              <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider flex items-center gap-2">
                <Send size={14} className="text-violet-500" />
                Compose Notification
              </h3>

              <Input
                label="Title"
                value={directTitle}
                onChange={(e) => setDirectTitle(e.target.value)}
                placeholder="Notification title..."
              />

              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-1">Message</label>
                <textarea
                  value={directBody}
                  onChange={(e) => setDirectBody(e.target.value)}
                  placeholder="Notification body..."
                  className="w-full bg-[#09090b] border border-zinc-800 rounded-lg px-3 py-2 text-white placeholder-neutral-600 text-sm resize-none h-24 focus:outline-none focus:ring-1 focus:ring-violet-500"
                />
              </div>

              <Input
                label="Image URL (optional)"
                value={directImageUrl}
                onChange={(e) => setDirectImageUrl(e.target.value)}
                placeholder="https://example.com/image.png"
              />

              <div className="space-y-2">
                <label className="block text-sm font-medium text-zinc-400">Category</label>
                <select
                  value={directCategory}
                  onChange={(e) => setDirectCategory(e.target.value)}
                  className="w-full bg-[#09090b] border border-zinc-800 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-1 focus:ring-violet-500"
                >
                  <option value="">None</option>
                  <option value="order-on-the-way">Order On The Way</option>
                  <option value="order-delivered">Order Delivered</option>
                  <option value="order-cancelled">Order Cancelled</option>
                  <option value="promotion">Promotion</option>
                  <option value="general">General</option>
                </select>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="direct-time-sensitive"
                  checked={directTimeSensitive}
                  onChange={(e) => setDirectTimeSensitive(e.target.checked)}
                  className="w-4 h-4 rounded border-zinc-700 bg-[#09090b] text-violet-600 focus:ring-violet-500"
                />
                <label htmlFor="direct-time-sensitive" className="text-sm text-zinc-400 flex items-center gap-1.5">
                  <Zap size={14} className="text-violet-500" />
                  Time-sensitive (bypasses Focus/DND modes)
                </label>
              </div>

              <NotificationPreview title={directTitle} body={directBody} imageUrl={directImageUrl} />
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
          <div className="bg-[#111] border border-zinc-800 rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider flex items-center gap-2">
                <Users size={14} className="text-violet-500" />
                Select Recipients
              </h3>
              <Button
                size="sm"
                variant="outline"
                onClick={handleSelectAllCustomers}
                className="text-xs"
              >
                <Users size={12} className="mr-1" />
                All Customers
              </Button>
            </div>

            {/* Role Filter */}
            <div className="flex items-center gap-2">
              <Filter size={14} className="text-zinc-600" />
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value as RoleFilter)}
                className="flex-1 bg-[#09090b] border border-zinc-800 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-violet-500"
              >
                <option value="ALL">All Roles</option>
                <option value="CUSTOMER">Customers</option>
                <option value="DRIVER">Drivers</option>
                <option value="BUSINESS_OWNER">Business Owners</option>
              </select>
            </div>

            {/* Search users */}
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600" />
              <input
                type="text"
                value={directSearch}
                onChange={(e) => setDirectSearch(e.target.value)}
                placeholder="Search by name or email..."
                className="w-full bg-[#09090b] border border-zinc-800 rounded-lg pl-9 pr-3 py-2 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-violet-600"
              />
            </div>

            {/* Search results */}
            {filteredUsers.length > 0 && (
              <div className="border border-zinc-800 rounded-lg overflow-hidden max-h-48 overflow-y-auto">
                {filteredUsers.map((user) => (
                  <button
                    key={user.id}
                    onClick={() => {
                      setSelectedUsers((prev) => [...prev, user]);
                      setDirectSearch("");
                    }}
                    className="w-full px-3 py-2 flex items-center gap-3 hover:bg-[#1a1a1a] transition-colors text-left border-b border-[#1a1a1a] last:border-0"
                  >
                    <div className="w-7 h-7 rounded-full bg-zinc-800/60 flex items-center justify-center text-xs text-zinc-500 flex-shrink-0">
                      {user.firstName[0]}{user.lastName[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white truncate">
                        {user.firstName} {user.lastName}
                      </p>
                      <p className="text-xs text-zinc-600 truncate">{user.email}</p>
                    </div>
                    <span className="text-[10px] text-zinc-600 uppercase">{user.role}</span>
                  </button>
                ))}
              </div>
            )}

            {/* Selected users */}
            {selectedUsers.length > 0 && (
              <div>
                <p className="text-xs text-zinc-600 mb-2">
                  {selectedUsers.length} recipient{selectedUsers.length !== 1 ? "s" : ""} selected
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {selectedUsers.map((user) => (
                    <span
                      key={user.id}
                      className="inline-flex items-center gap-1.5 bg-[#1a1a1a] border border-[#333] rounded-full pl-2.5 pr-1.5 py-1 text-xs text-zinc-400"
                    >
                      {user.firstName} {user.lastName}
                      <button
                        onClick={() => setSelectedUsers((prev) => prev.filter((u) => u.id !== user.id))}
                        className="p-0.5 rounded-full hover:bg-zinc-800 transition-colors"
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
                <p className="text-zinc-600 text-xs">Search and select users to send notifications to</p>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === "promotions" && (
        <div className="grid grid-cols-2 gap-6">
          <div className="space-y-4">
            <div className="bg-[#111] border border-zinc-800 rounded-xl p-5 space-y-4">
              <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider flex items-center gap-2">
                <Tag size={14} className="text-violet-500" />
                Select Promotion
              </h3>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-zinc-400">Promotion</label>
                <select
                  value={selectedPromotion}
                  onChange={(e) => setSelectedPromotion(e.target.value)}
                  className="w-full bg-[#09090b] border border-zinc-800 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-1 focus:ring-violet-500"
                >
                  <option value="">Choose a promotion...</option>
                  {allPromotions.map((promo) => (
                    <option key={promo.id} value={promo.id}>
                      {promo.code} - {promo.name} ({promo.type === "PERCENTAGE" ? `${promo.discountValue}%` : `$${promo.discountValue}`})
                    </option>
                  ))}
                </select>
              </div>

              {selectedPromotion && (
                <div className="bg-[#0a0a0a] border border-zinc-900 rounded-lg p-3 text-xs text-zinc-500">
                  <p className="font-semibold text-zinc-400 mb-1">Selected Promotion Details:</p>
                  {allPromotions.find(p => p.id === selectedPromotion)?.description}
                </div>
              )}
            </div>

            <div className="bg-[#111] border border-zinc-800 rounded-xl p-5 space-y-4">
              <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider flex items-center gap-2">
                <Bell size={14} className="text-violet-500" />
                Notification (Optional)
              </h3>

              <Input
                label="Title"
                value={promoNotifTitle}
                onChange={(e) => setPromoNotifTitle(e.target.value)}
                placeholder="🎉 New promotion for you!"
              />

              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-1">Message</label>
                <textarea
                  value={promoNotifBody}
                  onChange={(e) => setPromoNotifBody(e.target.value)}
                  placeholder="Check out our latest offer..."
                  className="w-full bg-[#09090b] border border-zinc-800 rounded-lg px-3 py-2 text-white placeholder-neutral-600 text-sm resize-none h-20 focus:outline-none focus:ring-1 focus:ring-violet-500"
                />
              </div>

              <Input
                label="Image URL (optional)"
                value={promoImageUrl}
                onChange={(e) => setPromoImageUrl(e.target.value)}
                placeholder="https://example.com/promo.png"
              />

              <NotificationPreview title={promoNotifTitle} body={promoNotifBody} imageUrl={promoImageUrl} />
            </div>

            <Button
              onClick={handlePromoAssign}
              disabled={assigningPromo || !selectedPromotion || promoUsers.length === 0}
              className="w-full"
            >
              <Gift size={14} className="mr-2" />
              {assigningPromo
                ? "Assigning..."
                : `Assign to ${promoUsers.length} user${promoUsers.length !== 1 ? "s" : ""}`}
            </Button>

            {promoSent && (
              <div className={`rounded-lg p-3 text-sm ${promoSent.success ? "bg-green-950 text-green-300" : "bg-red-950 text-red-300"}`}>
                {promoSent.success
                  ? `Success! Promotion assigned to ${promoSent.count} user${promoSent.count !== 1 ? "s" : ""}. ${promoNotifTitle ? "Notification sent." : ""}`
                  : "Failed to assign promotion."}
              </div>
            )}
          </div>

          <div className="bg-[#111] border border-zinc-800 rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider flex items-center gap-2">
                <Users size={14} className="text-violet-500" />
                Select Users
              </h3>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  const customers = allUsers.filter((u) => u.role === "CUSTOMER");
                  setPromoUsers(customers);
                }}
                className="text-xs"
              >
                <Users size={12} className="mr-1" />
                All Customers
              </Button>
            </div>

            <div className="flex items-center gap-2">
              <Filter size={14} className="text-zinc-600" />
              <select
                value={promoRoleFilter}
                onChange={(e) => setPromoRoleFilter(e.target.value as RoleFilter)}
                className="flex-1 bg-[#09090b] border border-zinc-800 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-violet-500"
              >
                <option value="ALL">All Roles</option>
                <option value="CUSTOMER">Customers</option>
                <option value="DRIVER">Drivers</option>
                <option value="BUSINESS_OWNER">Business Owners</option>
              </select>
            </div>

            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600" />
              <input
                type="text"
                value={promoSearch}
                onChange={(e) => setPromoSearch(e.target.value)}
                placeholder="Search by name or email..."
                className="w-full bg-[#09090b] border border-zinc-800 rounded-lg pl-9 pr-3 py-2 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-violet-600"
              />
            </div>

            {filteredPromoUsers.length > 0 && (
              <div className="border border-zinc-800 rounded-lg overflow-hidden max-h-48 overflow-y-auto">
                {filteredPromoUsers.map((user) => (
                  <button
                    key={user.id}
                    onClick={() => {
                      setPromoUsers((prev) => [...prev, user]);
                      setPromoSearch("");
                    }}
                    className="w-full px-3 py-2 flex items-center gap-3 hover:bg-[#1a1a1a] transition-colors text-left border-b border-[#1a1a1a] last:border-0"
                  >
                    <div className="w-7 h-7 rounded-full bg-zinc-800/60 flex items-center justify-center text-xs text-zinc-500 flex-shrink-0">
                      {user.firstName[0]}{user.lastName[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white truncate">
                        {user.firstName} {user.lastName}
                      </p>
                      <p className="text-xs text-zinc-600 truncate">{user.email}</p>
                    </div>
                    <span className="text-[10px] text-zinc-600 uppercase">{user.role}</span>
                  </button>
                ))}
              </div>
            )}

            {promoUsers.length > 0 && (
              <div>
                <p className="text-xs text-zinc-600 mb-2">
                  {promoUsers.length} user{promoUsers.length !== 1 ? "s" : ""} selected
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {promoUsers.map((user) => (
                    <span
                      key={user.id}
                      className="inline-flex items-center gap-1.5 bg-[#1a1a1a] border border-[#333] rounded-full pl-2.5 pr-1.5 py-1 text-xs text-zinc-400"
                    >
                      {user.firstName} {user.lastName}
                      <button
                        onClick={() => setPromoUsers((prev) => prev.filter((u) => u.id !== user.id))}
                        className="p-0.5 rounded-full hover:bg-zinc-800 transition-colors"
                      >
                        <X size={10} />
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            )}

            {promoUsers.length === 0 && !promoSearch && (
              <div className="text-center py-8">
                <Users size={28} className="text-neutral-700 mx-auto mb-2" />
                <p className="text-zinc-600 text-xs">Search and select users to assign promotion</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* â”€â”€â”€ CREATE CAMPAIGN MODAL â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title="New Campaign">
        <div className="space-y-6">
          {/* Content */}
          <div className="space-y-3">
            <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
              Notification Content
            </h3>
            <Input
              label="Title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Weekend special offer!"
            />
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-1">Message</label>
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="e.g., Get 20% off all orders this weekend!"
                className="w-full bg-[#09090b] border border-zinc-800 rounded-lg px-3 py-2 text-white placeholder-neutral-600 text-sm resize-none h-20 focus:outline-none focus:ring-1 focus:ring-violet-500"
              />
            </div>

            <Input
              label="Image URL (optional)"
              value={campaignImageUrl}
              onChange={(e) => setCampaignImageUrl(e.target.value)}
              placeholder="https://example.com/image.png"
            />

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-zinc-400">Category</label>
                <select
                  value={campaignCategory}
                  onChange={(e) => setCampaignCategory(e.target.value)}
                  className="w-full bg-[#09090b] border border-zinc-800 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-1 focus:ring-violet-500"
                >
                  {CAMPAIGN_CATEGORY_OPTIONS.map((option) => (
                    <option key={option.label} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <Input
                label="Relevance Score"
                type="number"
                min="0"
                max="1"
                step="0.1"
                value={campaignRelevanceScore}
                onChange={(e) => setCampaignRelevanceScore(e.target.value)}
                placeholder="0.0 - 1.0"
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="campaign-time-sensitive"
                checked={campaignTimeSensitive}
                onChange={(e) => setCampaignTimeSensitive(e.target.checked)}
                className="w-4 h-4 rounded border-zinc-700 bg-[#09090b] text-violet-600 focus:ring-violet-500"
              />
              <label htmlFor="campaign-time-sensitive" className="text-sm text-zinc-400 flex items-center gap-1.5">
                <Zap size={14} className="text-violet-500" />
                Time-sensitive (iOS Focus bypass)
              </label>
            </div>

            <NotificationPreview title={title} body={body} imageUrl={campaignImageUrl} />
          </div>

          {/* Query Builder */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                Target Audience
              </h3>
              <span className="text-[10px] text-zinc-600">
                Build rules to target specific users
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {AUDIENCE_PRESETS.map((preset) => (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => {
                    setQueryGroup(preset.build());
                    setPreviewCount(null);
                    setPreviewUsers([]);
                  }}
                  className="px-2.5 py-1 rounded-md border border-zinc-800 bg-[#0d0d0d] text-xs text-zinc-400 hover:text-white hover:border-zinc-700 transition-colors"
                >
                  {preset.label}
                </button>
              ))}
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
                  <Users size={14} className="text-violet-400" />
                  <span className="text-white font-semibold">{previewCount}</span>
                  <span className="text-zinc-600">users matched</span>
                </div>
              )}
            </div>

            {previewUsers.length > 0 && (
              <div className="bg-[#09090b] border border-zinc-800 rounded-lg overflow-hidden">
                <div className="px-3 py-1.5 border-b border-[#1f1f1f]">
                  <p className="text-[10px] text-zinc-600 uppercase tracking-wider">
                    Sample users (up to 10)
                  </p>
                </div>
                <div className="divide-y divide-[#1f1f1f]">
                  {previewUsers.map((u) => (
                    <div key={u.id} className="px-3 py-2 flex items-center gap-3">
                      <div className="w-6 h-6 rounded-full bg-zinc-800/60 flex items-center justify-center text-[10px] text-zinc-500 flex-shrink-0">
                        {u.firstName[0]}{u.lastName[0]}
                      </div>
                      <span className="text-xs text-zinc-400">
                        {u.firstName} {u.lastName}
                      </span>
                      <span className="text-xs text-zinc-600 ml-auto">{u.email}</span>
                      <span className="text-[10px] text-neutral-700 uppercase">{u.role}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-3 border-t border-zinc-800">
            <Button variant="outline" onClick={() => setShowCreate(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={creating || !title.trim() || !body.trim()}>
              {creating ? "Creating..." : "Create Campaign"}
            </Button>
          </div>
        </div>
      </Modal>

      {/* â”€â”€â”€ CAMPAIGN DETAIL MODAL â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <Modal
        isOpen={!!showDetail}
        onClose={() => setShowDetail(null)}
        title={showDetail?.title || "Campaign Details"}
      >
        {showDetail && (
          <div className="space-y-5">
            <div className="flex items-center gap-3">
              <StatusBadge status={showDetail.status} />
              <span className="text-xs text-zinc-600">
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
              <h4 className="text-xs text-zinc-600 uppercase tracking-wider">Content</h4>
              <NotificationPreview title={showDetail.title} body={showDetail.body} imageUrl={showDetail.imageUrl || undefined} />
              <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-500">
                {showDetail.category && (
                  <span className="px-2 py-1 rounded-full border border-zinc-800 bg-[#111]">
                    category: {showDetail.category}
                  </span>
                )}
                {showDetail.timeSensitive && (
                  <span className="px-2 py-1 rounded-full border border-zinc-800 bg-[#111] text-violet-300">
                    time-sensitive
                  </span>
                )}
                {showDetail.relevanceScore != null && (
                  <span className="px-2 py-1 rounded-full border border-zinc-800 bg-[#111]">
                    relevance: {showDetail.relevanceScore}
                  </span>
                )}
              </div>
            </div>

            {/* Delivery stats */}
            <div className="space-y-2">
              <h4 className="text-xs text-zinc-600 uppercase tracking-wider">Delivery</h4>
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-[#09090b] border border-zinc-800 rounded-lg p-3 text-center">
                  <p className="text-xs text-zinc-600">Target</p>
                  <p className="text-xl font-bold text-white mt-1">{showDetail.targetCount}</p>
                </div>
                <div className="bg-[#09090b] border border-zinc-800 rounded-lg p-3 text-center">
                  <p className="text-xs text-zinc-600">Sent</p>
                  <p className="text-xl font-bold text-green-400 mt-1">{showDetail.sentCount}</p>
                </div>
                <div className="bg-[#09090b] border border-zinc-800 rounded-lg p-3 text-center">
                  <p className="text-xs text-zinc-600">Failed</p>
                  <p className="text-xl font-bold text-red-400 mt-1">{showDetail.failedCount}</p>
                </div>
              </div>
              {showDetail.sentAt && (
                <p className="text-xs text-zinc-600">
                  Sent at {new Date(showDetail.sentAt).toLocaleString("en-GB")}
                </p>
              )}
            </div>

            {/* Query summary */}
            {showDetail.query && (
              <div className="space-y-2">
                <h4 className="text-xs text-zinc-600 uppercase tracking-wider">Target Query</h4>
                <div className="bg-[#09090b] border border-zinc-800 rounded-lg p-3">
                  <pre className="text-xs text-zinc-500 overflow-x-auto whitespace-pre-wrap">
                    {JSON.stringify(showDetail.query, null, 2)}
                  </pre>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-end gap-2 pt-3 border-t border-zinc-800">
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

      {/* â”€â”€â”€ DELETE CONFIRM MODAL â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <Modal
        isOpen={!!showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(null)}
        title="Delete Campaign"
      >
        {showDeleteConfirm && (
          <div className="space-y-4">
            <p className="text-zinc-400 text-sm">
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
