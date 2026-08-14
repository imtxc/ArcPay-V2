import { createClient } from '@supabase/supabase-js';

export async function GET(request) {
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  try {
    const { searchParams } = new URL(request.url);
    const address = searchParams.get('address')?.toLowerCase();
    if (!address) return Response.json({ transactions: [] });

    // Sirf raw transactions uthao (No Joins, No Profile Lookup)
    const { data: txData, error: txError } = await supabase
      .from('transactions')
      .select('hash, amount, from_addr, to_addr, timestamp')
      .or(`from_addr.eq.${address},to_addr.eq.${address}`)
      .order('timestamp', { ascending: false })
      .limit(20); // Sirf 20 taaki super fast ho

    if (txError) throw txError;

    const formatted = (txData || []).map((tx) => ({
      hash: tx.hash,
      amount: (Number(tx.amount || 0) / 1e6).toFixed(2),
      timestamp: tx.timestamp,
      from_addr: tx.from_addr.toLowerCase(),
      to_addr: tx.to_addr.toLowerCase(),
      isIncoming: tx.to_addr.toLowerCase() === address,
      type: 'transfer'
    }));

    return Response.json({ transactions: formatted });
  } catch (err) {
    return Response.json({ transactions: [], error: err.message }, { status: 500 });
  }
}