"use client";

import { useState, useEffect } from "react";
import { fetchExpenses, addExpense, deleteExpense, type Expense } from "@/lib/plan/budgetClient";

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

  const total = expenses.reduce((acc, curr) => acc + curr.amount, 0);

  if (!isOpen) {
    return (
      <button 
        onClick={() => setIsOpen(true)}
        className="font-thai rounded-full px-4 py-2 text-sm transition-colors duration-[var(--dur-fast)] min-h-[44px] bg-surface border border-hairline text-ink hover:bg-surface-hover flex items-center gap-2"
      >
        <span>💸</span>
        {en ? "Trip Budget & Splitting" : "จัดการค่าใช้จ่ายทริป"}
        {total > 0 && <span className="font-semibold text-rain ml-1">฿{total.toFixed(2)}</span>}
      </button>
    );
  }

  return (
    <div className="font-thai bg-surface border border-hairline rounded-3xl p-5 shadow-sm max-w-sm w-full mt-2">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-ink font-semibold flex items-center gap-2">
          <span>💸</span> {en ? "Trip Budget" : "ค่าใช้จ่ายทริป"}
        </h3>
        <button onClick={() => setIsOpen(false)} className="text-ink-faint hover:text-ink">
          ✕
        </button>
      </div>
      
      <div className="bg-ink/5 rounded-2xl p-4 flex flex-col items-center justify-center mb-5">
        <span className="text-xs text-ink-muted uppercase tracking-wider">{en ? "Total Expenses" : "ยอดรวมทั้งหมด"}</span>
        <span className="font-display text-2xl text-ink font-semibold">฿{total.toFixed(2)}</span>
      </div>

      <form onSubmit={handleAdd} className="flex flex-col gap-3 mb-5">
        <input 
          type="text" 
          placeholder={en ? "What did we pay for?" : "ค่าอะไรเอ่ย?"}
          value={title}
          onChange={e => setTitle(e.target.value)}
          className="bg-paper border border-hairline rounded-xl px-3 py-2 text-sm text-ink outline-none"
          disabled={loading}
        />
        <div className="flex gap-2">
          <input 
            type="number" 
            placeholder={en ? "Amount" : "จำนวนเงิน"}
            value={amount}
            onChange={e => setAmount(e.target.value)}
            className="flex-1 bg-paper border border-hairline rounded-xl px-3 py-2 text-sm text-ink outline-none"
            disabled={loading}
            min="1"
          />
          <input 
            type="text" 
            placeholder={en ? "Who paid?" : "ใครจ่าย?"}
            value={payer}
            onChange={e => setPayer(e.target.value)}
            className="flex-1 bg-paper border border-hairline rounded-xl px-3 py-2 text-sm text-ink outline-none"
            disabled={loading}
          />
        </div>
        <button 
          type="submit" 
          disabled={loading || !title || !amount || !payer}
          className="bg-ink text-paper rounded-xl px-4 py-2 text-sm transition-colors hover:bg-ink-muted disabled:opacity-50"
        >
          {en ? "Add Expense" : "เพิ่มรายการ"}
        </button>
      </form>

      <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
        {expenses.length === 0 && (
          <p className="text-center text-xs text-ink-faint italic">{en ? "No expenses yet." : "ยังไม่มีรายการค่าใช้จ่าย"}</p>
        )}
        {expenses.map(e => (
          <div key={e.id} className="flex items-center justify-between bg-paper border border-hairline rounded-xl p-3">
            <div>
              <p className="text-sm font-medium text-ink">{e.title}</p>
              <p className="text-[10px] text-ink-muted">{en ? "Paid by " : "จ่ายโดย "}<span className="font-semibold">{e.payer_name}</span></p>
            </div>
            <div className="flex items-center gap-3">
              <span className="font-display font-medium text-sm text-ink">฿{e.amount}</span>
              <button onClick={() => handleDelete(e.id)} className="text-[10px] text-indoor-warm hover:underline">
                {en ? "Del" : "ลบ"}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
