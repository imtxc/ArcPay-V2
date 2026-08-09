import { createClient } from '@supabase/supabase-js';
import { formatUnits } from 'viem';

export async function GET(request) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY; // Use Service Role for backend

  if (!supabaseUrl || !supabaseKey) {
    return Response.json({ spent: "0.00", received: "0.00", bars: [] }, { status: 500 });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseKey);
    const { searchParams } = new URL(request.url);
    const address = searchParams.get('address')?.toLowerCase();

    if (!address) return Response.json({ spent: "0.00", received: "0.00", bars: [] });

    // 1. Database se transactions nikaalein
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .or(`from_addr.eq.${address},to_addr.eq.${address}`)
      .order('timestamp', { ascending: false });

    if (error) throw error;

    let totalSpent = 0;
    let totalReceived = 0;

    // 2. Hisaab kitab karein (Math Logic)
    const formattedRequests = (data || []).map(tx => {
      const isIncoming = tx.to_addr?.toLowerCase() === address;
      
      // ✅ DECIMALS FIX: 6 decimals use kar rahe hain
      const amountNum = parseFloat(formatUnits(BigInt(tx.amount || 0), 6));

      if (isIncoming) {
        totalReceived += amountNum;
      } else {
        totalSpent += amountNum;
      }

      return {
        ...tx,
        amount: amountNum.toFixed(2),
        isIncoming
      };
    });

    // 3. Graph ke liye dummy bars data (Ya aap real logic bhi daal sakte hain)
    const bars = [40, 70, 45, 90, 65, 30, 85]; 

    // ✅ FINAL RESPONSE: Jo Insights.tsx ko chahiye
    return Response.json({ 
      spent: totalSpent.toFixed(2), 
      received: totalReceived.toFixed(2), 
      requests: formattedRequests,
      bars: bars
    });

  } catch (err) {
    console.error("❌ API Crash:", err.message);
    return Response.json({ spent: "0.00", received: "0.00", bars: [] }, { status: 500 });
  }
}