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
      <div className="py-12 text-center text-[#6B7280] text-sm bg-[#F9FAFB] rounded-[12px] border border-dashed border-[#E5E7EB]">
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
            className="bg-white p-4 rounded-[12px] border border-[#E5E7EB] shadow-[0_1px_2px_rgba(0,0,0,0.05)] space-y-2"
          >
            {mobileCardRender ? (
              mobileCardRender(row, idx)
            ) : (
              columns.map((col, cIdx) => (
                <div key={cIdx} className="flex justify-between items-center text-[14px] py-1.5 border-b border-[#F3F4F6] last:border-0">
                  <span className="font-medium text-[#6B7280]">{col.header}</span>
                  <span className="font-semibold text-[#111827] text-right">
                    {col.render ? col.render(row) : row[col.accessor]}
                  </span>
                </div>
              ))
            )}
          </div>
        ))}
      </div>

      {/* Desktop / Tablet Table View (hidden below md: 768px) */}
      <div className="hidden md:block overflow-x-auto rounded-[12px] border border-[#E5E7EB] bg-white">
        <table className={`min-w-full w-full text-left table-text text-[14px] text-[#111827] tabular-nums ${className}`}>
          <thead className="bg-[#F9FAFB] border-b border-[#E5E7EB] table-header text-[12px] font-semibold text-[#6B7280] uppercase tracking-[0.05em]">
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
          <tbody className="divide-y divide-[#F3F4F6]">
            {data.map((row, rIdx) => (
              <tr
                key={row[keyField] ?? rIdx}
                className="min-h-[58px] hover:bg-gray-50/70 transition-colors"
              >
                {columns.map((col, cIdx) => (
                  <td
                    key={cIdx}
                    className={`px-4 py-3.5 whitespace-nowrap ${col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left'} ${col.tdClassName || ''}`}
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
