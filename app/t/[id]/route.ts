import { NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase/server";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  const id = resolvedParams.id;
  
  if (!id) {
    return NextResponse.redirect(new URL("/plan", req.url));
  }

  const sb = getServerSupabase();
  if (!sb) {
    return NextResponse.redirect(new URL("/plan", req.url));
  }

  try {
    const { data, error } = await sb
      .from("shared_link")
      .select("state_qs")
      .eq("id", id)
      .single();

    if (error || !data) {
      // If link not found, just go back to default plan
      return NextResponse.redirect(new URL("/plan", req.url));
    }

    return NextResponse.redirect(new URL(`/plan?${data.state_qs}`, req.url));
  } catch (err) {
    return NextResponse.redirect(new URL("/plan", req.url));
  }
}
