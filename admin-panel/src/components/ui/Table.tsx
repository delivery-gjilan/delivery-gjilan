export function Table({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-[#111113] border border-[#1e1e22] rounded-xl overflow-visible">
      <div className="overflow-x-auto overflow-y-visible">
        <table className="w-full text-left border-collapse">{children}</table>
      </div>
    </div>
  );
}

export function Th({ children, className = "" }: { children?: React.ReactNode; className?: string }) {
  return (
    <th className={`px-4 py-2.5 text-zinc-500 bg-[#09090b] border-b border-[#1e1e22] text-[11px] font-medium uppercase tracking-wider ${className}`}>
      {children}
    </th>
  );
}

export function Td({ children, colSpan, className = "" }: { children: React.ReactNode; colSpan?: number; className?: string }) {
  return (
    <td className={`px-4 py-2.5 text-zinc-300 border-b border-[#1e1e22]/60 text-sm relative ${className}`} colSpan={colSpan}>
      {children}
    </td>
  );
}

// Shadcn-style exports for compatibility
export function TableHeader({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <thead className={`[&_tr]:border-b border-zinc-800 ${className}`}>{children}</thead>;
}

export function TableBody({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <tbody className={`[&_tr:last-child]:border-0 ${className}`}>{children}</tbody>;
}

export function TableFooter({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <tfoot className={`bg-zinc-900 font-medium text-zinc-100 ${className}`}>{children}</tfoot>;
}

export function TableRow({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <tr className={`border-b border-zinc-800 transition-colors hover:bg-zinc-900/50 ${className}`}>
      {children}
    </tr>
  );
}

export function TableHead({ children, className = "", ...props }: { children?: React.ReactNode; className?: string; [key: string]: any }) {
  return (
    <th className={`h-12 px-4 text-left align-middle font-medium text-zinc-400 ${className}`} {...props}>
      {children}
    </th>
  );
}

export function TableCell({ children, className = "", ...props }: { children: React.ReactNode; className?: string; [key: string]: any }) {
  return (
    <td className={`p-4 align-middle text-zinc-300 ${className}`} {...props}>
      {children}
    </td>
  );
}

export function TableCaption({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <caption className={`mt-4 text-sm text-zinc-400 ${className}`}>{children}</caption>;
}
