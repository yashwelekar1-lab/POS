import { useState } from "react";
import { Billing } from "./components/billing/Billing";
import { Inventory } from "./components/inventory/Inventory";
import { Analytics } from "./components/analytics/Analytics";

type Tab = "billing" | "inventory" | "analytics";

function App() {
  const [activeTab, setActiveTab] = useState<Tab>("billing");

  return (
    <div className="app">
      <header className="app-header">
        <div>
          <h1>Retail POS</h1>
          <p>Billing · Inventory · Analytics</p>
        </div>

        <nav>
          <button
            className={activeTab === "billing" ? "active" : ""}
            onClick={() => setActiveTab("billing")}
          >
            Billing
          </button>

          <button
            className={activeTab === "inventory" ? "active" : ""}
            onClick={() => setActiveTab("inventory")}
          >
            Inventory
          </button>

          <button
            className={activeTab === "analytics" ? "active" : ""}
            onClick={() => setActiveTab("analytics")}
          >
            Analytics
          </button>
        </nav>
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
