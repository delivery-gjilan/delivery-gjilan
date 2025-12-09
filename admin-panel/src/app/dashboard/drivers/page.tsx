"use client";

import { useQuery } from "@apollo/client/react";
import { DRIVERS_QUERY } from "@/graphql/operations/users/queries";

interface DriverItem {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: string;
}

interface DriversResponse {
    drivers: DriverItem[];
}

export default function DriversPage() {
    const { data, loading, error } = useQuery<DriversResponse>(DRIVERS_QUERY);

    return (
        <div className="text-white">
            <div className="mb-6">
                <h1 className="text-2xl font-semibold">Drivers</h1>
                <p className="text-gray-400 mt-1">All driver accounts.</p>
            </div>

            {error && (
                <div className="bg-red-900/20 border border-red-800 rounded-lg p-4 text-red-300 text-sm mb-4">
                    {error.message}
                </div>
            )}

            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
                {loading ? (
                    <p className="text-gray-400">Loading drivers...</p>
                ) : (
                     <div className="overflow-x-auto">
                         <table className="min-w-full text-sm">
                             <thead>
                                 <tr className="text-left text-gray-400 border-b border-gray-800">
                                     <th className="py-3 pr-4">Name</th>
                                     <th className="py-3 pr-4">Email</th>
                                 </tr>
                             </thead>
                             <tbody>
                                 {data?.drivers?.map((driver) => (
                                     <tr key={driver.id} className="border-b border-gray-800/60">
                                         <td className="py-3 pr-4">{`${driver.firstName} ${driver.lastName}`}</td>
                                         <td className="py-3 pr-4 text-gray-300">{driver.email}</td>
                                     </tr>
                                 ))}
                                 {!data?.drivers?.length && (
                                     <tr>
                                         <td colSpan={2} className="py-4 text-gray-500 text-center">
                                             No drivers found.
                                         </td>
                                     </tr>
                                 )}
                             </tbody>
                         </table>
                     </div>
                 )}
             </div>
         </div>
     );
 }
