'use client';
import { useState, useEffect } from 'react';

export function useArcStats(address: string) {
  const [data, setData] = useState({ sent: '0.00', received: '0.00' });

  useEffect(() => {
    const calculate = () => {
      const history = JSON.parse(localStorage.getItem('arcpay_history') || '[]');
      let sentTotal = 0;
      let receivedTotal = 0;

      history.forEach((tx: any) => {
        if (tx.from?.toLowerCase() === address?.toLowerCase()) {
          sentTotal += parseFloat(tx.amount || 0);
        }
        if (tx.to?.toLowerCase() === address?.toLowerCase()) {
          receivedTotal += parseFloat(tx.amount || 0);
        }
      });

      setData({
        sent: sentTotal.toFixed(2),
        received: receivedTotal.toFixed(2)
      });
    };

    calculate();
    window.addEventListener('storage', calculate);
    const inv = setInterval(calculate, 5000);
    return () => { clearInterval(inv); window.removeEventListener('storage', calculate); };
  }, [address]);

  return data;
}
