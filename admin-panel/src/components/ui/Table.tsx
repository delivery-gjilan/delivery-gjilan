export function Table({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-[#161616] border border-[#262626] rounded-lg overflow-hidden">
      <table className="w-full text-left border-collapse">{children}</table>
    </div>
  );
}

export function Th({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <th className={`px-4 py-3 text-neutral-400 bg-[#0a0a0a] border-b border-[#262626] text-xs font-medium uppercase tracking-wider ${className}`}>
      {children}
    </th>
  );
}

export function Td({ children, colSpan, className = "" }: { children: React.ReactNode; colSpan?: number; className?: string }) {
  return (
    <td className={`px-4 py-3 text-neutral-200 border-b border-[#262626] text-sm ${className}`} colSpan={colSpan}>
      {children}
    </td>
  );
}
