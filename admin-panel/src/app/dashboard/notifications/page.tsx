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
  ASSIGN_PROMOTION_TO_USERS,
} from "@/graphql/operations/notifications";
import { GET_PROMOTIONS as GET_ALL_PROMOTIONS } from "@/graphql/operations/promotions/queries";
import { ISSUE_RECOVERY_PROMOTION, CREATE_PROMOTION } from "@/graphql/operations/promotions/mutations";
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
  Zap,
  Gift,
  ChevronDown,
  HeartHandshake,
} from "lucide-react";
import { PromotionType, PromotionTarget, PromotionCreatorType } from "@/gql/graphql";

// ── Types ──────────────────────────────────────────────────────────────────────

interface Campaign {
  id: string;
  title: string;
  body: string;
  titleAl: string | null;
  bodyAl: string | null;
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

type Tab = "campaigns" | "direct" | "promotions" | "recovery";
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
    label: "High Value (€100+)",
    build: () => ({
      operator: "AND",
      rules: [
        { field: "role", op: "eq", value: "CUSTOMER" },
        { field: "totalSpend", op: "gte", value: "100" },
      ],
    }),
  },
  {
    label: "Dormant (30+ days)",
    build: () => ({
      operator: "AND",
      rules: [
        { field: "role", op: "eq", value: "CUSTOMER" },
        { field: "lastOrderAt", op: "lt", value: isoDateDaysAgo(30) },
      ],
    }),
  },
];

// ── Status badge ───────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { bg: string; text: string; icon: typeof Clock }> = {
    DRAFT:   { bg: "bg-zinc-800",   text: "text-zinc-400",   icon: Clock },
    SENDING: { bg: "bg-yellow-950", text: "text-yellow-400", icon: AlertCircle },
    SENT:    { bg: "bg-green-950",  text: "text-green-400",  icon: CheckCircle2 },
    FAILED:  { bg: "bg-red-950",    text: "text-red-400",    icon: XCircle },
  };
  const c = config[status] || config.DRAFT;
  const Icon = c.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${c.bg} ${c.text}`}>
      <Icon size={11} />
      {status.charAt(0) + status.slice(1).toLowerCase()}
    </span>
  );
}

// ── Push preview ───────────────────────────────────────────────────────────────

function PushPreview({ title, body }: { title: string; body: string }) {
  if (!title && !body) return null;
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-3 flex items-start gap-3">
      <div className="w-9 h-9 rounded-xl bg-violet-600 flex items-center justify-center flex-shrink-0">
        <Bell size={15} className="text-white" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-white truncate">{title || "Title"}</p>
        <p className="text-xs text-zinc-400 mt-0.5 line-clamp-2">{body || "Message body..."}</p>
      </div>
      <span className="text-[10px] text-zinc-600 flex-shrink-0">now</span>
    </div>
  );
}

// ── Collapsible section ────────────────────────────────────────────────────────

function Collapsible({ label, children }: { label: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-300 transition-colors mb-2"
      >
        <ChevronDown size={13} className={`transition-transform ${open ? "rotate-180" : ""}`} />
        {label}
      </button>
      {open && <div className="space-y-3">{children}</div>}
    </div>
  );
}

// ── User picker ────────────────────────────────────────────────────────────────

function UserPicker({
  allUsers,
  selectedUsers,
  setSelectedUsers,
  search,
  setSearch,
  roleFilter,
  setRoleFilter,
  onSelectAll,
}: {
  allUsers: UserItem[];
  selectedUsers: UserItem[];
  setSelectedUsers: React.Dispatch<React.SetStateAction<UserItem[]>>;
  search: string;
  setSearch: (v: string) => void;
  roleFilter: RoleFilter;
  setRoleFilter: (v: RoleFilter) => void;
  onSelectAll?: () => void;
}) {
  const filtered = useMemo(() => {
    if (!search.trim()) return [];
    const term = search.toLowerCase();
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
  }, [allUsers, search, selectedUsers, roleFilter]);

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value as RoleFilter)}
          className="bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-violet-500"
        >
          <option value="ALL">All roles</option>
          <option value="CUSTOMER">Customers</option>
          <option value="DRIVER">Drivers</option>
          <option value="BUSINESS_OWNER">Business Owners</option>
        </select>
        {onSelectAll && (
          <button
            onClick={onSelectAll}
            className="text-xs text-violet-400 hover:text-violet-300 transition-colors px-3 border border-zinc-800 rounded-lg hover:border-zinc-700"
          >
            All Customers
          </button>
        )}
      </div>

      <div className="relative">
        <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name or email..."
          className="w-full bg-zinc-900 border border-zinc-800 rounded-lg pl-8 pr-3 py-2 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-violet-600"
        />
      </div>

      {filtered.length > 0 && (
        <div className="border border-zinc-800 rounded-lg overflow-hidden">
          {filtered.map((user) => (
            <button
              key={user.id}
              onClick={() => { setSelectedUsers((prev) => [...prev, user]); setSearch(""); }}
              className="w-full px-3 py-2.5 flex items-center gap-3 hover:bg-zinc-900 transition-colors text-left border-b border-zinc-900 last:border-0"
            >
              <div className="w-7 h-7 rounded-full bg-zinc-800 flex items-center justify-center text-xs text-zinc-400 flex-shrink-0 font-medium">
                {user.firstName[0]}{user.lastName[0]}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-white truncate">{user.firstName} {user.lastName}</p>
                <p className="text-xs text-zinc-500 truncate">{user.email}</p>
              </div>
              <span className="text-[10px] text-zinc-600 uppercase">{user.role.replace("_", " ")}</span>
            </button>
          ))}
        </div>
      )}

      {selectedUsers.length > 0 && (
        <div>
          <p className="text-xs text-zinc-500 mb-2">{selectedUsers.length} recipient{selectedUsers.length !== 1 ? "s" : ""} selected</p>
          <div className="flex flex-wrap gap-1.5">
            {selectedUsers.map((user) => (
              <span
                key={user.id}
                className="inline-flex items-center gap-1.5 bg-zinc-900 border border-zinc-800 rounded-full pl-2.5 pr-1.5 py-1 text-xs text-zinc-300"
              >
                {user.firstName} {user.lastName}
                <button
                  onClick={() => setSelectedUsers((prev) => prev.filter((u) => u.id !== user.id))}
                  className="p-0.5 rounded-full hover:bg-zinc-700 transition-colors"
                >
                  <X size={10} />
                </button>
              </span>
            ))}
          </div>
        </div>
      )}

      {selectedUsers.length === 0 && !search && (
        <p className="text-xs text-zinc-600 text-center py-4">Search to add recipients</p>
      )}
    </div>
  );
}

// ── Compose form ───────────────────────────────────────────────────────────────

function ComposeForm({
  titleVal, setTitle,
  bodyVal, setBody,
  titleAlVal, setTitleAl,
  bodyAlVal, setBodyAl,
  imageUrlVal, setImageUrl,
  category, setCategory,
  timeSensitive, setTimeSensitive,
}: {
  titleVal: string; setTitle: (v: string) => void;
  bodyVal: string; setBody: (v: string) => void;
  titleAlVal: string; setTitleAl: (v: string) => void;
  bodyAlVal: string; setBodyAl: (v: string) => void;
  imageUrlVal: string; setImageUrl: (v: string) => void;
  category: string; setCategory: (v: string) => void;
  timeSensitive: boolean; setTimeSensitive: (v: boolean) => void;
}) {
  return (
    <div className="space-y-4">
      <Input
        label="Title"
        value={titleVal}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="e.g., Weekend special offer!"
      />
      <div>
        <label className="block text-sm font-medium text-zinc-400 mb-1.5">Message</label>
        <textarea
          value={bodyVal}
          onChange={(e) => setBody(e.target.value)}
          placeholder="What do you want to say?"
          className="w-full bg-[#09090b] border border-zinc-800 rounded-lg px-3 py-2 text-white placeholder-zinc-600 text-sm resize-none h-20 focus:outline-none focus:ring-1 focus:ring-violet-500"
        />
      </div>

      <PushPreview title={titleVal} body={bodyVal} />

      <Collapsible label="Albanian translation (optional)">
        <Input
          label="Title (Albanian)"
          value={titleAlVal}
          onChange={(e) => setTitleAl(e.target.value)}
          placeholder="Titulli shqip..."
        />
        <div>
          <label className="block text-sm font-medium text-zinc-400 mb-1.5">Message (Albanian)</label>
          <textarea
            value={bodyAlVal}
            onChange={(e) => setBodyAl(e.target.value)}
            placeholder="Mesazhi shqip..."
            className="w-full bg-[#09090b] border border-zinc-800 rounded-lg px-3 py-2 text-white placeholder-zinc-600 text-sm resize-none h-20 focus:outline-none focus:ring-1 focus:ring-violet-500"
          />
        </div>
      </Collapsible>

      <Collapsible label="Advanced options (image, category, time-sensitive)">
        <Input
          label="Image URL"
          value={imageUrlVal}
          onChange={(e) => setImageUrl(e.target.value)}
          placeholder="https://example.com/image.png"
        />
        <div>
          <label className="block text-sm font-medium text-zinc-400 mb-1.5">Category</label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full bg-[#09090b] border border-zinc-800 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-1 focus:ring-violet-500"
          >
            {CAMPAIGN_CATEGORY_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={timeSensitive}
            onChange={(e) => setTimeSensitive(e.target.checked)}
            className="w-4 h-4 rounded border-zinc-700 bg-[#09090b] text-violet-600 focus:ring-violet-500"
          />
          <span className="text-sm text-zinc-400 flex items-center gap-1.5">
            <Zap size={13} className="text-violet-400" />
            Time-sensitive — bypasses iOS Focus/DND
          </span>
        </label>
      </Collapsible>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────────

export default function NotificationsPage() {
  const [activeTab, setActiveTab] = useState<Tab>("campaigns");

  // Campaign state
  const [showCreate, setShowCreate] = useState(false);
  const [showDetail, setShowDetail] = useState<Campaign | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<Campaign | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [searchTerm, setSearchTerm] = useState("");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [titleAl, setTitleAl] = useState("");
  const [bodyAl, setBodyAl] = useState("");
  const [campaignImageUrl, setCampaignImageUrl] = useState("");
  const [campaignCategory, setCampaignCategory] = useState("");
  const [campaignTimeSensitive, setCampaignTimeSensitive] = useState(false);
  const [campaignRelevanceScore, setCampaignRelevanceScore] = useState("");
  const [queryGroup, setQueryGroup] = useState<RuleGroup>(createDefaultGroup());
  const [previewCount, setPreviewCount] = useState<number | null>(null);
  const [previewUsers, setPreviewUsers] = useState<UserItem[]>([]);
  const [sendingId, setSendingId] = useState<string | null>(null);
  const [campaignPromoId, setCampaignPromoId] = useState<string>("");
  const [newPromoType, setNewPromoType] = useState<"FREE_DELIVERY" | "FIXED_AMOUNT" | "PERCENTAGE">("PERCENTAGE");
  const [newPromoValue, setNewPromoValue] = useState("");
  const [newPromoName, setNewPromoName] = useState("");
  const [newPromoExpiry, setNewPromoExpiry] = useState("");

  // Direct send state
  const [directTitle, setDirectTitle] = useState("");
  const [directBody, setDirectBody] = useState("");
  const [directTitleAl, setDirectTitleAl] = useState("");
  const [directBodyAl, setDirectBodyAl] = useState("");
  const [directSearch, setDirectSearch] = useState("");
  const [selectedUsers, setSelectedUsers] = useState<UserItem[]>([]);
  const [directSent, setDirectSent] = useState<{ success: boolean; successCount: number; failureCount: number } | null>(null);
  const [directImageUrl, setDirectImageUrl] = useState("");
  const [directTimeSensitive, setDirectTimeSensitive] = useState(false);
  const [directCategory, setDirectCategory] = useState("");
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("ALL");

  // Promotions state
  const [selectedPromotion, setSelectedPromotion] = useState<string>("");
  const [promoUsers, setPromoUsers] = useState<UserItem[]>([]);
  const [promoSearch, setPromoSearch] = useState("");
  const [promoRoleFilter, setPromoRoleFilter] = useState<RoleFilter>("ALL");
  const [promoNotifTitle, setPromoNotifTitle] = useState("");
  const [promoNotifBody, setPromoNotifBody] = useState("");
  const [promoImageUrl, setPromoImageUrl] = useState("");
  const [promoSent, setPromoSent] = useState<{ success: boolean; count: number } | null>(null);

  // Recovery state
  const [recoveryType, setRecoveryType] = useState<PromotionType>(PromotionType.FreeDelivery);
  const [recoveryAmount, setRecoveryAmount] = useState("");
  const [recoveryReason, setRecoveryReason] = useState("");
  const [recoveryExpiry, setRecoveryExpiry] = useState("");
  const [recoveryUsers, setRecoveryUsers] = useState<UserItem[]>([]);
  const [recoverySearch, setRecoverySearch] = useState("");
  const [recoveryRoleFilter, setRecoveryRoleFilter] = useState<RoleFilter>("CUSTOMER");
  const [recoverySent, setRecoverySent] = useState<{ success: boolean; count: number } | null>(null);
  const [recoverySendNotif, setRecoverySendNotif] = useState(true);
  const [recoveryNotifTitle, setRecoveryNotifTitle] = useState("");
  const [recoveryNotifBody, setRecoveryNotifBody] = useState("");

  // Queries & Mutations
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
  const [issueRecoveryMut, { loading: issuingRecovery }] = useMutation(ISSUE_RECOVERY_PROMOTION);
  const [createPromotionMut, { loading: creatingPromo }] = useMutation(CREATE_PROMOTION);

  // Computed
  const stats = useMemo(() => ({
    total: campaigns.length,
    draft: campaigns.filter((c) => c.status === "DRAFT").length,
    sent: campaigns.filter((c) => c.status === "SENT").length,
    failed: campaigns.filter((c) => c.status === "FAILED").length,
  }), [campaigns]);

  const filteredCampaigns = useMemo(() => {
    let list = campaigns;
    if (statusFilter !== "ALL") list = list.filter((c) => c.status === statusFilter);
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      list = list.filter((c) => c.title.toLowerCase().includes(term) || c.body.toLowerCase().includes(term));
    }
    return [...list].reverse();
  }, [campaigns, statusFilter, searchTerm]);

  // Handlers
  const handlePreview = async () => {
    try {
      const { data } = await previewAudience({ variables: { query: queryGroup } });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = (data as any)?.previewCampaignAudience;
      if (result) { setPreviewCount(result.count); setPreviewUsers(result.sampleUsers || []); }
    } catch (err) { console.error("Preview failed:", err); }
  };

  const resetCreateForm = () => {
    setTitle(""); setBody(""); setTitleAl(""); setBodyAl("");
    setCampaignImageUrl(""); setCampaignCategory(""); setCampaignTimeSensitive(false);
    setCampaignRelevanceScore(""); setPreviewCount(null); setPreviewUsers([]);
    setQueryGroup(createDefaultGroup()); setCampaignPromoId("");
    setNewPromoType("PERCENTAGE"); setNewPromoValue(""); setNewPromoName(""); setNewPromoExpiry("");
  };

  const handleCreate = async () => {
    if (!title.trim() || !body.trim()) return;
    try {
      const { data: createData } = await createCampaign({
        variables: {
          input: {
            title: title.trim(), body: body.trim(),
            titleAl: titleAl.trim() || undefined, bodyAl: bodyAl.trim() || undefined,
            imageUrl: campaignImageUrl.trim() || undefined,
            category: campaignCategory || undefined,
            timeSensitive: campaignTimeSensitive,
            relevanceScore: campaignRelevanceScore.trim() ? Number(campaignRelevanceScore) : undefined,
            query: queryGroup,
          },
        },
      });
      // If a promotion was selected, immediately send the campaign so we can attach the promotion
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const newId = (createData as any)?.createCampaign?.id;
      if (newId && campaignPromoId) {
        await sendCampaignMut({ variables: { id: newId, promotionId: campaignPromoId } });
      }
      setShowCreate(false);
      resetCreateForm();
      refetch();
    } catch (err) { console.error("Create failed:", err); }
  };

  const handleSend = async (id: string) => {
    setSendingId(id);
    try { await sendCampaignMut({ variables: { id } }); refetch(); }
    catch (err) { console.error("Send failed:", err); }
    finally { setSendingId(null); }
  };

  const handleDelete = async (id: string) => {
    try { await deleteCampaignMut({ variables: { id } }); setShowDeleteConfirm(null); refetch(); }
    catch (err) { console.error("Delete failed:", err); }
  };

  const handleDuplicate = (campaign: Campaign) => {
    setTitle(campaign.title); setBody(campaign.body);
    setTitleAl(campaign.titleAl || ""); setBodyAl(campaign.bodyAl || "");
    setCampaignImageUrl(campaign.imageUrl || ""); setCampaignCategory(campaign.category || "");
    setCampaignTimeSensitive(campaign.timeSensitive);
    setCampaignRelevanceScore(campaign.relevanceScore != null ? String(campaign.relevanceScore) : "");
    if (campaign.query) setQueryGroup(campaign.query as unknown as RuleGroup);
    setPreviewCount(null); setPreviewUsers([]); setCampaignPromoId("");
    setShowDetail(null); setShowCreate(true);
  };

  const handleDirectSend = async () => {
    if (!directTitle.trim() || !directBody.trim() || selectedUsers.length === 0) return;
    try {
      const { data } = await sendPushMut({
        variables: {
          input: {
            userIds: selectedUsers.map((u) => u.id),
            title: directTitle.trim(), body: directBody.trim(),
            titleAl: directTitleAl.trim() || undefined, bodyAl: directBodyAl.trim() || undefined,
            imageUrl: directImageUrl.trim() || undefined,
            timeSensitive: directTimeSensitive,
            category: directCategory || undefined,
          },
        },
      });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = (data as any)?.sendPushNotification;
      if (result) { setDirectSent(result); setTimeout(() => setDirectSent(null), 5000); }
      setDirectTitle(""); setDirectBody(""); setDirectTitleAl(""); setDirectBodyAl("");
      setDirectImageUrl(""); setDirectTimeSensitive(false); setDirectCategory("");
      setSelectedUsers([]);
    } catch (err) { console.error("Direct send failed:", err); }
  };

  const handleRecoveryIssue = async () => {
    if (!recoveryReason.trim() || recoveryUsers.length === 0) return;
    if (recoveryType !== "FREE_DELIVERY" && !recoveryAmount.trim()) return;
    try {
      const expiresAt = recoveryExpiry
        ? new Date(recoveryExpiry).toISOString()
        : undefined;
      const { data } = await issueRecoveryMut({
        variables: {
          input: {
            type: recoveryType,
            discountValue: recoveryAmount.trim() ? Number(recoveryAmount) : undefined,
            userIds: recoveryUsers.map((u) => u.id),
            reason: recoveryReason.trim(),
            expiresAt,
          },
        },
      });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const count = ((data as any)?.issueRecoveryPromotion || []).length;
      if (recoverySendNotif && recoveryNotifTitle.trim() && recoveryNotifBody.trim()) {
        await sendPushMut({
          variables: {
            input: {
              userIds: recoveryUsers.map((u) => u.id),
              title: recoveryNotifTitle.trim(),
              body: recoveryNotifBody.trim(),
              category: "promotion",
            },
          },
        });
      }
      setRecoverySent({ success: true, count });
      setTimeout(() => setRecoverySent(null), 6000);
      setRecoveryUsers([]); setRecoveryReason(""); setRecoveryAmount(""); setRecoveryExpiry("");
      setRecoveryNotifTitle(""); setRecoveryNotifBody("");
    } catch (err) {
      console.error("Recovery issue failed:", err);
      setRecoverySent({ success: false, count: 0 });
      setTimeout(() => setRecoverySent(null), 5000);
    }
  };

  const handlePromoAssign = async () => {
    if (!selectedPromotion || promoUsers.length === 0) return;
    try {
      const { data } = await assignPromotionMut({
        variables: { input: { promotionId: selectedPromotion, userIds: promoUsers.map((u) => u.id) } },
      });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const count = ((data as any)?.assignPromotionToUsers || []).length;
      if (promoNotifTitle.trim() && promoNotifBody.trim()) {
        await sendPushMut({
          variables: {
            input: {
              userIds: promoUsers.map((u) => u.id),
              title: promoNotifTitle.trim(), body: promoNotifBody.trim(),
              imageUrl: promoImageUrl.trim() || undefined, category: "promotion",
            },
          },
        });
      }
      setPromoSent({ success: true, count });
      setTimeout(() => setPromoSent(null), 5000);
      setSelectedPromotion(""); setPromoUsers([]);
      setPromoNotifTitle(""); setPromoNotifBody(""); setPromoImageUrl("");
    } catch (err) {
      console.error("Promo assign failed:", err);
      setPromoSent({ success: false, count: 0 });
      setTimeout(() => setPromoSent(null), 5000);
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold text-white">Push Notifications</h1>
          <p className="text-sm text-zinc-500 mt-0.5">Send targeted campaigns or direct messages to users</p>
        </div>
        {activeTab === "campaigns" && (
          <Button onClick={() => { resetCreateForm(); setShowCreate(true); }}>
            <Plus size={15} className="mr-1.5" />
            New Campaign
          </Button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-zinc-800">
        {([
          { id: "campaigns" as const,  label: "Campaigns",        icon: Megaphone,       badge: stats.draft },
          { id: "direct" as const,     label: "Direct Send",      icon: Send,            badge: 0 },
          { id: "promotions" as const, label: "Assign Promotion", icon: Gift,            badge: 0 },
          { id: "recovery" as const,   label: "Recovery",         icon: HeartHandshake,  badge: 0 },
        ]).map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 -mb-px transition-colors ${
              activeTab === tab.id
                ? "border-violet-500 text-white"
                : "border-transparent text-zinc-500 hover:text-zinc-300"
            }`}
          >
            <tab.icon size={14} />
            {tab.label}
            {tab.badge > 0 && (
              <span className="bg-violet-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full leading-none">
                {tab.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── CAMPAIGNS TAB ── */}
      {activeTab === "campaigns" && (
        <div className="space-y-4">
          {/* Stats + search row */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 text-sm text-zinc-500">
              <span><span className="text-white font-medium">{stats.total}</span> total</span>
              <span className="text-zinc-700">·</span>
              <span><span className="text-zinc-300 font-medium">{stats.draft}</span> drafts</span>
              <span className="text-zinc-700">·</span>
              <span><span className="text-green-400 font-medium">{stats.sent}</span> sent</span>
              {stats.failed > 0 && (
                <>
                  <span className="text-zinc-700">·</span>
                  <span><span className="text-red-400 font-medium">{stats.failed}</span> failed</span>
                </>
              )}
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search campaigns..."
                  className="bg-zinc-900 border border-zinc-800 rounded-lg pl-8 pr-3 py-1.5 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-violet-600 w-52"
                />
              </div>
              <div className="flex bg-zinc-900 border border-zinc-800 rounded-lg p-0.5 gap-0.5">
                {(["ALL", "DRAFT", "SENT", "FAILED"] as StatusFilter[]).map((s) => (
                  <button
                    key={s}
                    onClick={() => setStatusFilter(s)}
                    className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                      statusFilter === s ? "bg-zinc-700 text-white" : "text-zinc-500 hover:text-zinc-300"
                    }`}
                  >
                    {s === "ALL" ? "All" : s.charAt(0) + s.slice(1).toLowerCase()}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <Table>
            <thead>
              <tr>
                <Th>Campaign</Th>
                <Th>Status</Th>
                <Th>Target</Th>
                <Th>Delivered</Th>
                <Th>Created</Th>
                <Th className="text-right">Actions</Th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <Td colSpan={6}>
                    <p className="text-center text-zinc-600 py-10 text-sm animate-pulse">Loading...</p>
                  </Td>
                </tr>
              )}
              {!loading && filteredCampaigns.length === 0 && (
                <tr>
                  <Td colSpan={6}>
                    <div className="text-center py-12">
                      <Megaphone size={30} className="text-zinc-800 mx-auto mb-3" />
                      <p className="text-zinc-500 text-sm">
                        {searchTerm || statusFilter !== "ALL"
                          ? "No campaigns match your filters"
                          : "No campaigns yet — create your first one"}
                      </p>
                    </div>
                  </Td>
                </tr>
              )}
              {filteredCampaigns.map((campaign) => (
                <tr
                  key={campaign.id}
                  className="border-t border-zinc-800 hover:bg-zinc-900/40 transition-colors cursor-pointer"
                  onClick={() => setShowDetail(campaign)}
                >
                  <Td>
                    <div className="max-w-[300px]">
                      <p className="font-medium text-white truncate">{campaign.title}</p>
                      <p className="text-xs text-zinc-500 mt-0.5 truncate">{campaign.body}</p>
                    </div>
                  </Td>
                  <Td><StatusBadge status={campaign.status} /></Td>
                  <Td><span className="text-zinc-400 text-sm">{campaign.targetCount.toLocaleString()}</span></Td>
                  <Td>
                    <div className="flex items-center gap-2 text-xs">
                      <span className="text-green-400">{campaign.sentCount}</span>
                      {campaign.failedCount > 0 && <span className="text-red-400">/ {campaign.failedCount} failed</span>}
                    </div>
                  </Td>
                  <Td>
                    <span className="text-zinc-500 text-xs">
                      {new Date(campaign.createdAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
                    </span>
                  </Td>
                  <Td>
                    <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                      {campaign.status === "DRAFT" && (
                        <>
                          <Button size="sm" onClick={() => handleSend(campaign.id)} disabled={sendingId === campaign.id || sending}>
                            <Send size={12} className="mr-1" />
                            {sendingId === campaign.id ? "Sending..." : "Send"}
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => setShowDeleteConfirm(campaign)}>
                            <Trash2 size={12} />
                          </Button>
                        </>
                      )}
                      <Button size="sm" variant="outline" onClick={() => handleDuplicate(campaign)} title="Duplicate">
                        <Copy size={12} />
                      </Button>
                    </div>
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        </div>
      )}

      {/* ── DIRECT SEND TAB ── */}
      {activeTab === "direct" && (
        <div className="grid grid-cols-2 gap-8">
          <div className="space-y-5">
            <div>
              <h2 className="text-sm font-medium text-zinc-300 mb-0.5">Message</h2>
              <p className="text-xs text-zinc-500 mb-4">Write what you want to send</p>
              <ComposeForm
                titleVal={directTitle} setTitle={setDirectTitle}
                bodyVal={directBody} setBody={setDirectBody}
                titleAlVal={directTitleAl} setTitleAl={setDirectTitleAl}
                bodyAlVal={directBodyAl} setBodyAl={setDirectBodyAl}
                imageUrlVal={directImageUrl} setImageUrl={setDirectImageUrl}
                category={directCategory} setCategory={setDirectCategory}
                timeSensitive={directTimeSensitive} setTimeSensitive={setDirectTimeSensitive}
              />
            </div>
            <Button
              onClick={handleDirectSend}
              disabled={sendingDirect || !directTitle.trim() || !directBody.trim() || selectedUsers.length === 0}
              className="w-full"
            >
              <Send size={14} className="mr-2" />
              {sendingDirect ? "Sending..." : selectedUsers.length === 0
                ? "Select recipients first →"
                : `Send to ${selectedUsers.length} user${selectedUsers.length !== 1 ? "s" : ""}`}
            </Button>
            {directSent && (
              <div className={`rounded-lg p-3 text-sm border ${directSent.success ? "bg-green-950 border-green-900 text-green-300" : "bg-red-950 border-red-900 text-red-300"}`}>
                {directSent.success
                  ? `Sent! ${directSent.successCount} delivered${directSent.failureCount > 0 ? `, ${directSent.failureCount} failed` : ""}.`
                  : "Failed to send. Please try again."}
              </div>
            )}
          </div>

          <div className="border border-zinc-800 rounded-xl p-5 bg-zinc-900/20">
            <h2 className="text-sm font-medium text-zinc-300 mb-0.5">Recipients</h2>
            <p className="text-xs text-zinc-500 mb-4">Search and add the people you want to reach</p>
            <UserPicker
              allUsers={allUsers}
              selectedUsers={selectedUsers}
              setSelectedUsers={setSelectedUsers}
              search={directSearch}
              setSearch={setDirectSearch}
              roleFilter={roleFilter}
              setRoleFilter={setRoleFilter}
              onSelectAll={() => setSelectedUsers(allUsers.filter((u) => u.role === "CUSTOMER"))}
            />
          </div>
        </div>
      )}

      {/* ── PROMOTIONS TAB ── */}
      {activeTab === "promotions" && (
        <div className="grid grid-cols-2 gap-8">
          <div className="space-y-6">
            {/* Step 1 */}
            <div>
              <p className="text-xs text-zinc-600 mb-1">Step 1</p>
              <h2 className="text-sm font-medium text-zinc-300 mb-3">Choose a promotion</h2>
              <select
                value={selectedPromotion}
                onChange={(e) => setSelectedPromotion(e.target.value)}
                className="w-full bg-[#09090b] border border-zinc-800 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-violet-500"
              >
                <option value="">Select a promotion...</option>
                {allPromotions.filter((p) => p.isActive).map((promo) => (
                  <option key={promo.id} value={promo.id}>
                    {promo.code ? `${promo.code} — ` : ""}{promo.name} ({promo.type === "PERCENTAGE" ? `${promo.discountValue}%` : `€${promo.discountValue} off`})
                  </option>
                ))}
              </select>
              {selectedPromotion && (() => {
                const promo = allPromotions.find((p) => p.id === selectedPromotion);
                return promo?.description ? (
                  <p className="text-xs text-zinc-500 mt-2">{promo.description}</p>
                ) : null;
              })()}
            </div>

            {/* Step 2 */}
            <div>
              <p className="text-xs text-zinc-600 mb-1">Step 2</p>
              <h2 className="text-sm font-medium text-zinc-300 mb-0.5">Notify users <span className="text-zinc-600 font-normal text-xs">(optional)</span></h2>
              <p className="text-xs text-zinc-500 mb-3">Include a push notification with the promotion</p>
              <div className="space-y-3">
                <Input
                  label="Notification title"
                  value={promoNotifTitle}
                  onChange={(e) => setPromoNotifTitle(e.target.value)}
                  placeholder="🎉 You have a new promotion!"
                />
                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-1.5">Message</label>
                  <textarea
                    value={promoNotifBody}
                    onChange={(e) => setPromoNotifBody(e.target.value)}
                    placeholder="Check out your exclusive offer..."
                    className="w-full bg-[#09090b] border border-zinc-800 rounded-lg px-3 py-2 text-white placeholder-zinc-600 text-sm resize-none h-20 focus:outline-none focus:ring-1 focus:ring-violet-500"
                  />
                </div>
                <PushPreview title={promoNotifTitle} body={promoNotifBody} />
                <Collapsible label="Image URL (optional)">
                  <Input
                    label="Image URL"
                    value={promoImageUrl}
                    onChange={(e) => setPromoImageUrl(e.target.value)}
                    placeholder="https://example.com/promo.png"
                  />
                </Collapsible>
              </div>
            </div>

            <Button
              onClick={handlePromoAssign}
              disabled={assigningPromo || !selectedPromotion || promoUsers.length === 0}
              className="w-full"
            >
              <Gift size={14} className="mr-2" />
              {assigningPromo ? "Assigning..." : promoUsers.length === 0
                ? "Select users first →"
                : `Assign to ${promoUsers.length} user${promoUsers.length !== 1 ? "s" : ""}`}
            </Button>

            {promoSent && (
              <div className={`rounded-lg p-3 text-sm border ${promoSent.success ? "bg-green-950 border-green-900 text-green-300" : "bg-red-950 border-red-900 text-red-300"}`}>
                {promoSent.success
                  ? `Done! Assigned to ${promoSent.count} user${promoSent.count !== 1 ? "s" : ""}.${promoNotifTitle ? " Notification sent." : ""}`
                  : "Failed to assign. Please try again."}
              </div>
            )}
          </div>

          <div className="border border-zinc-800 rounded-xl p-5 bg-zinc-900/20">
            <p className="text-xs text-zinc-600 mb-1">Step 3</p>
            <h2 className="text-sm font-medium text-zinc-300 mb-0.5">Select users</h2>
            <p className="text-xs text-zinc-500 mb-4">Who should receive this promotion?</p>
            <UserPicker
              allUsers={allUsers}
              selectedUsers={promoUsers}
              setSelectedUsers={setPromoUsers}
              search={promoSearch}
              setSearch={setPromoSearch}
              roleFilter={promoRoleFilter}
              setRoleFilter={setPromoRoleFilter}
              onSelectAll={() => setPromoUsers(allUsers.filter((u) => u.role === "CUSTOMER"))}
            />
          </div>
        </div>
      )}

      {/* ── RECOVERY TAB ── */}
      {activeTab === "recovery" && (
        <div className="grid grid-cols-2 gap-8">
          {/* Left: compensation details */}
          <div className="space-y-6">
            <div>
              <h2 className="text-sm font-medium text-zinc-300 mb-0.5">Issue Compensation</h2>
              <p className="text-xs text-zinc-500 mb-4">Create a one-time, user-specific discount for affected customers. Recovery promotions are hidden from the main promotions list.</p>
            </div>

            {/* Type */}
            <div>
              <label className="block text-xs text-zinc-500 mb-2">Compensation type</label>
              <div className="grid grid-cols-3 gap-2">
                {([
                  { value: "FREE_DELIVERY", label: "Free Delivery" },
                  { value: "FIXED_AMOUNT", label: "Fixed Amount" },
                  { value: "PERCENTAGE", label: "Percentage" },
                ] as const).map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setRecoveryType(opt.value as PromotionType)}
                    className={`py-2 px-3 rounded-lg border text-sm font-medium transition-colors ${
                      recoveryType === opt.value
                        ? "border-violet-500 bg-violet-950 text-violet-300"
                        : "border-zinc-800 bg-zinc-900 text-zinc-400 hover:border-zinc-600"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Amount — not needed for FREE_DELIVERY */}
            {recoveryType !== "FREE_DELIVERY" && (
              <div>
                <label className="block text-xs text-zinc-500 mb-2">
                  {recoveryType === "PERCENTAGE" ? "Discount (%)" : "Amount (€)"}
                </label>
                <input
                  type="number"
                  min="0"
                  max={recoveryType === "PERCENTAGE" ? "100" : undefined}
                  step="0.5"
                  value={recoveryAmount}
                  onChange={(e) => setRecoveryAmount(e.target.value)}
                  placeholder={recoveryType === "PERCENTAGE" ? "e.g., 10" : "e.g., 2.00"}
                  className="w-full bg-[#09090b] border border-zinc-800 rounded-lg px-3 py-2.5 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-violet-500"
                />
              </div>
            )}

            {/* Reason */}
            <div>
              <label className="block text-xs text-zinc-500 mb-2">Reason <span className="text-zinc-700">(internal note)</span></label>
              <input
                type="text"
                value={recoveryReason}
                onChange={(e) => setRecoveryReason(e.target.value)}
                placeholder="e.g., Order #1234 was 45 min late"
                className="w-full bg-[#09090b] border border-zinc-800 rounded-lg px-3 py-2.5 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-violet-500"
              />
            </div>

            {/* Expiry */}
            <div>
              <label className="block text-xs text-zinc-500 mb-2">Expires at <span className="text-zinc-700">(optional, defaults to 30 days)</span></label>
              <input
                type="date"
                value={recoveryExpiry}
                onChange={(e) => setRecoveryExpiry(e.target.value)}
                className="w-full bg-[#09090b] border border-zinc-800 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-violet-500 [color-scheme:dark]"
              />
            </div>

            {/* Optional push notification */}
            <div>
              <label className="flex items-center gap-2 cursor-pointer mb-3">
                <input
                  type="checkbox"
                  checked={recoverySendNotif}
                  onChange={(e) => setRecoverySendNotif(e.target.checked)}
                  className="w-4 h-4 rounded border-zinc-700 bg-[#09090b] text-violet-600 focus:ring-violet-500"
                />
                <span className="text-sm text-zinc-400">Also send a push notification</span>
              </label>
              {recoverySendNotif && (
                <div className="space-y-3 pl-6">
                  <input
                    type="text"
                    value={recoveryNotifTitle}
                    onChange={(e) => setRecoveryNotifTitle(e.target.value)}
                    placeholder="Notification title, e.g. We owe you one 🙏"
                    className="w-full bg-[#09090b] border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-violet-500"
                  />
                  <textarea
                    value={recoveryNotifBody}
                    onChange={(e) => setRecoveryNotifBody(e.target.value)}
                    placeholder="We've added a compensation to your account..."
                    className="w-full bg-[#09090b] border border-zinc-800 rounded-lg px-3 py-2 text-white placeholder-zinc-600 text-sm resize-none h-16 focus:outline-none focus:ring-1 focus:ring-violet-500"
                  />
                  <PushPreview title={recoveryNotifTitle} body={recoveryNotifBody} />
                </div>
              )}
            </div>

            <Button
              onClick={handleRecoveryIssue}
              disabled={
                issuingRecovery ||
                !recoveryReason.trim() ||
                recoveryUsers.length === 0 ||
                (recoveryType !== "FREE_DELIVERY" && !recoveryAmount.trim())
              }
              className="w-full"
            >
              <HeartHandshake size={14} className="mr-2" />
              {issuingRecovery
                ? "Issuing..."
                : recoveryUsers.length === 0
                  ? "Select users first →"
                  : `Issue compensation to ${recoveryUsers.length} user${recoveryUsers.length !== 1 ? "s" : ""}`}
            </Button>

            {recoverySent && (
              <div className={`rounded-lg p-3 text-sm border ${recoverySent.success ? "bg-green-950 border-green-900 text-green-300" : "bg-red-950 border-red-900 text-red-300"}`}>
                {recoverySent.success
                  ? `Done! Compensation issued to ${recoverySent.count} user${recoverySent.count !== 1 ? "s" : ""}.${recoverySendNotif && recoveryNotifTitle ? " Notification sent." : ""}`
                  : "Failed to issue compensation. Please try again."}
              </div>
            )}
          </div>

          {/* Right: user picker */}
          <div className="border border-zinc-800 rounded-xl p-5 bg-zinc-900/20">
            <h2 className="text-sm font-medium text-zinc-300 mb-0.5">Affected customers</h2>
            <p className="text-xs text-zinc-500 mb-4">Search and add the users to compensate (one-time use each)</p>
            <UserPicker
              allUsers={allUsers}
              selectedUsers={recoveryUsers}
              setSelectedUsers={setRecoveryUsers}
              search={recoverySearch}
              setSearch={setRecoverySearch}
              roleFilter={recoveryRoleFilter}
              setRoleFilter={setRecoveryRoleFilter}
            />
          </div>
        </div>
      )}

      {/* ── CREATE CAMPAIGN MODAL ── */}
      <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title="New Campaign" size="xl">
        <div className="grid grid-cols-2 gap-6">
          {/* Left: message */}
          <div className="space-y-4 overflow-y-auto max-h-[65vh] pr-1">
            <div>
              <p className="text-xs text-zinc-500 mb-3">Write your notification content</p>
              <ComposeForm
                titleVal={title} setTitle={setTitle}
                bodyVal={body} setBody={setBody}
                titleAlVal={titleAl} setTitleAl={setTitleAl}
                bodyAlVal={bodyAl} setBodyAl={setBodyAl}
                imageUrlVal={campaignImageUrl} setImageUrl={setCampaignImageUrl}
                category={campaignCategory} setCategory={setCampaignCategory}
                timeSensitive={campaignTimeSensitive} setTimeSensitive={setCampaignTimeSensitive}
              />
            </div>
            <Collapsible label="iOS relevance score (0.0 – 1.0)">
              <Input
                label="Relevance Score"
                type="number"
                min="0" max="1" step="0.1"
                value={campaignRelevanceScore}
                onChange={(e) => setCampaignRelevanceScore(e.target.value)}
                placeholder="e.g., 0.8"
              />
            </Collapsible>
          </div>

          {/* Right: audience */}
          <div className="space-y-4 overflow-y-auto max-h-[65vh] pr-1">
            <div>
              <p className="text-xs text-zinc-500 mb-3">Choose who receives this campaign</p>

              {/* Preset pills */}
              <div className="flex flex-wrap gap-1.5 mb-4">
                {AUDIENCE_PRESETS.map((preset) => (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => { setQueryGroup(preset.build()); setPreviewCount(null); setPreviewUsers([]); }}
                    className="px-2.5 py-1 rounded-md border border-zinc-800 bg-zinc-900 text-xs text-zinc-400 hover:text-white hover:border-zinc-600 transition-colors"
                  >
                    {preset.label}
                  </button>
                ))}
              </div>

              <QueryBuilder value={queryGroup} onChange={setQueryGroup} />
            </div>

            {/* Attach promotion */}
            <div className="border border-zinc-800 rounded-xl p-4 space-y-3 bg-zinc-950">
              <div className="flex items-center gap-2">
                <Gift size={14} className="text-violet-400" />
                <span className="text-xs font-medium text-zinc-300">Attach a promotion <span className="text-zinc-600 font-normal">(optional)</span></span>
              </div>
              <p className="text-[11px] text-zinc-600 leading-relaxed">
                Create a temporary promotion — it will be assigned to every matched user when this campaign sends.
              </p>
              <Input
                label="Promotion name"
                value={newPromoName}
                onChange={(e) => setNewPromoName(e.target.value)}
                placeholder="e.g., Weekend 20% off"
              />
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1.5">Type</label>
                  <select
                    value={newPromoType}
                    onChange={(e) => setNewPromoType(e.target.value as typeof newPromoType)}
                    className="w-full bg-[#0f0f0f] border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-300 focus:outline-none focus:ring-1 focus:ring-violet-600"
                  >
                    <option value="PERCENTAGE">Percentage off</option>
                    <option value="FIXED_AMOUNT">Fixed amount off</option>
                    <option value="FREE_DELIVERY">Free delivery</option>
                  </select>
                </div>
                {newPromoType !== "FREE_DELIVERY" && (
                  <Input
                    label={newPromoType === "PERCENTAGE" ? "Discount %" : "Amount (€)"}
                    type="number"
                    min="0"
                    value={newPromoValue}
                    onChange={(e) => setNewPromoValue(e.target.value)}
                    placeholder={newPromoType === "PERCENTAGE" ? "e.g., 20" : "e.g., 5"}
                  />
                )}
              </div>
              <Input
                label="Expires at (optional)"
                type="date"
                value={newPromoExpiry}
                onChange={(e) => setNewPromoExpiry(e.target.value)}
              />
              {campaignPromoId ? (
                <div className="flex items-center gap-2 text-[11px] text-green-400 bg-green-950/40 border border-green-900/40 rounded-lg px-3 py-2">
                  <CheckCircle2 size={12} />
                  Promotion created — will be assigned on send
                  <button
                    type="button"
                    className="ml-auto text-zinc-600 hover:text-red-400 transition-colors"
                    onClick={() => { setCampaignPromoId(""); setNewPromoName(""); setNewPromoValue(""); setNewPromoExpiry(""); setNewPromoType("PERCENTAGE"); }}
                  >
                    <X size={12} />
                  </button>
                </div>
              ) : (
                newPromoName.trim() && (
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={creatingPromo || (newPromoType !== "FREE_DELIVERY" && !newPromoValue.trim())}
                    onClick={async () => {
                      try {
                        const { data } = await createPromotionMut({
                          variables: {
                            input: {
                              name: newPromoName.trim(),
                              type: newPromoType as PromotionType,
                              target: "ALL_USERS" as unknown as PromotionTarget,
                              discountValue: newPromoValue.trim() ? Number(newPromoValue) : undefined,
                              isActive: true,
                              isStackable: false,
                              priority: 1,
                              creatorType: "ADMIN" as unknown as PromotionCreatorType,
                              endsAt: newPromoExpiry ? new Date(newPromoExpiry).toISOString() : undefined,
                            },
                          },
                        });
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        const id = (data as any)?.createPromotion?.id;
                        if (id) setCampaignPromoId(id);
                      } catch (err) { console.error("Create promo failed:", err); }
                    }}
                  >
                    {creatingPromo ? "Creating..." : "Create promotion"}
                  </Button>
                )
              )}
              {campaignPromoId && (
                <div className="flex items-center gap-1.5 text-[11px] text-amber-400">
                  <Zap size={11} />
                  Campaign will be sent &amp; promotion assigned immediately on create
                </div>
              )}
            </div>

            {/* Preview audience */}
            <div className="space-y-3 pt-1">
              <div className="flex items-center gap-3">
                <Button size="sm" variant="outline" onClick={handlePreview} disabled={previewing}>
                  <Eye size={13} className="mr-1.5" />
                  {previewing ? "Checking..." : "Preview Audience"}
                </Button>
                {previewCount !== null && (
                  <span className="text-sm text-zinc-400">
                    <span className="text-white font-semibold">{previewCount.toLocaleString()}</span> users matched
                  </span>
                )}
              </div>

              {previewUsers.length > 0 && (
                <div className="border border-zinc-800 rounded-lg overflow-hidden">
                  <p className="text-[10px] text-zinc-600 px-3 py-1.5 border-b border-zinc-800">
                    Sample (up to 10)
                  </p>
                  <div className="divide-y divide-zinc-900">
                    {previewUsers.map((u) => (
                      <div key={u.id} className="px-3 py-2 flex items-center gap-2.5">
                        <div className="w-6 h-6 rounded-full bg-zinc-800 flex items-center justify-center text-[10px] text-zinc-400 flex-shrink-0">
                          {u.firstName[0]}{u.lastName[0]}
                        </div>
                        <span className="text-xs text-zinc-300">{u.firstName} {u.lastName}</span>
                        <span className="text-xs text-zinc-600 ml-auto">{u.email}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-4 mt-2 border-t border-zinc-800">
          <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
          <Button onClick={handleCreate} disabled={creating || sending || !title.trim() || !body.trim()}>
            {creating || sending ? "Working..." : campaignPromoId ? "Create & Send Campaign" : "Create Campaign"}
          </Button>
        </div>
      </Modal>

      {/* ── CAMPAIGN DETAIL MODAL ── */}
      <Modal
        isOpen={!!showDetail}
        onClose={() => setShowDetail(null)}
        title={showDetail?.title || "Campaign Details"}
      >
        {showDetail && (
          <div className="space-y-5">
            <div className="flex items-center gap-3">
              <StatusBadge status={showDetail.status} />
              <span className="text-xs text-zinc-500">
                Created {new Date(showDetail.createdAt).toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" })}
              </span>
            </div>

            <PushPreview title={showDetail.title} body={showDetail.body} />

            {(showDetail.category || showDetail.timeSensitive || showDetail.relevanceScore != null) && (
              <div className="flex flex-wrap gap-2">
                {showDetail.category && (
                  <span className="text-xs px-2 py-1 rounded-full bg-zinc-900 border border-zinc-800 text-zinc-400">
                    {showDetail.category}
                  </span>
                )}
                {showDetail.timeSensitive && (
                  <span className="text-xs px-2 py-1 rounded-full bg-violet-950 border border-violet-900 text-violet-300 flex items-center gap-1">
                    <Zap size={11} /> time-sensitive
                  </span>
                )}
                {showDetail.relevanceScore != null && (
                  <span className="text-xs px-2 py-1 rounded-full bg-zinc-900 border border-zinc-800 text-zinc-400">
                    relevance {showDetail.relevanceScore}
                  </span>
                )}
              </div>
            )}

            <div className="grid grid-cols-3 gap-3">
              {[
                { label: "Target", value: showDetail.targetCount, color: "text-white" },
                { label: "Sent", value: showDetail.sentCount, color: "text-green-400" },
                { label: "Failed", value: showDetail.failedCount, color: "text-red-400" },
              ].map((s) => (
                <div key={s.label} className="bg-zinc-900 border border-zinc-800 rounded-lg p-3 text-center">
                  <p className="text-xs text-zinc-500 mb-1">{s.label}</p>
                  <p className={`text-2xl font-bold ${s.color}`}>{s.value.toLocaleString()}</p>
                </div>
              ))}
            </div>

            {showDetail.sentAt && (
              <p className="text-xs text-zinc-500">Sent {new Date(showDetail.sentAt).toLocaleString("en-GB")}</p>
            )}

            {showDetail.query && (
              <details>
                <summary className="text-xs text-zinc-500 cursor-pointer hover:text-zinc-300 transition-colors select-none">
                  View audience query
                </summary>
                <pre className="mt-2 bg-zinc-900 border border-zinc-800 rounded-lg p-3 text-xs text-zinc-400 overflow-x-auto">
                  {JSON.stringify(showDetail.query, null, 2)}
                </pre>
              </details>
            )}

            <div className="flex justify-end gap-2 pt-3 border-t border-zinc-800">
              <Button variant="outline" onClick={() => handleDuplicate(showDetail)}>
                <Copy size={14} className="mr-1.5" />
                Duplicate
              </Button>
              {showDetail.status === "DRAFT" && (
                <>
                  <Button variant="outline" onClick={() => { setShowDetail(null); setShowDeleteConfirm(showDetail); }}>
                    <Trash2 size={14} className="mr-1.5" />
                    Delete
                  </Button>
                  <Button onClick={() => { handleSend(showDetail.id); setShowDetail(null); }} disabled={sending}>
                    <Send size={14} className="mr-1.5" />
                    Send Now
                  </Button>
                </>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* ── DELETE CONFIRM MODAL ── */}
      <Modal isOpen={!!showDeleteConfirm} onClose={() => setShowDeleteConfirm(null)} title="Delete Campaign">
        {showDeleteConfirm && (
          <div className="space-y-4">
            <p className="text-zinc-400 text-sm">
              Delete <strong className="text-white">&quot;{showDeleteConfirm.title}&quot;</strong>? This cannot be undone.
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowDeleteConfirm(null)}>Cancel</Button>
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
