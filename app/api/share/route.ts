import { NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase/server";

export async function POST(req: Request) {
  try {
    const { stateQs } = await req.json();
    if (!stateQs || typeof stateQs !== "string") {
      return NextResponse.json({ error: "Invalid stateQs" }, { status: 400 });
    }

    const sb = getServerSupabase();
    if (!sb) {
      return NextResponse.json({ error: "Supabase not configured" }, { status: 500 });
    }

    // Generate a simple 6-character random ID (alphanumeric)
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let id = '';
    for (let i = 0; i < 6; i++) {
      id += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    const { error } = await sb.from("shared_link").insert({ id, state_qs: stateQs });
    
    if (error) {
      console.error("Error creating shared link", error);
      return NextResponse.json({ error: "Database error" }, { status: 500 });
    }

    return NextResponse.json({ id });
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
