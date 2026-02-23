'use client';

import { useState } from 'react';
import { useQuery, useMutation } from '@apollo/client/react';
import { ArrowLeft, DollarSign } from 'lucide-react';
import Link from 'next/link';
import { GET_DRIVERS_WITH_BALANCE, GET_BUSINESSES_WITH_BALANCE, UPDATE_COMMISSION } from '@/graphql/operations/settlements/queries';

interface Driver {
    id: string;
    firstName: string;
    lastName: string;
    phoneNumber: string;
    commissionPercentage: number;
}

interface Business {
    id: string;
    name: string;
    businessType: string;
    commissionPercentage: number;
    balance?: { totalPending: number; totalPaid: number };
}

export default function CommissionSettings() {
    const [editingDriver, setEditingDriver] = useState<{ id: string; percentage: number } | null>(null);
    const [editingBusiness, setEditingBusiness] = useState<{ id: string; percentage: number } | null>(null);

    // Fetch drivers
    const { data: driversData, loading: driversLoading } = useQuery(GET_DRIVERS_WITH_BALANCE);

    // Fetch businesses
    const { data: businessesData, loading: businessesLoading } = useQuery(GET_BUSINESSES_WITH_BALANCE);

    // Update commission mutation
    const [updateCommission] = useMutation(UPDATE_COMMISSION, {
        refetchQueries: [
            { query: GET_DRIVERS_WITH_BALANCE },
            { query: GET_BUSINESSES_WITH_BALANCE },
        ],
    });

    const handleUpdateDriverCommission = async () => {
        if (!editingDriver) return;

        try {
            await updateCommission({
                variables: {
                    driverId: editingDriver.id,
                    percentage: editingDriver.percentage,
                },
            });
            setEditingDriver(null);
        } catch (error) {
            console.error('Error updating commission:', error);
        }
    };

    const handleUpdateBusinessCommission = async () => {
        if (!editingBusiness) return;

        try {
            await updateCommission({
                variables: {
                    businessId: editingBusiness.id,
                    percentage: editingBusiness.percentage,
                },
            });
            setEditingBusiness(null);
        } catch (error) {
            console.error('Error updating commission:', error);
        }
    };

    const drivers: Driver[] = driversData?.drivers || [];
    const businesses: Business[] = businessesData?.businesses || [];

    return (
        <div className="min-h-screen bg-[#0f0f0f] text-white">
            {/* Header */}
            <div className="bg-[#1a1a1a] border-b border-zinc-800 p-6">
                <div className="flex items-center gap-3">
                    <Link href="/dashboard" className="text-zinc-500 hover:text-white transition-colors">
                        <ArrowLeft size={24} />
                    </Link>
                    <h1 className="text-3xl font-bold">Commission Settings</h1>
                </div>
                <p className="text-zinc-500 mt-2">Manage commission percentages for drivers and businesses</p>
            </div>

            <div className="p-6 space-y-8">
                {/* Drivers Section */}
                <div>
                    <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                        <DollarSign size={24} />
                        Driver Commissions
                    </h2>
                    {driversLoading ? (
                        <div className="text-zinc-500">Loading drivers...</div>
                    ) : (
                        <div className="overflow-x-auto border border-zinc-800 rounded-lg">
                            <table className="w-full">
                                <thead>
                                    <tr className="bg-[#09090b] border-b border-zinc-800">
                                        <th className="px-4 py-3 text-left text-sm font-bold text-zinc-500">Driver Name</th>
                                        <th className="px-4 py-3 text-left text-sm font-bold text-zinc-500">Phone</th>
                                        <th className="px-4 py-3 text-right text-sm font-bold text-zinc-500">Current %</th>
                                        <th className="px-4 py-3 text-right text-sm font-bold text-zinc-500">Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {drivers.map((driver) => (
                                        <tr key={driver.id} className="border-b border-zinc-800 hover:bg-[#1a1a1a] transition-colors">
                                            <td className="px-4 py-3 text-white font-semibold">{driver.firstName} {driver.lastName}</td>
                                            <td className="px-4 py-3 text-zinc-500">{driver.phoneNumber}</td>
                                            <td className="px-4 py-3 text-right text-blue-400 font-semibold">
                                                {driver.commissionPercentage}%
                                            </td>
                                            <td className="px-4 py-3 text-right">
                                                {editingDriver?.id === driver.id ? (
                                                    <div className="flex gap-2 justify-end items-center">
                                                        <input
                                                            type="number"
                                                            value={editingDriver.percentage || 0}
                                                            onChange={(e) =>
                                                                setEditingDriver({
                                                                    ...editingDriver,
                                                                    percentage: parseFloat(e.target.value) || 0,
                                                                })
                                                            }
                                                            min="0"
                                                            max="100"
                                                            className="w-20 bg-[#09090b] border border-zinc-800 rounded px-2 py-1 text-white"
                                                        />
                                                        <button
                                                            onClick={handleUpdateDriverCommission}
                                                            className="bg-violet-600 hover:bg-cyan-700 px-3 py-1 rounded text-sm"
                                                        >
                                                            Save
                                                        </button>
                                                        <button
                                                            onClick={() => setEditingDriver(null)}
                                                            className="bg-neutral-700 hover:bg-neutral-600 px-3 py-1 rounded text-sm"
                                                        >
                                                            Cancel
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <button
                                                        onClick={() => setEditingDriver({ id: driver.id, percentage: driver.commissionPercentage })}
                                                        className="bg-violet-600 hover:bg-cyan-700 px-3 py-1 rounded text-sm transition-colors"
                                                    >
                                                        Edit
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {/* Businesses Section */}
                <div>
                    <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                        <DollarSign size={24} />
                        Business Commissions
                    </h2>
                    {businessesLoading ? (
                        <div className="text-zinc-500">Loading businesses...</div>
                    ) : (
                        <div className="overflow-x-auto border border-zinc-800 rounded-lg">
                            <table className="w-full">
                                <thead>
                                    <tr className="bg-[#09090b] border-b border-zinc-800">
                                        <th className="px-4 py-3 text-left text-sm font-bold text-zinc-500">Business Name</th>
                                        <th className="px-4 py-3 text-left text-sm font-bold text-zinc-500">Type</th>
                                        <th className="px-4 py-3 text-right text-sm font-bold text-zinc-500">Current %</th>
                                        <th className="px-4 py-3 text-right text-sm font-bold text-zinc-500">Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {businesses.map((business) => (
                                        <tr key={business.id} className="border-b border-zinc-800 hover:bg-[#1a1a1a] transition-colors">
                                            <td className="px-4 py-3 text-white font-semibold">{business.name}</td>
                                            <td className="px-4 py-3 text-zinc-500">{business.businessType}</td>
                                            <td className="px-4 py-3 text-right text-green-400 font-semibold">
                                                {business.commissionPercentage}%
                                            </td>
                                            <td className="px-4 py-3 text-right">
                                                {editingBusiness?.id === business.id ? (
                                                    <div className="flex gap-2 justify-end items-center">
                                                        <input
                                                            type="number"
                                                            value={editingBusiness.percentage || 0}
                                                            onChange={(e) =>
                                                                setEditingBusiness({
                                                                    ...editingBusiness,
                                                                    percentage: parseFloat(e.target.value) || 0,
                                                                })
                                                            }
                                                            min="0"
                                                            max="100"
                                                            className="w-20 bg-[#09090b] border border-zinc-800 rounded px-2 py-1 text-white"
                                                        />
                                                        <button
                                                            onClick={handleUpdateBusinessCommission}
                                                            className="bg-green-600 hover:bg-green-700 px-3 py-1 rounded text-sm"
                                                        >
                                                            Save
                                                        </button>
                                                        <button
                                                            onClick={() => setEditingBusiness(null)}
                                                            className="bg-neutral-700 hover:bg-neutral-600 px-3 py-1 rounded text-sm"
                                                        >
                                                            Cancel
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <button
                                                        onClick={() =>
                                                            setEditingBusiness({ id: business.id, percentage: business.commissionPercentage })
                                                        }
                                                        className="bg-green-600 hover:bg-green-700 px-3 py-1 rounded text-sm transition-colors"
                                                    >
                                                        Edit
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
