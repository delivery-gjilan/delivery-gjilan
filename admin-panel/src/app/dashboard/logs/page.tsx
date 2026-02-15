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
    metadata?: any;
    ipAddress?: string;
    userAgent?: string;
    createdAt: string;
}

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
        if (action.includes('PAID') || action.includes('SETTLEMENT')) return 'text-cyan-400';
        return 'text-neutral-400';
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

    const formatMetadataPreview = (action: string, metadata: any) => {
        if (!metadata) return null;

        // User/Driver creation
        if (action === 'USER_CREATED' || action === 'DRIVER_CREATED') {
            const name = `${metadata.firstName} ${metadata.lastName}`;
            return (
                <span className="text-neutral-300">
                    Created: <span className="text-white font-medium">{name}</span>
                    {metadata.email && <span className="text-neutral-500"> ({metadata.email})</span>}
                    {metadata.role && <span className="text-cyan-400"> • {metadata.role}</span>}
                </span>
            );
        }

        // Business creation
        if (action === 'BUSINESS_CREATED') {
            return (
                <span className="text-neutral-300">
                    Created: <span className="text-white font-medium">{metadata.name}</span>
                    {metadata.category && <span className="text-neutral-500"> ({metadata.category})</span>}
                </span>
            );
        }

        // Business updates
        if (action === 'BUSINESS_UPDATED') {
            const changes = [];
            
            if (metadata.oldValue && metadata.newValue) {
                if (metadata.oldValue.name !== metadata.newValue.name) {
                    changes.push(`Name: "${metadata.oldValue.name}" → "${metadata.newValue.name}"`);
                }
                if (metadata.oldValue.isOpen !== metadata.newValue.isOpen) {
                    changes.push(`Status: ${metadata.oldValue.isOpen ? 'Open' : 'Closed'} → ${metadata.newValue.isOpen ? 'Open' : 'Closed'}`);
                }
            }

            if (changes.length > 0) {
                return (
                    <span className="text-neutral-300">
                        {metadata.name && <span className="text-white font-medium">{metadata.name}</span>}
                        {metadata.name && ' • '}
                        {changes.join(', ')}
                    </span>
                );
            }
        }

        // Product creation
        if (action === 'PRODUCT_CREATED') {
            return (
                <span className="text-neutral-300">
                    Created: <span className="text-white font-medium">{metadata.name}</span>
                </span>
            );
        }

        // Product updates with changes
        if (action === 'PRODUCT_UPDATED' || action === 'PRODUCT_PRICE_CHANGED' || action === 'PRODUCT_AVAILABILITY_CHANGED') {
            const changes = [];
            
            if (metadata.oldValue && metadata.newValue) {
                if (metadata.oldValue.price !== undefined && metadata.newValue.price !== undefined && metadata.oldValue.price !== metadata.newValue.price) {
                    changes.push(`Price: $${metadata.oldValue.price} → $${metadata.newValue.price}`);
                }
                if (metadata.oldValue.isAvailable !== undefined && metadata.newValue.isAvailable !== undefined && metadata.oldValue.isAvailable !== metadata.newValue.isAvailable) {
                    changes.push(`Available: ${metadata.oldValue.isAvailable ? 'Yes' : 'No'} → ${metadata.newValue.isAvailable ? 'Yes' : 'No'}`);
                }
                if (metadata.oldValue.name !== undefined && metadata.newValue.name !== undefined && metadata.oldValue.name !== metadata.newValue.name) {
                    changes.push(`Name: "${metadata.oldValue.name}" → "${metadata.newValue.name}"`);
                }
            }

            if (changes.length > 0) {
                return (
                    <span className="text-neutral-300">
                        {metadata.name && <span className="text-white font-medium">{metadata.name}</span>}
                        {metadata.name && ' • '}
                        {changes.join(', ')}
                    </span>
                );
            }
        }

        // Product deletion
        if (action === 'PRODUCT_DELETED') {
            return (
                <span className="text-neutral-300">
                    Deleted: <span className="text-white font-medium">{metadata.name}</span>
                </span>
            );
        }

        // Order status changes
        if (action === 'ORDER_STATUS_CHANGED') {
            return (
                <span className="text-neutral-300">
                    Status: <span className="text-red-400">{metadata.oldValue?.status}</span>
                    {' → '}
                    <span className="text-green-400">{metadata.newValue?.status}</span>
                </span>
            );
        }

        // Order assignment
        if (action === 'ORDER_ASSIGNED') {
            return (
                <span className="text-neutral-300">
                    Assigned to: <span className="text-white font-medium">{metadata.driverName || 'Unassigned'}</span>
                </span>
            );
        }

        // Settlement actions
        if (action === 'SETTLEMENT_PAID' || action === 'SETTLEMENT_PARTIAL_PAID') {
            return (
                <span className="text-neutral-300">
                    Amount: <span className="text-green-400 font-medium">${metadata.amount?.toFixed(2)}</span>
                    {metadata.type && <span className="text-neutral-500"> ({metadata.type})</span>}
                </span>
            );
        }

        return null;
    };

    const renderMetadataDetails = (action: string, metadata: any) => {
        if (!metadata || Object.keys(metadata).length === 0) return null;

        // For updates with old/new values
        if (metadata.oldValue && metadata.newValue) {
            const changedFields = metadata.changedFields || Object.keys(metadata.newValue);
            
            return (
                <div className="space-y-3">
                    <p className="text-neutral-500 font-semibold">Changes Made:</p>
                    {changedFields.map((field: string) => {
                        const oldVal = metadata.oldValue[field];
                        const newVal = metadata.newValue[field];
                        
                        if (oldVal === newVal) return null;
                        
                        return (
                            <div key={field} className="bg-[#0a0a0a] border border-[#262626] rounded p-3">
                                <p className="text-xs text-neutral-500 mb-2 uppercase">{field}</p>
                                <div className="flex items-center gap-3">
                                    <div className="flex-1">
                                        <p className="text-xs text-neutral-500 mb-1">Old Value</p>
                                        <p className="text-red-400 font-mono text-sm">
                                            {typeof oldVal === 'boolean' ? (oldVal ? 'Yes' : 'No') : 
                                             typeof oldVal === 'object' ? JSON.stringify(oldVal) : 
                                             String(oldVal)}
                                        </p>
                                    </div>
                                    <span className="text-neutral-500">→</span>
                                    <div className="flex-1">
                                        <p className="text-xs text-neutral-500 mb-1">New Value</p>
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
        const importantFields = Object.entries(metadata).filter(([key]) => 
            !['timestamp', 'changedFields', 'oldValue', 'newValue'].includes(key)
        );

        if (importantFields.length === 0) return null;

        return (
            <div className="space-y-2">
                <p className="text-neutral-500 font-semibold mb-2">Details:</p>
                <div className="bg-[#0a0a0a] border border-[#262626] rounded p-3 space-y-2">
                    {importantFields.map(([key, value]) => (
                        <div key={key} className="flex items-start gap-2">
                            <span className="text-neutral-500 text-xs uppercase min-w-[100px]">{key}:</span>
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
            <div className="bg-[#1a1a1a] border-b border-[#262626] p-6">
                <div className="max-w-7xl mx-auto">
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-4">
                            <Link href="/dashboard" className="text-neutral-400 hover:text-white transition-colors">
                                <ArrowLeft size={24} />
                            </Link>
                            <div>
                                <h1 className="text-2xl font-bold text-white">Audit Logs</h1>
                                <p className="text-sm text-neutral-400 mt-1">Track all system activities and changes</p>
                            </div>
                        </div>
                        <button
                            onClick={() => refetch()}
                            className="flex items-center gap-2 bg-cyan-600 hover:bg-cyan-700 rounded px-4 py-2 text-sm font-semibold text-white transition-colors"
                        >
                            <Activity size={16} />
                            Refresh
                        </button>
                    </div>

                    {/* Filters */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div>
                            <label className="block text-xs font-medium text-neutral-400 mb-2">Date Range</label>
                            <div className="grid grid-cols-4 gap-1 bg-[#0a0a0a] border border-[#262626] rounded p-1">
                                {(['all', 'today', 'week', 'month'] as const).map((mode) => (
                                    <button
                                        key={mode}
                                        onClick={() => {
                                            setDateMode(mode);
                                            setPage(0);
                                        }}
                                        className={`px-2 py-1.5 text-xs font-medium rounded transition-colors ${
                                            dateMode === mode
                                                ? 'bg-cyan-600 text-white'
                                                : 'text-neutral-400 hover:text-white'
                                        }`}
                                    >
                                        {mode.charAt(0).toUpperCase() + mode.slice(1)}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-medium text-neutral-400 mb-2">Action Type</label>
                            <select
                                value={actionFilter}
                                onChange={(e) => {
                                    setActionFilter(e.target.value);
                                    setPage(0);
                                }}
                                className="w-full bg-[#0a0a0a] border border-[#262626] rounded px-3 py-2 text-sm text-white"
                            >
                                {ACTION_TYPES.map((type) => (
                                    <option key={type.value} value={type.value}>
                                        {type.label}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-xs font-medium text-neutral-400 mb-2">Entity Type</label>
                            <select
                                value={entityFilter}
                                onChange={(e) => {
                                    setEntityFilter(e.target.value);
                                    setPage(0);
                                }}
                                className="w-full bg-[#0a0a0a] border border-[#262626] rounded px-3 py-2 text-sm text-white"
                            >
                                {ENTITY_TYPES.map((type) => (
                                    <option key={type.value} value={type.value}>
                                        {type.label}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-xs font-medium text-neutral-400 mb-2">Actor Type</label>
                            <select
                                value={actorFilter}
                                onChange={(e) => {
                                    setActorFilter(e.target.value);
                                    setPage(0);
                                }}
                                className="w-full bg-[#0a0a0a] border border-[#262626] rounded px-3 py-2 text-sm text-white"
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
                        <p className="text-sm text-neutral-400">
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
                                className="text-sm text-cyan-500 hover:text-cyan-400 transition-colors"
                            >
                                Clear Filters
                            </button>
                        )}
                    </div>

                    {/* Logs List */}
                    {loading && logs.length === 0 ? (
                        <div className="text-center py-12">
                            <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-neutral-700 border-t-cyan-500" />
                        </div>
                    ) : logs.length === 0 ? (
                        <div className="text-center py-12">
                            <Activity size={48} className="mx-auto text-neutral-600 mb-4" />
                            <p className="text-neutral-400">No audit logs found</p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {logs.map((log) => (
                                <div
                                    key={log.id}
                                    className="bg-[#1a1a1a] border border-[#262626] rounded overflow-hidden hover:border-[#404040] transition-colors"
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
                                                    <span className="text-neutral-500">→</span>
                                                    <span className="text-neutral-400">{log.entityType}</span>
                                                </div>
                                                
                                                {/* Preview of what changed/created */}
                                                {formatMetadataPreview(log.action, log.metadata) && (
                                                    <div className="mb-2 text-sm">
                                                        {formatMetadataPreview(log.action, log.metadata)}
                                                    </div>
                                                )}
                                                
                                                <div className="flex items-center gap-3 text-xs text-neutral-500">
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
                                            className={`text-neutral-400 transition-transform ${
                                                expandedLog === log.id ? 'rotate-180' : ''
                                            }`}
                                        />
                                    </button>

                                    {expandedLog === log.id && (
                                        <div className="border-t border-[#262626] p-4 bg-[#0f0f0f]">
                                            <div className="grid grid-cols-2 gap-4 text-sm">
                                                <div>
                                                    <p className="text-neutral-500 mb-1">Log ID</p>
                                                    <p className="text-white font-mono text-xs">{log.id}</p>
                                                </div>
                                                {log.entityId && (
                                                    <div>
                                                        <p className="text-neutral-500 mb-1">Entity ID</p>
                                                        <p className="text-white font-mono text-xs">{log.entityId}</p>
                                                    </div>
                                                )}
                                                {log.actor && (
                                                    <div>
                                                        <p className="text-neutral-500 mb-1">Actor</p>
                                                        <p className="text-white">
                                                            {log.actor.firstName} {log.actor.lastName}
                                                        </p>
                                                        <p className="text-neutral-400 text-xs">{log.actor.email}</p>
                                                    </div>
                                                )}
                                                {log.userAgent && (
                                                    <div className="col-span-2">
                                                        <p className="text-neutral-500 mb-1">User Agent</p>
                                                        <p className="text-neutral-400 text-xs font-mono truncate">
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
                                className="px-4 py-2 bg-[#1a1a1a] border border-[#262626] rounded text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#262626] transition-colors"
                            >
                                Previous
                            </button>
                            <span className="text-neutral-400">
                                Page {page + 1} of {Math.ceil(total / PAGE_SIZE)}
                            </span>
                            <button
                                onClick={() => setPage(page + 1)}
                                disabled={!hasMore || loading}
                                className="px-4 py-2 bg-[#1a1a1a] border border-[#262626] rounded text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#262626] transition-colors"
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
