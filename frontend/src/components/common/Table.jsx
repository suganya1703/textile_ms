import React, { useState, useMemo } from 'react';
import { ChevronsUpDown, ChevronUp, ChevronDown } from 'lucide-react';

export function Table({
  columns = [],
  data = [],
  keyField = 'id',
  emptyMessage = 'No records found',
  className = '',
  mobileCardRender,
  showFooter = true,
  summaryLabel = 'Total Records',
  onRowClick
}) {
  const [sortKey, setSortKey] = useState(null);
  const [sortDir, setSortDir] = useState('asc'); // 'asc' or 'desc'

  const handleHeaderClick = (col) => {
    if (col.sortable === false || !col.accessor) return;
    if (sortKey === col.accessor) {
      if (sortDir === 'asc') setSortDir('desc');
      else {
        setSortKey(null);
        setSortDir('asc');
      }
    } else {
      setSortKey(col.accessor);
      setSortDir('asc');
    }
  };

  const sortedData = useMemo(() => {
    if (!sortKey || !data || data.length === 0) return data;

    return [...data].sort((a, b) => {
      let valA = a[sortKey];
      let valB = b[sortKey];

      if (valA === null || valA === undefined) return sortDir === 'asc' ? 1 : -1;
      if (valB === null || valB === undefined) return sortDir === 'asc' ? -1 : 1;

      // Handle numbers
      if (typeof valA === 'number' && typeof valB === 'number') {
        return sortDir === 'asc' ? valA - valB : valB - valA;
      }

      // Handle boolean
      if (typeof valA === 'boolean' && typeof valB === 'boolean') {
        return sortDir === 'asc' ? (valA === valB ? 0 : valA ? -1 : 1) : (valA === valB ? 0 : valA ? 1 : -1);
      }

      // Convert to string for text comparison
      const strA = String(valA).toLowerCase();
      const strB = String(valB).toLowerCase();
      if (strA < strB) return sortDir === 'asc' ? -1 : 1;
      if (strA > strB) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
  }, [data, sortKey, sortDir]);

  if (!data || data.length === 0) {
    return (
      <div className="py-12 text-center text-[#6B7280] text-sm bg-[#F9FAFB] rounded-[12px] border border-dashed border-[#E5E7EB]">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* Mobile Card View (shown below md: 768px breakpoint) */}
      <div className="block md:hidden space-y-3">
        {sortedData.map((row, idx) => (
          <div
            key={row[keyField] ?? idx}
            onClick={() => onRowClick && onRowClick(row)}
            className={`bg-white p-4 rounded-[12px] border border-[#E5E7EB] shadow-[0_1px_2px_rgba(0,0,0,0.05)] space-y-2 hover:border-[#2F3E8F] transition-colors ${
              onRowClick ? 'cursor-pointer' : ''
            }`}
          >
            {mobileCardRender ? (
              mobileCardRender(row, idx)
            ) : (
              columns.map((col, cIdx) => (
                <div key={cIdx} className="flex justify-between items-center text-[14px] py-1.5 border-b border-[#F3F4F6] last:border-0">
                  <span className="font-medium text-[#6B7280] text-xs">{col.header}</span>
                  <span className="font-medium text-[#111827] text-right text-xs">
                    {col.render ? col.render(row) : row[col.accessor]}
                  </span>
                </div>
              ))
            )}
          </div>
        ))}
        {showFooter && (
          <div className="p-3 bg-gray-50 rounded-lg text-xs font-semibold text-[#4B5563] text-center border border-[#E5E7EB]">
            {summaryLabel}: {data.length} records
          </div>
        )}
      </div>

      {/* Desktop / Tablet Table View (hidden below md: 768px) */}
      <div className="hidden md:block overflow-x-auto rounded-[12px] border border-[#E5E7EB] bg-white">
        <table className={`min-w-full w-full text-left table-text text-[14px] text-[#111827] tabular-nums ${className}`}>
          <thead className="bg-[#F9FAFB] border-b border-[#E5E7EB] table-header text-[12px] font-semibold text-[#6B7280] uppercase tracking-[0.05em] select-none">
            <tr>
              {columns.map((col, idx) => {
                const isSortable = col.sortable !== false && Boolean(col.accessor);
                const isCurrentSort = sortKey === col.accessor;

                return (
                  <th
                    key={idx}
                    onClick={() => isSortable && handleHeaderClick(col)}
                    className={`px-4 py-3.5 ${
                      col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left'
                    } ${isSortable ? 'cursor-pointer hover:bg-gray-100/80 transition-colors group' : ''} ${col.className || ''}`}
                  >
                    <div className={`inline-flex items-center gap-1 ${col.align === 'right' ? 'justify-end' : col.align === 'center' ? 'justify-center' : 'justify-start'}`}>
                      <span>{col.header}</span>
                      {isSortable && (
                        <span className="inline-block shrink-0">
                          {isCurrentSort ? (
                            sortDir === 'asc' ? (
                              <ChevronUp className="w-3.5 h-3.5 text-[#2F3E8F]" />
                            ) : (
                              <ChevronDown className="w-3.5 h-3.5 text-[#2F3E8F]" />
                            )
                          ) : (
                            <ChevronsUpDown className="w-3.5 h-3.5 text-gray-400 opacity-40 group-hover:opacity-100 transition-opacity" />
                          )}
                        </span>
                      )}
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#F3F4F6]">
            {sortedData.map((row, rIdx) => (
              <tr
                key={row[keyField] ?? rIdx}
                onClick={() => onRowClick && onRowClick(row)}
                className={`min-h-[54px] hover:bg-indigo-50/40 hover:border-l-2 hover:border-l-[#2F3E8F] transition-all ${
                  onRowClick ? 'cursor-pointer' : ''
                }`}
              >
                {columns.map((col, cIdx) => (
                  <td
                    key={cIdx}
                    className={`px-4 py-3 whitespace-nowrap text-xs ${
                      col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left'
                    } ${col.tdClassName || ''}`}
                  >
                    {col.render ? col.render(row) : row[col.accessor]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
          {/* Total / Count Summary Row */}
          {showFooter && (
            <tfoot className="bg-[#F9FAFB] border-t-2 border-[#E5E7EB] text-xs font-semibold text-[#374151]">
              <tr>
                {columns.map((col, cIdx) => {
                  if (cIdx === 0) {
                    return (
                      <td key={cIdx} className="px-4 py-3 whitespace-nowrap font-bold text-[#111827]">
                        Total: {data.length} records
                      </td>
                    );
                  }

                  // If col.sum is true, calculate sum
                  if (col.sum) {
                    const totalSum = data.reduce((acc, r) => acc + (Number(r[col.accessor]) || 0), 0);
                    return (
                      <td key={cIdx} className={`px-4 py-3 whitespace-nowrap font-mono tabular-nums font-bold text-[#111827] ${col.align === 'right' ? 'text-right' : 'text-left'}`}>
                        {col.sumRender ? col.sumRender(totalSum) : totalSum.toLocaleString()}
                      </td>
                    );
                  }

                  return (
                    <td key={cIdx} className="px-4 py-3 whitespace-nowrap text-gray-400">
                      -
                    </td>
                  );
                })}
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
}
