import { createClient } from '@supabase/supabase-js';

export async function GET(request) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  try {
    const { searchParams } = new URL(request.url);
    const address = searchParams.get('address')?.toLowerCase();

    if (!address) {
      return Response.json({ requests: [] });
    }

    // 1. Sirf wahi requests fetch karo jo is user ko bheji gayi hain (to_addr) 
    // aur jinka status 'Pending' hai
    const { data: reqData, error: reqError } = await supabase
      .from('payment_requests')
      .select('*')
      .eq('to_addr', address)
      .eq('status', 'Pending')
      .order('timestamp', { ascending: false });

    if (reqError) {
      console.error('Incoming Requests Error:', reqError);
      return Response.json({ requests: [] }, { status: 500 });
    }

    // 2. Un logo ke addresses nikaalo jinhone request bheji hai (from_addr)
    const requesterAddresses = reqData.map(tx => tx.from_addr.toLowerCase());

    // 3. Profiles table se unka Username le kar aao
    const { data: profiles } = await supabase
      .from('profiles') 
      .select('wallet_address, username')
      .in('wallet_address', requesterAddresses);

    const profileMap = Object.fromEntries(
      (profiles || []).map(p => [p.wallet_address.toLowerCase(), p.username])
    );

    // 4. Data format karo
    const formatted = (reqData || []).map((tx) => {
      const requesterAddr = tx.from_addr.toLowerCase();
      const displayUsername = profileMap[requesterAddr] || 
                             `${requesterAddr.slice(0, 6)}...${requesterAddr.slice(-4)}`;

      return {
        ...tx,
        amount: (Number(tx.amount || 0) / 1e6).toFixed(2), // USDC Decimals
        username: displayUsername, // Kisne paise maange hain? Uska naam
        type: 'incoming_request',
        status: tx.status || 'Pending'
      };
    });

    return Response.json({ requests: formatted });

  } catch (err) {
    console.error('Incoming API Crash:', err);
    return Response.json({ requests: [], error: 'Internal Server Error' }, { status: 500 });
  }
}