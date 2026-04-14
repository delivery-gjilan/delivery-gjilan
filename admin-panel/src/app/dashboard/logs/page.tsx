'use client';

import { useState, useMemo } from 'react';
import { useQuery } from '@apollo/client/react';
import { ArrowLeft, Search, Filter, ChevronDown, Calendar, User, Activity } from 'lucide-react';
import Link from 'next/link';
import { GET_AUDIT_LOGS } from '@/graphql/operations/auditLogs/queries';
import { format, startOfDay, startOfMonth } from 'date-fns';

interface AuditLog {
    id: string;
    actorId?: string;
    actor?: {
        id: string;
        firstName: string;
        lastName: string;
        email: string;
        role: string;
    };
    actorType: string;
    action: string;
    entityType: string;
    entityId?: string;
    metadata?: AuditMetadata;
    ipAddress?: string;
    userAgent?: string;
    createdAt: string;
}

type AuditMetadataPrimitive = string | number | boolean | null;
type AuditMetadataValue = AuditMetadataPrimitive | AuditMetadataValue[] | { [key: string]: AuditMetadataValue };
type AuditMetadata = { [key: string]: AuditMetadataValue };

type AuditMetadataWithDiff = AuditMetadata & {
    oldValue?: AuditMetadata;
    newValue?: AuditMetadata;
    changedFields?: string[];
    amount?: number;
    type?: string;
    firstName?: string;
    lastName?: string;
    email?: string;
    role?: string;
    name?: string;
    category?: string;
    driverName?: string;
};

const ACTION_TYPES = [
    { value: '', label: 'All Actions' },
    { value: 'USER_CREATED', label: 'User Created' },
    { value: 'USER_UPDATED', label: 'User Updated' },
    { value: 'USER_DELETED', label: 'User Deleted' },
    { value: 'PRODUCT_CREATED', label: 'Product Created' },
    { value: 'PRODUCT_UPDATED', label: 'Product Updated' },
    { value: 'PRODUCT_DELETED', label: 'Product Deleted' },
    { value: 'PRODUCT_AVAILABILITY_CHANGED', label: 'Product Availability Changed' },
    { value: 'PRODUCT_PRICE_CHANGED', label: 'Product Price Changed' },
    { value: 'SETTLEMENT_PAID', label: 'Settlement Paid' },
    { value: 'SETTLEMENT_PARTIAL_PAID', label: 'Settlement Partial Paid' },
    { value: 'SETTLEMENT_UNSETTLED', label: 'Settlement Unsettled' },
    { value: 'ORDER_CREATED', label: 'Order Created' },
    { value: 'ORDER_STATUS_CHANGED', label: 'Order Status Changed' },
    { value: 'DRIVER_CREATED', label: 'Driver Created' },
    { value: 'DRIVER_STATUS_CHANGED', label: 'Driver Status Changed' },
];

const ENTITY_TYPES = [
    { value: '', label: 'All Entities' },
    { value: 'USER', label: 'User' },
    { value: 'PRODUCT', label: 'Product' },
    { value: 'ORDER', label: 'Order' },
    { value: 'SETTLEMENT', label: 'Settlement' },
    { value: 'DRIVER', label: 'Driver' },
    { value: 'BUSINESS', label: 'Business' },
    { value: 'CATEGORY', label: 'Category' },
];

const ACTOR_TYPES = [
    { value: '', label: 'All Actors' },
    { value: 'ADMIN', label: 'Admin' },
    { value: 'BUSINESS', label: 'Business' },
    { value: 'DRIVER', label: 'Driver' },
    { value: 'CUSTOMER', label: 'Customer' },
    { value: 'SYSTEM', label: 'System' },
];

export default function AuditLogsPage() {
    const [dateMode, setDateMode] = useState<'all' | 'today' | 'week' | 'month'>('month');
    const [actionFilter, setActionFilter] = useState('');
    const [entityFilter, setEntityFilter] = useState('');
    const [actorFilter, setActorFilter] = useState('');
    const [expandedLog, setExpandedLog] = useState<string | null>(null);
    const [page, setPage] = useState(0);
    const PAGE_SIZE = 50;

    // Calculate date range for query
    const getDateRange = () => {
        const now = new Date();
        const today = startOfDay(now);
        const monthStart = startOfMonth(now);

        switch (dateMode) {
            case 'today': {
                const startISO = today.toISOString();
                const endOfDay = new Date(today);
                endOfDay.setHours(23, 59, 59, 999);
                return { start: startISO, end: endOfDay.toISOString() };
            }
            case 'week': {
                const weekStart = new Date(today);
                weekStart.setDate(weekStart.getDate() - 7);
                return { start: weekStart.toISOString(), end: now.toISOString() };
            }
            case 'month': {
                return { start: monthStart.toISOString(), end: now.toISOString() };
            }
            default:
                return { start: '', end: '' };
        }
    };

    const { start: startDate, end: endDate } = getDateRange();

    // Fetch audit logs
    const { data, loading, refetch } = useQuery(GET_AUDIT_LOGS, {
        variables: {
            action: actionFilter || undefined,
            entityType: entityFilter || undefined,
            actorType: actorFilter || undefined,
            startDate: startDate || undefined,
            endDate: endDate || undefined,
            limit: PAGE_SIZE,
            offset: page * PAGE_SIZE,
        },
        fetchPolicy: 'network-only',
    });

    const logs: AuditLog[] = data?.auditLogs?.logs || [];
    const total = data?.auditLogs?.total || 0;
    const hasMore = data?.auditLogs?.hasMore || false;

    const formatAction = (action: string) => {
        return action.split('_').map(word => word.charAt(0) + word.slice(1).toLowerCase()).join(' ');
    };

    const getActionColor = (action: string) => {
        if (action.includes('DELETE')) return 'text-red-400';
        if (action.includes('CREATE')) return 'text-green-400';
        if (action.includes('UPDATE') || action.includes('CHANGE')) return 'text-yellow-400';
        if (action.includes('PAID') || action.includes('SETTLEMENT')) return 'text-violet-400';
        return 'text-zinc-500';
    };

    const getActorBadge = (actorType: string) => {
        const colors: Record<string, string> = {
            ADMIN: 'bg-purple-600',
            BUSINESS: 'bg-blue-600',
            DRIVER: 'bg-green-600',
            CUSTOMER: 'bg-orange-600',
            SYSTEM: 'bg-neutral-600',
        };
        return colors[actorType] || 'bg-neutral-600';
    };

    const formatMetadataPreview = (action: string, metadata: AuditLog['metadata']) => {
        if (!metadata) return null;
        const metadataData = metadata as AuditMetadataWithDiff;

        // User/Driver creation
        if (action === 'USER_CREATED' || action === 'DRIVER_CREATED') {
            const name = `${metadataData.firstName ?? ''} ${metadataData.lastName ?? ''}`.trim();
            return (
                <span className="text-zinc-400">
                    Created: <span className="text-white font-medium">{name}</span>
                    {metadataData.email && <span className="text-zinc-600"> ({metadataData.email})</span>}
                    {metadataData.role && <span className="text-violet-400"> â€¢ {metadataData.role}</span>}
                </span>
            );
        }

        // Business creation
        if (action === 'BUSINESS_CREATED') {
            return (
                <span className="text-zinc-400">
                    Created: <span className="text-white font-medium">{metadataData.name}</span>
                    {metadataData.category && <span className="text-zinc-600"> ({metadataData.category})</span>}
                </span>
            );
        }

        // Business updates
        if (action === 'BUSINESS_UPDATED') {
            const changes = [];
            
            if (metadataData.oldValue && metadataData.newValue) {
                if (metadataData.oldValue.name !== metadataData.newValue.name) {
                    changes.push(`Name: "${metadataData.oldValue.name}" â†’ "${metadataData.newValue.name}"`);
                }
                if (metadataData.oldValue.isOpen !== metadataData.newValue.isOpen) {
                    changes.push(`Status: ${metadataData.oldValue.isOpen ? 'Open' : 'Closed'} â†’ ${metadataData.newValue.isOpen ? 'Open' : 'Closed'}`);
                }
            }

            if (changes.length > 0) {
                return (
                    <span className="text-zinc-400">
                        {metadataData.name && <span className="text-white font-medium">{metadataData.name}</span>}
                        {metadataData.name && ' â€¢ '}
                        {changes.join(', ')}
                    </span>
                );
            }
        }

        // Product creation
        if (action === 'PRODUCT_CREATED') {
            return (
                <span className="text-zinc-400">
                    Created: <span className="text-white font-medium">{metadataData.name}</span>
                </span>
            );
        }

        // Product updates with changes
        if (action === 'PRODUCT_UPDATED' || action === 'PRODUCT_PRICE_CHANGED' || action === 'PRODUCT_AVAILABILITY_CHANGED') {
            const changes = [];
            
            if (metadataData.oldValue && metadataData.newValue) {
                if (metadataData.oldValue.price !== undefined && metadataData.newValue.price !== undefined && metadataData.oldValue.price !== metadataData.newValue.price) {
                    changes.push(`Price: $${metadataData.oldValue.price} â†’ $${metadataData.newValue.price}`);
                }
                if (metadataData.oldValue.isAvailable !== undefined && metadataData.newValue.isAvailable !== undefined && metadataData.oldValue.isAvailable !== metadataData.newValue.isAvailable) {
                    changes.push(`Available: ${metadataData.oldValue.isAvailable ? 'Yes' : 'No'} â†’ ${metadataData.newValue.isAvailable ? 'Yes' : 'No'}`);
                }
                if (metadataData.oldValue.name !== undefined && metadataData.newValue.name !== undefined && metadataData.oldValue.name !== metadataData.newValue.name) {
                    changes.push(`Name: "${metadataData.oldValue.name}" â†’ "${metadataData.newValue.name}"`);
                }
            }

            if (changes.length > 0) {
                return (
                    <span className="text-zinc-400">
                        {metadataData.name && <span className="text-white font-medium">{metadataData.name}</span>}
                        {metadataData.name && ' â€¢ '}
                        {changes.join(', ')}
                    </span>
                );
            }
        }

        // Product deletion
        if (action === 'PRODUCT_DELETED') {
            return (
                <span className="text-zinc-400">
                    Deleted: <span className="text-white font-medium">{metadataData.name}</span>
                </span>
            );
        }

        // Order status changes
        if (action === 'ORDER_STATUS_CHANGED') {
            return (
                <span className="text-zinc-400">
                    Status: <span className="text-red-400">{String(metadataData.oldValue?.status ?? '')}</span>
                    {' → '}
                    <span className="text-green-400">{String(metadataData.newValue?.status ?? '')}</span>
                </span>
            );
        }

        // Order assignment
        if (action === 'ORDER_ASSIGNED') {
            return (
                <span className="text-zinc-400">
                    Assigned to: <span className="text-white font-medium">{metadataData.driverName || 'Unassigned'}</span>
                </span>
            );
        }

        // Settlement actions
        if (action === 'SETTLEMENT_PAID' || action === 'SETTLEMENT_PARTIAL_PAID') {
            return (
                <span className="text-zinc-400">
                    Amount: <span className="text-green-400 font-medium">${metadataData.amount?.toFixed(2)}</span>
                    {metadataData.type && <span className="text-zinc-600"> ({metadataData.type})</span>}
                </span>
            );
        }

        return null;
    };

    const renderMetadataDetails = (action: string, metadata: AuditLog['metadata']) => {
        const metadataData = metadata as AuditMetadataWithDiff | undefined;
        if (!metadataData || Object.keys(metadataData).length === 0) return null;

        // For updates with old/new values
        if (metadataData.oldValue && metadataData.newValue) {
            const changedFields = metadataData.changedFields || Object.keys(metadataData.newValue);
            
            return (
                <div className="space-y-3">
                    <p className="text-zinc-600 font-semibold">Changes Made:</p>
                    {changedFields.map((field: string) => {
                        const oldVal = metadataData.oldValue?.[field];
                        const newVal = metadataData.newValue?.[field];
                        
                        if (oldVal === newVal) return null;
                        
                        return (
                            <div key={field} className="bg-[#09090b] border border-zinc-800 rounded p-3">
                                <p className="text-xs text-zinc-600 mb-2 uppercase">{field}</p>
                                <div className="flex items-center gap-3">
                                    <div className="flex-1">
                                        <p className="text-xs text-zinc-600 mb-1">Old Value</p>
                                        <p className="text-red-400 font-mono text-sm">
                                            {typeof oldVal === 'boolean' ? (oldVal ? 'Yes' : 'No') : 
                                             typeof oldVal === 'object' ? JSON.stringify(oldVal) : 
                                             String(oldVal)}
                                        </p>
                                    </div>
                                    <span className="text-zinc-600">â†’</span>
                                    <div className="flex-1">
                                        <p className="text-xs text-zinc-600 mb-1">New Value</p>
                                        <p className="text-green-400 font-mono text-sm">
                                            {typeof newVal === 'boolean' ? (newVal ? 'Yes' : 'No') : 
                                             typeof newVal === 'object' ? JSON.stringify(newVal) : 
                                             String(newVal)}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            );
        }

        // For creation/other actions with simple metadata
        const importantFields = Object.entries(metadataData).filter(([key]) => 
            !['timestamp', 'changedFields', 'oldValue', 'newValue'].includes(key)
        );

        if (importantFields.length === 0) return null;

        return (
            <div className="space-y-2">
                <p className="text-zinc-600 font-semibold mb-2">Details:</p>
                <div className="bg-[#09090b] border border-zinc-800 rounded p-3 space-y-2">
                    {importantFields.map(([key, value]) => (
                        <div key={key} className="flex items-start gap-2">
                            <span className="text-zinc-600 text-xs uppercase min-w-[100px]">{key}:</span>
                            <span className="text-white text-sm font-mono">
                                {typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value)}
                            </span>
                        </div>
                    ))}
                </div>
            </div>
        );
    };

    return (
        <div className="min-h-screen flex flex-col bg-[#0f0f0f]">
            {/* Header */}
            <div className="bg-[#1a1a1a] border-b border-zinc-800 p-6">
                <div className="max-w-7xl mx-auto">
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-4">
                            <Link href="/dashboard" className="text-zinc-500 hover:text-white transition-colors">
                                <ArrowLeft size={24} />
                            </Link>
                            <div>
                                <h1 className="text-sm font-medium text-zinc-400 uppercase tracking-wider">Audit Logs</h1>
                                <p className="text-sm text-zinc-500 mt-1">Track all system activities and changes</p>
                            </div>
                        </div>
                        <button
                            onClick={() => refetch()}
                            className="flex items-center gap-2 bg-violet-600 hover:bg-violet-700 rounded px-4 py-2 text-sm font-semibold text-white transition-colors"
                        >
                            <Activity size={16} />
                            Refresh
                        </button>
                    </div>

                    {/* Filters */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div>
                            <label className="block text-xs font-medium text-zinc-500 mb-2">Date Range</label>
                            <div className="grid grid-cols-4 gap-1 bg-[#09090b] border border-zinc-800 rounded p-1">
                                {(['all', 'today', 'week', 'month'] as const).map((mode) => (
                                    <button
                                        key={mode}
                                        onClick={() => {
                                            setDateMode(mode);
                                            setPage(0);
                                        }}
                                        className={`px-2 py-1.5 text-xs font-medium rounded transition-colors ${
                                            dateMode === mode
                                                ? 'bg-violet-600 text-white'
                                                : 'text-zinc-500 hover:text-white'
                                        }`}
                                    >
                                        {mode.charAt(0).toUpperCase() + mode.slice(1)}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-medium text-zinc-500 mb-2">Action Type</label>
                            <select
                                value={actionFilter}
                                onChange={(e) => {
                                    setActionFilter(e.target.value);
                                    setPage(0);
                                }}
                                className="w-full bg-[#09090b] border border-zinc-800 rounded px-3 py-2 text-sm text-white"
                            >
                                {ACTION_TYPES.map((type) => (
                                    <option key={type.value} value={type.value}>
                                        {type.label}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-xs font-medium text-zinc-500 mb-2">Entity Type</label>
                            <select
                                value={entityFilter}
                                onChange={(e) => {
                                    setEntityFilter(e.target.value);
                                    setPage(0);
                                }}
                                className="w-full bg-[#09090b] border border-zinc-800 rounded px-3 py-2 text-sm text-white"
                            >
                                {ENTITY_TYPES.map((type) => (
                                    <option key={type.value} value={type.value}>
                                        {type.label}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-xs font-medium text-zinc-500 mb-2">Actor Type</label>
                            <select
                                value={actorFilter}
                                onChange={(e) => {
                                    setActorFilter(e.target.value);
                                    setPage(0);
                                }}
                                className="w-full bg-[#09090b] border border-zinc-800 rounded px-3 py-2 text-sm text-white"
                            >
                                {ACTOR_TYPES.map((type) => (
                                    <option key={type.value} value={type.value}>
                                        {type.label}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 p-6">
                <div className="max-w-7xl mx-auto">
                    {/* Summary */}
                    <div className="mb-6 flex items-center justify-between">
                        <p className="text-sm text-zinc-500">
                            Showing {logs.length} of {total} logs
                        </p>
                        {(actionFilter || entityFilter || actorFilter || dateMode !== 'all') && (
                            <button
                                onClick={() => {
                                    setActionFilter('');
                                    setEntityFilter('');
                                    setActorFilter('');
                                    setDateMode('all');
                                    setPage(0);
                                }}
                                className="text-sm text-violet-500 hover:text-violet-400 transition-colors"
                            >
                                Clear Filters
                            </button>
                        )}
                    </div>

                    {/* Logs List */}
                    {loading && logs.length === 0 ? (
                        <div className="text-center py-12">
                            <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-zinc-800 border-t-violet-500" />
                        </div>
                    ) : logs.length === 0 ? (
                        <div className="text-center py-12">
                            <Activity size={48} className="mx-auto text-zinc-600 mb-4" />
                            <p className="text-zinc-500">No audit logs found</p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {logs.map((log) => (
                                <div
                                    key={log.id}
                                    className="bg-[#1a1a1a] border border-zinc-800 rounded overflow-hidden hover:border-zinc-700 transition-colors"
                                >
                                    <button
                                        onClick={() => setExpandedLog(expandedLog === log.id ? null : log.id)}
                                        className="w-full p-4 text-left flex items-center justify-between gap-4"
                                    >
                                        <div className="flex items-center gap-4 flex-1 min-w-0">
                                            <span className={`px-2 py-1 rounded text-xs font-semibold ${getActorBadge(log.actorType)} text-white`}>
                                                {log.actorType}
                                            </span>
                                            
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className={`font-medium ${getActionColor(log.action)}`}>
                                                        {formatAction(log.action)}
                                                    </span>
                                                    <span className="text-zinc-600">â†’</span>
                                                    <span className="text-zinc-500">{log.entityType}</span>
                                                </div>
                                                
                                                {/* Preview of what changed/created */}
                                                {formatMetadataPreview(log.action, log.metadata) && (
                                                    <div className="mb-2 text-sm">
                                                        {formatMetadataPreview(log.action, log.metadata)}
                                                    </div>
                                                )}
                                                
                                                <div className="flex items-center gap-3 text-xs text-zinc-600">
                                                    {log.actor && (
                                                        <span className="flex items-center gap-1">
                                                            <User size={12} />
                                                            {log.actor.firstName} {log.actor.lastName}
                                                        </span>
                                                    )}
                                                    <span className="flex items-center gap-1">
                                                        <Calendar size={12} />
                                                        {format(new Date(log.createdAt), 'MMM dd, yyyy HH:mm:ss')}
                                                    </span>
                                                    {log.ipAddress && (
                                                        <span>IP: {log.ipAddress}</span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        <ChevronDown
                                            size={20}
                                            className={`text-zinc-500 transition-transform ${
                                                expandedLog === log.id ? 'rotate-180' : ''
                                            }`}
                                        />
                                    </button>

                                    {expandedLog === log.id && (
                                        <div className="border-t border-zinc-800 p-4 bg-[#0f0f0f]">
                                            <div className="grid grid-cols-2 gap-4 text-sm">
                                                <div>
                                                    <p className="text-zinc-600 mb-1">Log ID</p>
                                                    <p className="text-white font-mono text-xs">{log.id}</p>
                                                </div>
                                                {log.entityId && (
                                                    <div>
                                                        <p className="text-zinc-600 mb-1">Entity ID</p>
                                                        <p className="text-white font-mono text-xs">{log.entityId}</p>
                                                    </div>
                                                )}
                                                {log.actor && (
                                                    <div>
                                                        <p className="text-zinc-600 mb-1">Actor</p>
                                                        <p className="text-white">
                                                            {log.actor.firstName} {log.actor.lastName}
                                                        </p>
                                                        <p className="text-zinc-500 text-xs">{log.actor.email}</p>
                                                    </div>
                                                )}
                                                {log.userAgent && (
                                                    <div className="col-span-2">
                                                        <p className="text-zinc-600 mb-1">User Agent</p>
                                                        <p className="text-zinc-500 text-xs font-mono truncate">
                                                            {log.userAgent}
                                                        </p>
                                                    </div>
                                                )}
                                                {log.metadata && Object.keys(log.metadata).length > 0 && (
                                                    <div className="col-span-2">
                                                        {renderMetadataDetails(log.action, log.metadata)}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Pagination */}
                    {total > PAGE_SIZE && (
                        <div className="mt-6 flex items-center justify-between">
                            <button
                                onClick={() => setPage(Math.max(0, page - 1))}
                                disabled={page === 0 || loading}
                                className="px-4 py-2 bg-[#111113] border border-zinc-800 rounded text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-zinc-800 transition-colors"
                            >
                                Previous
                            </button>
                            <span className="text-zinc-500">
                                Page {page + 1} of {Math.ceil(total / PAGE_SIZE)}
                            </span>
                            <button
                                onClick={() => setPage(page + 1)}
                                disabled={!hasMore || loading}
                                className="px-4 py-2 bg-[#111113] border border-zinc-800 rounded text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-zinc-800 transition-colors"
                            >
                                Next
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
