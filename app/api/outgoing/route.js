import { createClient } from '@supabase/supabase-js';

export async function GET(request) {
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  try {
    const { searchParams } = new URL(request.url);
    const address = searchParams.get('address')?.toLowerCase();
    if (!address) return Response.json({ requests: [] });

    const { data, error } = await supabase
      .from('payment_requests')
      .select('*')
      .or(`from_addr.ilike.${address},to_addr.ilike.${address}`)
      .order('timestamp', { ascending: false });

    if (error) throw error;

    const formatted = (data || []).map((tx) => {
      const isRequester = tx.from_addr.toLowerCase() === address;
      let sign = "";
      if (tx.status === 'Accepted') sign = isRequester ? "+" : "-";

      return {
        ...tx,
        amount: (Number(tx.amount || 0) / 1e6).toFixed(2),
        sign,
        isRequester
      };
    });

    return Response.json({ requests: formatted });
  } catch (err) {
    return Response.json({ requests: [] });
  }
}