'use client';

import React from 'react';
import { UserPermission } from '@/gql/graphql';

interface PermissionSelectorProps {
    selectedPermissions: UserPermission[];
    onChange: (permissions: UserPermission[]) => void;
    disabled?: boolean;
}

interface PermissionGroup {
    title: string;
    permissions: {
        value: UserPermission;
        label: string;
        description: string;
    }[];
}

const permissionGroups: PermissionGroup[] = [
    {
        title: 'Orders',
        permissions: [
            {
                value: 'view_orders' as UserPermission,
                label: 'View Orders',
                description: 'Can see all orders for the business',
            },
            {
                value: 'manage_orders' as UserPermission,
                label: 'Manage Orders',
                description: 'Can update order status and assign drivers',
            },
        ],
    },
    {
        title: 'Products',
        permissions: [
            {
                value: 'view_products' as UserPermission,
                label: 'View Products',
                description: 'Can see products and inventory',
            },
            {
                value: 'manage_products' as UserPermission,
                label: 'Manage Products',
                description: 'Can create, update, and delete products',
            },
        ],
    },
    {
        title: 'Financial',
        permissions: [
            {
                value: 'view_finances' as UserPermission,
                label: 'View Finances',
                description: 'Can view settlements and financial reports',
            },
        ],
    },
    {
        title: 'Settings',
        permissions: [
            {
                value: 'manage_settings' as UserPermission,
                label: 'Manage Settings',
                description: 'Can edit business hours, commission, etc.',
            },
        ],
    },
    {
        title: 'Analytics',
        permissions: [
            {
                value: 'view_analytics' as UserPermission,
                label: 'View Analytics',
                description: 'Can view business statistics and reports',
            },
        ],
    },
];

export function PermissionSelector({ 
    selectedPermissions, 
    onChange, 
    disabled = false 
}: PermissionSelectorProps) {
    const handleToggle = (permission: UserPermission) => {
        if (disabled) return;
        
        const isSelected = selectedPermissions.includes(permission);
        
        if (isSelected) {
            onChange(selectedPermissions.filter(p => p !== permission));
        } else {
            onChange([...selectedPermissions, permission]);
        }
    };

    const isSelected = (permission: UserPermission) => {
        return selectedPermissions.includes(permission);
    };

    return (
        <div className="space-y-6">
            <div className="text-sm text-gray-600 mb-4">
                Select which features this employee can access. Business owners automatically have all permissions.
            </div>
            
            {permissionGroups.map((group) => (
                <div key={group.title} className="border rounded-lg p-4">
                    <h4 className="font-semibold text-gray-900 mb-3">{group.title}</h4>
                    <div className="space-y-3">
                        {group.permissions.map((perm) => (
                            <label
                                key={perm.value}
                                className={`flex items-start cursor-pointer ${
                                    disabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-50'
                                } p-2 rounded transition-colors`}
                            >
                                <input
                                    type="checkbox"
                                    checked={isSelected(perm.value)}
                                    onChange={() => handleToggle(perm.value)}
                                    disabled={disabled}
                                    className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded disabled:opacity-50"
                                />
                                <div className="ml-3">
                                    <div className="text-sm font-medium text-gray-900">
                                        {perm.label}
                                    </div>
                                    <div className="text-xs text-gray-500">
                                        {perm.description}
                                    </div>
                                </div>
                            </label>
                        ))}
                    </div>
                </div>
            ))}
        </div>
    );
}
