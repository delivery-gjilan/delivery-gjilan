export function Table({ children }: { children: React.ReactNode }) {
  return (
    <table className="w-full text-left border-collapse">{children}</table>
  );
}

export function Th({ children }: { children: React.ReactNode }) {
  return (
    <th className="px-4 py-3 text-gray-300 border-b border-gray-800 text-sm uppercase tracking-wide">
      {children}
    </th>
  );
}

export function Td({ children, colSpan }: { children: React.ReactNode; colSpan?: number }) {
  return (
    <td className="px-4 py-3 text-gray-200 border-b border-gray-800 text-sm" colSpan={colSpan}>
      {children}
    </td>
  );
}
