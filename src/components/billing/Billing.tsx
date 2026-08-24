import { Search, ScanBarcode, ShoppingCart, CreditCard } from 'lucide-react';

export function Billing() {
  return (
    <section className="grid min-h-full grid-cols-1 gap-4 p-4 lg:grid-cols-[1fr_420px]">
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center gap-3 border-b border-slate-100 p-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <input className="w-full rounded-xl border border-slate-200 py-3 pl-10 pr-4 outline-none focus:border-slate-400" placeholder="Search product or SKU" />
          </div>
          <button className="rounded-xl border border-slate-200 p-3 hover:bg-slate-50" title="Scan barcode"><ScanBarcode className="size-5" /></button>
        </div>
        <div className="flex min-h-[520px] items-center justify-center p-8 text-center text-slate-400">
          <div><ShoppingCart className="mx-auto mb-3 size-10" /><p>Products will appear here</p></div>
        </div>
      </div>
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 p-4"><h2 className="font-semibold text-slate-900">Current Bill</h2></div>
        <div className="flex min-h-[520px] flex-col">
          <div className="flex-1 p-4 text-center text-sm text-slate-400">Cart is empty</div>
          <div className="border-t border-slate-100 p-4">
            <div className="mb-4 flex justify-between text-lg font-semibold"><span>Total</span><span>₹0.00</span></div>
            <button disabled className="flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 py-3 font-medium text-white disabled:cursor-not-allowed disabled:opacity-40"><CreditCard className="size-4" />Checkout</button>
          </div>
        </div>
      </div>
    </section>
  );
}
