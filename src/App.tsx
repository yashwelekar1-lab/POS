import { useState } from "react";
import { BarChart3, Boxes, ReceiptText } from "lucide-react";
import { Billing } from "./components/billing/Billing";
import { Inventory } from "./components/inventory/Inventory";
import { Analytics } from "./components/analytics/Analytics";

type Tab = "billing" | "inventory" | "analytics";

function App() {
  const [activeTab, setActiveTab] = useState<Tab>("billing");

  return (
    <div className="app">
      <header className="app-header">
        <div className="brand">
          <div className="brand-mark">O</div>

          <div className="brand-copy">
            <div className="brand-name">ORDERLY</div>
            <div className="brand-subtitle">POINT OF SALE</div>
          </div>
        </div>

        <nav className="main-nav">
          <button
            className={activeTab === "billing" ? "active" : ""}
            onClick={() => setActiveTab("billing")}
          >
            <ReceiptText size={16} />
            <span>Billing</span>
          </button>

          <button
            className={activeTab === "inventory" ? "active" : ""}
            onClick={() => setActiveTab("inventory")}
          >
            <Boxes size={16} />
            <span>Inventory</span>
          </button>

          <button
            className={activeTab === "analytics" ? "active" : ""}
            onClick={() => setActiveTab("analytics")}
          >
            <BarChart3 size={16} />
            <span>Analytics</span>
          </button>
        </nav>

        <div className="live-status">
          <span />
          LIVE
        </div>
      </header>

      <main className="app-content">
        {activeTab === "billing" && <Billing />}
        {activeTab === "inventory" && <Inventory />}
        {activeTab === "analytics" && <Analytics />}
      </main>
    </div>
  );
}

export default App;
