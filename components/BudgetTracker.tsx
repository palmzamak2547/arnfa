"use client";

import { useState, useEffect, useMemo } from "react";
import { fetchExpenses, addExpense, deleteExpense, type Expense } from "@/lib/plan/budgetClient";
import { clsx } from "clsx";

// --- Custom Icons (TREK aesthetic) ---
const WalletIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a8 8 0 0 1-5-2.2M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><path d="M22 10v4a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-4a2 2 0 0 1 2-2h1a2 2 0 0 1 2 2z"/>
  </svg>
);
const TrendingUpIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/>
  </svg>
);
const TrendingDownIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="22 17 13.5 8.5 8.5 13.5 2 7"/><polyline points="16 17 22 17 22 11"/>
  </svg>
);
const TrashIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>
  </svg>
);
const PieChartIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21.21 15.89A10 10 0 1 1 8 2.83"/><path d="M22 12A10 10 0 0 0 12 2v10z"/>
  </svg>
);

const PALETTE = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#14b8a6"];

export function BudgetTracker({ sharedLinkId, en }: { sharedLinkId: string, en?: boolean }) {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [payer, setPayer] = useState("");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchExpenses(sharedLinkId).then(data => {
      if (!cancelled) {
        setExpenses(data);
        setLoading(false);
      }
    });
    return () => { cancelled = true; };
  }, [sharedLinkId]);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!title || !amount || !payer) return;
    
    const amt = parseFloat(amount);
    if (isNaN(amt) || amt <= 0) return;

    setLoading(true);
    const newExpense = await addExpense(sharedLinkId, title, amt, payer);
    if (newExpense) {
      setExpenses([newExpense, ...expenses]);
      setTitle("");
      setAmount("");
    }
    setLoading(false);
  }

  async function handleDelete(id: string) {
    const success = await deleteExpense(id);
    if (success) {
      setExpenses(expenses.filter(x => x.id !== id));
    }
  }

  // --- Derived Data for UI ---
  const total = useMemo(() => expenses.reduce((acc, curr) => acc + curr.amount, 0), [expenses]);
  
  const payerTotals = useMemo(() => {
    const totals: Record<string, number> = {};
    expenses.forEach(e => {
      totals[e.payer_name] = (totals[e.payer_name] || 0) + e.amount;
    });
    return totals;
  }, [expenses]);

  const uniquePayers = Object.keys(payerTotals);
  const fairShare = uniquePayers.length > 0 ? total / uniquePayers.length : 0;
  
  const pieSegments = useMemo(() => {
    return uniquePayers.map((name, i) => ({
      name,
      value: payerTotals[name],
      color: PALETTE[i % PALETTE.length]
    })).sort((a, b) => b.value - a.value);
  }, [payerTotals, uniquePayers]);

  if (!isOpen) {
    return (
      <button 
        onClick={() => setIsOpen(true)}
        className="font-thai rounded-full px-5 py-2.5 text-sm transition-all duration-[var(--dur-fast)] min-h-[44px] bg-surface border border-hairline text-ink hover:bg-surface-hover flex items-center gap-2.5 shadow-sm"
      >
        <div className="bg-ink text-paper p-1.5 rounded-full"><WalletIcon /></div>
        <span className="font-medium">{en ? "Trip Budget & Splitting" : "จัดการค่าใช้จ่ายทริป"}</span>
        {total > 0 && <span className="font-display font-semibold text-ink bg-ink/5 px-2 py-0.5 rounded-full ml-1">฿{total.toFixed(0)}</span>}
      </button>
    );
  }

  // Donut Chart logic
  const R = 60;
  const CIRC = 2 * Math.PI * R;
  let dashOffset = 0;

  return (
    <div className="font-thai bg-surface border border-hairline rounded-[2rem] p-6 shadow-md w-full animate-in fade-in zoom-in-95 duration-200">
      
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-ink/5 border border-hairline flex items-center justify-center text-ink">
            <WalletIcon />
          </div>
          <h3 className="text-ink font-semibold tracking-wide text-lg">
            {en ? "Budget & Settlement" : "สรุปค่าใช้จ่าย"}
          </h3>
        </div>
        <button onClick={() => setIsOpen(false)} className="text-ink-faint hover:text-ink transition-colors p-2 bg-ink/5 rounded-full hover:bg-ink/10">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Left Column: Summary & Settlement */}
        <div className="space-y-6">
          
          {/* Total Display */}
          <div className="bg-paper border border-hairline rounded-[1.5rem] p-6 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-[10px] text-ink-faint uppercase tracking-[0.1em] font-bold mb-1">{en ? "Total Budget" : "ยอดรวมค่าใช้จ่าย"}</p>
              <div className="flex items-baseline gap-1 font-display tracking-tight">
                <span className="text-4xl font-bold text-ink">฿{Math.floor(total)}</span>
                <span className="text-xl font-medium text-ink-muted">.{(total % 1).toFixed(2).substring(2)}</span>
              </div>
            </div>
            
            {/* Donut Chart */}
            <div className="relative w-[140px] h-[140px]">
              <svg width="140" height="140" viewBox="0 0 140 140" className="-rotate-90 drop-shadow-sm">
                <circle cx="70" cy="70" r={R} fill="none" stroke="var(--arnfa-hairline)" strokeWidth="12" />
                {pieSegments.map((seg, i) => {
                  const segLen = total > 0 ? (seg.value / total) * CIRC : 0;
                  const circle = (
                    <circle key={i}
                      cx="70" cy="70" r={R}
                      fill="none" strokeLinecap="round" strokeWidth="12"
                      stroke={seg.color}
                      strokeDasharray={`${segLen} ${CIRC}`}
                      strokeDashoffset={-dashOffset}
                      className="transition-all duration-500"
                    />
                  );
                  dashOffset += segLen;
                  return circle;
                })}
              </svg>
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none text-ink-faint">
                <PieChartIcon />
              </div>
            </div>
          </div>

          {/* Settlement / Net Balances */}
          {uniquePayers.length > 0 && (
            <div className="bg-paper border border-hairline rounded-[1.5rem] p-5 shadow-sm">
              <div className="text-[10px] text-ink-faint uppercase tracking-[0.1em] font-bold mb-3">{en ? "Net Balances (Fair Split)" : "ยอดเคลียร์บิล (หารเท่า)"}</div>
              <div className="space-y-2">
                {uniquePayers.map(name => {
                  const balance = payerTotals[name] - fairShare;
                  const isPositive = balance >= -0.01; // fuzzy zero
                  const Icon = isPositive ? TrendingUpIcon : TrendingDownIcon;
                  return (
                    <div key={name} className="flex items-center justify-between py-1.5 border-b border-hairline last:border-0">
                      <div className="flex items-center gap-3">
                        <div className="w-7 h-7 rounded-full bg-surface border border-hairline flex items-center justify-center text-xs font-bold text-ink shadow-sm">
                          {name.charAt(0).toUpperCase()}
                        </div>
                        <span className="text-sm font-medium text-ink">{name}</span>
                      </div>
                      <span className={clsx(
                        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-display font-bold tracking-tight",
                        isPositive ? "bg-success/15 text-success" : "bg-[#ef444415] text-[#ef4444]"
                      )}>
                        <Icon />
                        {isPositive ? '+' : ''}฿{balance.toFixed(2)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

        </div>

        {/* Right Column: Form & History */}
        <div className="bg-paper border border-hairline rounded-[1.5rem] p-5 shadow-sm flex flex-col h-full max-h-[500px]">
          
          <form onSubmit={handleAdd} className="flex flex-col gap-3 mb-5 shrink-0">
            <input 
              type="text" 
              placeholder={en ? "What did we pay for?" : "ค่าอะไรเอ่ย? (เช่น ค่าแท็กซี่)"}
              value={title}
              onChange={e => setTitle(e.target.value)}
              className="bg-surface border border-hairline rounded-xl px-4 py-3 text-sm text-ink outline-none focus:border-ink/30 transition-colors shadow-inner"
              disabled={loading}
            />
            <div className="flex gap-2">
              <div className="relative flex-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted font-display text-sm font-semibold">฿</span>
                <input 
                  type="number" 
                  placeholder={en ? "Amount" : "จำนวนเงิน"}
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                  className="w-full bg-surface border border-hairline rounded-xl pl-7 pr-3 py-3 text-sm text-ink outline-none focus:border-ink/30 transition-colors shadow-inner font-display"
                  disabled={loading}
                  min="1"
                  step="0.01"
                />
              </div>
              <input 
                type="text" 
                placeholder={en ? "Who paid?" : "ใครเป็นคนจ่าย?"}
                value={payer}
                onChange={e => setPayer(e.target.value)}
                className="flex-1 bg-surface border border-hairline rounded-xl px-3 py-3 text-sm text-ink outline-none focus:border-ink/30 transition-colors shadow-inner"
                disabled={loading}
              />
            </div>
            <button 
              type="submit" 
              disabled={loading || !title || !amount || !payer}
              className="bg-ink text-paper rounded-xl px-4 py-3 text-sm font-medium transition-all hover:bg-ink-muted disabled:opacity-50 active:scale-[0.98] shadow-md"
            >
              {en ? "Add Expense" : "เพิ่มรายการ"}
            </button>
          </form>

          <div className="text-[10px] text-ink-faint uppercase tracking-[0.1em] font-bold mb-3 shrink-0">{en ? "Expense History" : "ประวัติค่าใช้จ่าย"}</div>
          <div className="space-y-3 overflow-y-auto pr-2 pb-2 flex-1 scrollbar-thin">
            {expenses.length === 0 && (
              <div className="h-full flex flex-col items-center justify-center opacity-50">
                <WalletIcon />
                <p className="mt-2 text-center text-xs text-ink-faint italic">{en ? "No expenses yet." : "ยังไม่มีรายการค่าใช้จ่าย"}</p>
              </div>
            )}
            {expenses.map(e => (
              <div key={e.id} className="group flex items-center justify-between bg-surface border border-hairline rounded-2xl p-3.5 transition-all hover:shadow-sm hover:border-ink/20">
                <div>
                  <p className="text-sm font-medium text-ink leading-tight mb-1">{e.title}</p>
                  <p className="text-[10px] text-ink-muted">{en ? "Paid by " : "จ่ายโดย "}<span className="font-semibold text-ink/80">{e.payer_name}</span></p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-display font-semibold text-[15px] text-ink tracking-tight">฿{e.amount}</span>
                  <button onClick={() => handleDelete(e.id)} className="text-indoor-warm opacity-0 group-hover:opacity-100 transition-opacity p-1.5 hover:bg-indoor-warm/10 rounded-md">
                    <TrashIcon />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
