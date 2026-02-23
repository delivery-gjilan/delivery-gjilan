export function Table({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-[#111113] border border-[#1e1e22] rounded-xl overflow-hidden">
      <table className="w-full text-left border-collapse">{children}</table>
    </div>
  );
}

export function Th({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <th className={`px-4 py-2.5 text-zinc-500 bg-[#09090b] border-b border-[#1e1e22] text-[11px] font-medium uppercase tracking-wider ${className}`}>
      {children}
    </th>
  );
}

export function Td({ children, colSpan, className = "" }: { children: React.ReactNode; colSpan?: number; className?: string }) {
  return (
    <td className={`px-4 py-2.5 text-zinc-300 border-b border-[#1e1e22]/60 text-sm ${className}`} colSpan={colSpan}>
      {children}
    </td>
  );
}
