import { useState } from 'react';
import { BarChart3, Boxes, ReceiptText } from 'lucide-react';
import { Billing } from './components/billing/Billing';
import { Inventory } from './components/inventory/Inventory';
import { Analytics } from './components/analytics/Analytics';
import type { Tab } from './types/pos';

const nav: { id: Tab; label: string; icon: typeof ReceiptText }[] = [
  { id: 'billing', label: 'Billing', icon: ReceiptText },
  { id: 'inventory', label: 'Inventory', icon: Boxes },
  { id: 'analytics', label: 'Analytics', icon: BarChart3 },
];

export default function App() {
  const [tab, setTab] = useState<Tab>('billing');
  return <div className="min-h-screen bg-slate-50 text-slate-900">
    <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-[1600px] items-center justify-between px-4 sm:px-6">
        <div><div className="font-bold tracking-tight">Retail POS</div><div className="text-xs text-slate-500">Billing · Inventory · Analytics</div></div>
        <nav className="flex gap-1 rounded-xl bg-slate-100 p-1">{nav.map(({ id, label, icon: Icon }) => <button key={id} onClick={() => setTab(id)} className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition ${tab === id ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-900'}`}><Icon className="size-4" />{label}</button>)}</nav>
      </div>
    </header>
    <main className="mx-auto min-h-[calc(100vh-4rem)] max-w-[1600px]">{tab === 'billing' && <Billing />}{tab === 'inventory' && <Inventory />}{tab === 'analytics' && <Analytics />}</main>
  </div>;
}
