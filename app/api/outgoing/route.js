import { createClient } from '@supabase/supabase-js';

export async function GET(request) {
  // 1. Env variables ko function ke andar nikaalein
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY; // Matching your .env.local

  if (!supabaseUrl || !supabaseKey) {
    console.error("❌ ERROR: Supabase Config missing. Check .env.local names!");
    return Response.json({ requests: [], error: "Server Configuration Error" }, { status: 500 });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    const { searchParams } = new URL(request.url);
    const address = searchParams.get('address')?.toLowerCase();

    if (!address) return Response.json({ requests: [] });

    // Database query
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .or(`from_addr.eq.${address},to_addr.eq.${address}`)
      .order('timestamp', { ascending: false })
      .limit(50);

    if (error) throw error;

    // BigInt safety formatting
    const formattedRequests = (data || []).map(tx => ({
      ...tx,
      amount: tx.amount?.toString() || "0",
      blockNumber: tx.blockNumber?.toString() || "0",
      isIncoming: tx.to_addr?.toLowerCase() === address.toLowerCase()
    }));

    return Response.json({ requests: formattedRequests });

  } catch (err) {
    console.error("❌ API Crash:", err.message);
    return Response.json({ requests: [], error: err.message }, { status: 500 });
  }
}