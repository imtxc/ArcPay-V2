'use client';
import { useState, useEffect } from 'react';
import { UserPlus, Trash2, CreditCard, X } from 'lucide-react';

export default function SavedHub({ showToast, onPay, onRequest }: any) {
  const [contacts, setContacts] = useState<any[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');

  useEffect(() => {
    const saved = localStorage.getItem('arc_contacts');
    if (saved) {
      try {
        setContacts(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to parse saved contacts:", e);
      }
    }
  }, []);

  const addContact = () => {
    const trimmedName = name.trim();
    const trimmedUsername = username.trim();

    if (!trimmedName || !trimmedUsername) {
      if (showToast) showToast("Please fill in all fields", "error");
      return;
    }

    const cleanUser = trimmedUsername.startsWith('@') ? trimmedUsername : `@${trimmedUsername}`;
    
    // Prevent duplicate usernames
    if (contacts.some(c => c.username.toLowerCase() === cleanUser.toLowerCase())) {
      if (showToast) showToast("Contact already exists", "error");
      return;
    }

    const newContacts = [...contacts, { name: trimmedName, username: cleanUser.toLowerCase() }];
    setContacts(newContacts);
    localStorage.setItem('arc_contacts', JSON.stringify(newContacts));
    
    setName(''); 
    setUsername(''); 
    setIsAdding(false);
    
    if (showToast) showToast("Contact Secured");
  };

  const deleteContact = (index: number) => {
    const newContacts = contacts.filter((_, i) => i !== index);
    setContacts(newContacts);
    localStorage.setItem('arc_contacts', JSON.stringify(newContacts));
    if (showToast) showToast("Contact Removed");
  };

  return (
    <div className="p-8 space-y-8 text-left bg-transparent font-sans">
      <div className="flex justify-between items-center pl-2 pr-24">
        <h3 className="text-xl font-black uppercase italic text-white leading-none">Saved Hub</h3>
        <button onClick={() => setIsAdding(!isAdding)} className="p-2 bg-blue-600 text-white rounded-xl hover:bg-blue-500 transition-all shadow-xl">
          {isAdding ? <X size={16}/> : <UserPlus size={16}/>}
        </button>
      </div>

      {isAdding && (
        <div className="bg-white/5 border border-white/10 p-6 rounded-[32px] space-y-4 animate-in slide-in-from-top-4 duration-300">
          <div className="grid grid-cols-2 gap-4">
            <input 
              value={name} 
              onChange={e => setName(e.target.value)} 
              placeholder="Name" 
              className="w-full bg-black/40 border border-white/5 p-4 rounded-xl text-xs outline-none focus:border-blue-500/50 text-white" 
            />
            <input 
              value={username} 
              onChange={e => setUsername(e.target.value)} 
              placeholder="@username" 
              className="w-full bg-black/40 border border-white/5 p-4 rounded-xl text-xs outline-none focus:border-blue-500/50 text-blue-400 font-bold" 
            />
          </div>
          <button onClick={addContact} className="w-full bg-blue-600 hover:bg-blue-500 py-3.5 rounded-[15px] font-black uppercase italic tracking-widest text-[10px] text-white transition-all shadow-lg">Save Contact</button>
        </div>
      )}

      <div className="space-y-3">
        {contacts.length === 0 ? (
          <div className="py-10 text-center opacity-10 uppercase font-black text-[10px] text-white">Empty</div>
        ) : (
          contacts.map((contact, i) => (
            <div key={i} className="bg-black/40 border border-white/5 p-5 rounded-[32px] flex items-center justify-between group hover:bg-white/[0.05] transition-all">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-slate-800 rounded-2xl flex items-center justify-center font-black text-blue-500 border border-white/5 uppercase italic">
                  {contact.name?.[0] || '?'}
                </div>
                <div className="text-left">
                  <p className="text-[14px] font-black text-white italic uppercase leading-none">{contact.name}</p>
                  <p className="text-[10px] text-slate-500 font-bold lowercase mt-1">{contact.username}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => onRequest(contact.username)} className="px-3 py-2 bg-blue-600/10 hover:bg-blue-600/20 text-blue-500 rounded-xl transition-all text-[9px] font-black uppercase italic">REQ</button>
                <button onClick={() => onPay(contact.username)} className="p-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-500 transition-all shadow-lg"><CreditCard size={14}/></button>
                <button onClick={() => deleteContact(i)} className="p-2 text-slate-700 hover:text-red-500 transition-colors"><Trash2 size={14}/></button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}