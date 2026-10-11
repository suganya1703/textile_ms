import React from 'react';

export function Table({
  columns = [],
  data = [],
  keyField = 'id',
  emptyMessage = 'No records found',
  className = '',
  mobileCardRender
}) {
  if (!data || data.length === 0) {
    return (
      <div className="py-12 text-center text-[#475569] text-sm bg-[#F8FAFC] rounded-[16px] border border-dashed border-[#E5E9F2]">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* Mobile Card View (shown below md: 768px breakpoint) */}
      <div className="block md:hidden space-y-3">
        {data.map((row, idx) => (
          <div
            key={row[keyField] ?? idx}
            className="bg-white p-4 rounded-[16px] border border-[#E5E9F2] shadow-[0_2px_8px_rgba(15,23,42,0.04)] space-y-2"
          >
            {mobileCardRender ? (
              mobileCardRender(row, idx)
            ) : (
              columns.map((col, cIdx) => (
                <div key={cIdx} className="flex justify-between items-center text-xs py-2 border-b border-[#F1F5F9] last:border-0">
                  <span className="font-medium text-[#475569]">{col.header}</span>
                  <span className="font-semibold text-[#0F172A] text-right">
                    {col.render ? col.render(row) : row[col.accessor]}
                  </span>
                </div>
              ))
            )}
          </div>
        ))}
      </div>

      {/* Desktop / Tablet Table View (hidden below md: 768px) */}
      <div className="hidden md:block overflow-x-auto rounded-[16px] border border-[#E5E9F2] bg-white shadow-[0_2px_8px_rgba(15,23,42,0.04)]">
        <table className={`min-w-full w-full text-left text-sm text-[#0F172A] tabular-nums font-sans ${className}`}>
          <thead className="bg-[#F8FAFC] border-b border-[#E5E9F2] text-[12px] font-semibold text-[#475569] uppercase tracking-[0.05em] sticky top-0 z-10">
            <tr>
              {columns.map((col, idx) => (
                <th
                  key={idx}
                  className={`px-4 py-3.5 ${col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left'} ${col.className || ''}`}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E5E9F2]">
            {data.map((row, rIdx) => (
              <tr
                key={row[keyField] ?? rIdx}
                className="h-14 hover:bg-[#E8EBF7]/30 transition-colors"
              >
                {columns.map((col, cIdx) => (
                  <td
                    key={cIdx}
                    className={`px-4 py-3 whitespace-nowrap ${col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left'} ${col.tdClassName || ''}`}
                  >
                    {col.render ? col.render(row) : row[col.accessor]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
