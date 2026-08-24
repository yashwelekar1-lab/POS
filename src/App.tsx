import { useState } from "react";
import { BarChart3, Boxes, ReceiptText } from "lucide-react";
import { Billing } from "./components/billing/Billing";
import { Inventory } from "./components/inventory/Inventory";
import { Analytics } from "./components/analytics/Analytics";

type Tab = "billing" | "inventory" | "analytics";

const navigation = [
  {
    id: "billing" as const,
    label: "Billing",
    icon: ReceiptText,
  },
  {
    id: "inventory" as const,
    label: "Inventory",
    icon: Boxes,
  },
  {
    id: "analytics" as const,
    label: "Analytics",
    icon: BarChart3,
  },
];

function App() {
  const [activeTab, setActiveTab] = useState<Tab>("billing");

  const activeSection = navigation.find(
    (item) => item.id === activeTab,
  );

  return (
    <div className="app">
      <header className="site-header">
        <div className="brand">
          <span className="brand-mark">R</span>

          <div className="brand-copy">
            <span className="brand-name">RETAIL</span>
            <span className="brand-subtitle">POINT OF SALE</span>
          </div>
        </div>

        <nav className="main-nav" aria-label="Main navigation">
          {navigation.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;

            return (
              <button
                key={item.id}
                type="button"
                className={`nav-item ${isActive ? "active" : ""}`}
                onClick={() => setActiveTab(item.id)}
              >
                <Icon size={16} strokeWidth={1.7} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="header-status">
          <span className="status-indicator" />
          <span>Live</span>
        </div>
      </header>

      <main className="site-main">
        <div className="section-intro">
          <div>
            <span className="section-kicker">RETAIL OPERATIONS</span>

            <h1>{activeSection?.label}</h1>

            <p>
              {activeTab === "billing" &&
                "Create and manage your sales with a clean, fast checkout experience."}

              {activeTab === "inventory" &&
                "Keep your products, pricing and stock organised in one place."}

              {activeTab === "analytics" &&
                "Understand your sales, products and business performance."}
            </p>
          </div>

          <div className="section-number">
            {activeTab === "billing" && "01"}
            {activeTab === "inventory" && "02"}
            {activeTab === "analytics" && "03"}
          </div>
        </div>

        <div className="section-content">
          {activeTab === "billing" && <Billing />}

          {activeTab === "inventory" && <Inventory />}

          {activeTab === "analytics" && <Analytics />}
        </div>
      </main>

      <footer className="site-footer">
        <span>RETAIL POS</span>
        <span>Billing · Inventory · Analytics</span>
      </footer>
    </div>
  );
}

export default App;
