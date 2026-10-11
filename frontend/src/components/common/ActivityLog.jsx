import React, { useState, useEffect } from 'react';
import { History, User, Clock, ArrowRight, MessageSquare, Send } from 'lucide-react';
import { api } from '../../api/client';
import { Badge } from './Badge';

export function ActivityLog({
  entity = 'Order',
  entityId = null,
  entityIdentifier = '',
  initialLogs = [],
  className = ''
}) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newNote, setNewNote] = useState('');
  const [notes, setNotes] = useState([]);

  useEffect(() => {
    let isMounted = true;

    const fetchLogs = async () => {
      try {
        setLoading(true);
        const res = await api.getAuditTrail();
        if (!isMounted) return;

        const allLogs = Array.isArray(res) ? res : [];
        // Filter logs matching entity or mentioning identifier
        const matched = allLogs.filter((l) => {
          if (entityId && l.entity_id === entityId) return true;
          if (entity && l.entity?.toLowerCase() === entity.toLowerCase()) {
            if (!entityIdentifier) return true;
            return (
              (l.before_state && l.before_state.includes(entityIdentifier)) ||
              (l.after_state && l.after_state.includes(entityIdentifier))
            );
          }
          if (entityIdentifier) {
            return (
              (l.before_state && l.before_state.includes(entityIdentifier)) ||
              (l.after_state && l.after_state.includes(entityIdentifier))
            );
          }
          return false;
        });

        setLogs(matched);
      } catch (err) {
        console.error('Error fetching audit logs:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchLogs();
    return () => {
      isMounted = false;
    };
  }, [entity, entityId, entityIdentifier]);

  const handleAddNote = (e) => {
    e.preventDefault();
    if (!newNote.trim()) return;
    const noteEntry = {
      id: Date.now(),
      user: 'Supervisor',
      action: 'ADD_NOTE',
      timestamp: new Date().toISOString(),
      before_state: null,
      after_state: newNote.trim()
    };
    setNotes((prev) => [noteEntry, ...prev]);
    setNewNote('');
  };

  const allDisplayLogs = [...notes, ...logs];

  return (
    <div className={`bg-white rounded-[12px] border border-[#E5E7EB] p-4 shadow-xs flex flex-col h-full ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-[#F3F4F6]">
        <div className="flex items-center gap-2">
          <History className="w-4 h-4 text-[#2F3E8F]" />
          <h3 className="font-bold text-sm text-[#111827]">Activity Log</h3>
        </div>
        <Badge variant="neutral" size="sm">
          {allDisplayLogs.length} updates
        </Badge>
      </div>

      {/* Add note / comment input */}
      <form onSubmit={handleAddNote} className="pt-3 pb-2">
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
            placeholder="Log an internal shift note..."
            className="flex-1 bg-[#F9FAFB] border border-[#E5E7EB] rounded-[8px] px-3 py-1.5 text-xs text-[#111827] focus:outline-none focus:border-[#2F3E8F]"
          />
          <button
            type="submit"
            disabled={!newNote.trim()}
            className="p-1.5 bg-[#2F3E8F] text-white rounded-[8px] hover:bg-[#232F70] disabled:opacity-40 transition-colors cursor-pointer"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </div>
      </form>

      {/* Timeline items list */}
      <div className="flex-1 min-h-0 overflow-y-auto pt-2 space-y-3.5 pr-1 max-h-[460px]">
        {allDisplayLogs.length === 0 ? (
          <div className="py-8 text-center text-xs text-[#6B7280] space-y-1">
            <Clock className="w-5 h-5 mx-auto text-gray-300" />
            <p>No activity records logged for this {entity.toLowerCase()} yet.</p>
            <p className="text-[11px] text-gray-400">All lifecycle status changes and inspections will be recorded here.</p>
          </div>
        ) : (
          allDisplayLogs.map((item, idx) => {
            const timeStr = item.timestamp
              ? new Date(item.timestamp).toLocaleString(undefined, {
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })
              : 'Recently';

            return (
              <div key={item.id || idx} className="flex items-start gap-2.5 text-xs">
                {/* User icon circle */}
                <div className="w-6 h-6 rounded-full bg-[#EEF2FF] text-[#2F3E8F] flex items-center justify-center shrink-0 mt-0.5 font-bold text-[10px]">
                  {item.user ? item.user.charAt(0) : 'U'}
                </div>

                <div className="flex-1 min-w-0 bg-[#F9FAFB] p-2.5 rounded-[8px] border border-[#E5E7EB] space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-[#111827] truncate">
                      {item.user || 'System'}
                    </span>
                    <span className="text-[10px] text-[#9CA3AF] shrink-0 font-mono">
                      {timeStr}
                    </span>
                  </div>

                  {item.action && (
                    <div className="inline-block px-1.5 py-0.5 rounded text-[10px] font-mono font-medium bg-gray-200 text-gray-700">
                      {item.action}
                    </div>
                  )}

                  {/* Changes diff: before and after values */}
                  {item.before_state && (
                    <div className="text-[11px] text-[#6B7280] flex items-center gap-1.5 flex-wrap">
                      <span className="px-1.5 py-0.5 bg-rose-50 text-rose-700 rounded border border-rose-200 line-through">
                        {item.before_state}
                      </span>
                      <ArrowRight className="w-3 h-3 text-gray-400" />
                      <span className="px-1.5 py-0.5 bg-emerald-50 text-emerald-700 rounded border border-emerald-200 font-medium">
                        {item.after_state}
                      </span>
                    </div>
                  )}

                  {!item.before_state && item.after_state && (
                    <div className="text-[11px] text-[#374151] leading-relaxed">
                      {item.after_state}
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
