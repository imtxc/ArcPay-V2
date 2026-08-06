import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const address = searchParams.get('address')?.toLowerCase();

    if (!address) {
      return Response.json({ requests: [] });
    }

    const { data: requests, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('from_addr', address)
      .order('timestamp', { ascending: false })
      .limit(20);

    if (error) throw error;

    return Response.json({ requests: requests || [] });
  } catch (err) {
    console.error("Outgoing API error:", err.message);
    return Response.json({ requests: [] }, { status: 500 });
  }
}
