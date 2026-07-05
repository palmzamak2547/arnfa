import { getClientSupabase } from "@/lib/supabase/client";

export type Expense = {
  id: string;
  shared_link_id: string;
  title: string;
  amount: number;
  payer_name: string;
  created_at: string;
};

export async function fetchExpenses(sharedLinkId: string): Promise<Expense[]> {
  const sb = getClientSupabase();
  if (!sb) return [];
  
  const { data, error } = await sb
    .from("expense")
    .select("*")
    .eq("shared_link_id", sharedLinkId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching expenses:", error);
    return [];
  }
  return data as Expense[];
}

export async function addExpense(sharedLinkId: string, title: string, amount: number, payer_name: string): Promise<Expense | null> {
  const sb = getClientSupabase();
  if (!sb) return null;

  const { data, error } = await sb
    .from("expense")
    .insert({ shared_link_id: sharedLinkId, title, amount, payer_name })
    .select()
    .single();

  if (error) {
    console.error("Error adding expense:", error);
    return null;
  }
  return data as Expense;
}

export async function deleteExpense(id: string): Promise<boolean> {
  const sb = getClientSupabase();
  if (!sb) return false;

  const { error } = await sb.from("expense").delete().eq("id", id);
  if (error) {
    console.error("Error deleting expense:", error);
    return false;
  }
  return true;
}
