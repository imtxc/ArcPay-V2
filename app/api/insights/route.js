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
      return Response.json({ spent: '0.00', received: '0.00', bars: [25, 45, 30, 70, 55, 90, 40] });
    }

    const { data: transactions, error } = await supabase
      .from('transactions')
      .select('*')
      .or(`from_addr.eq.${address},to_addr.eq.${address}`);

    if (error) throw error;

    let outflow = 0;
    let inflow = 0;

    transactions.forEach((tx) => {
      const amount = parseFloat(tx.amount || 0) / 1e6;
      if (tx.from_addr?.toLowerCase() === address) outflow += amount;
      if (tx.to_addr?.toLowerCase() === address) inflow += amount;
    });

    const max = Math.max(outflow, inflow, 1);
    const bars = [40, 60, 45, 90, 70, 100, 55].map(v => Math.max(v * (outflow / max || 1), 15));

    return Response.json({
      spent: outflow.toFixed(2),
      received: inflow.toFixed(2),
      bars
    });
  } catch (err) {
    console.error("Insights API error:", err.message);
    return Response.json({ spent: '0.00', received: '0.00', bars: [25, 45, 30, 70, 55, 90, 40] }, { status: 500 });
  }
}
