import { useEffect, useMemo, useState } from "react";
import {
  BarChart3,
  Boxes,
  CalendarDays,
  IndianRupee,
  Receipt,
  Download,
  X,
  User,
  CreditCard,
  FileText,
  RefreshCw,
  ShoppingBag,
  TrendingUp,
} from "lucide-react";
import { supabase } from "../../lib/supabase";
import { jsPDF } from "jspdf";

type Sale = {
  id: string;
  bill_number: string;
  subtotal: number;
  gst_amount: number;
  discount_amount: number;
  total_amount: number;
  payment_method: string;
  customer_name: string | null;
  customer_phone: string | null;
  created_at: string;
};

type SaleItem = {
  id: string;
  sale_id: string;
  product_id: string;
  product_name: string;
  sku: string;
  barcode: string;
  quantity: number;
  unit_price: number;
  gst_rate: number;
  gst_amount: number;
  line_total: number;
};

type Product = {
  id: string;
  name: string;
  current_stock: number;
  selling_price: number;
};

export function Analytics() {
  const [sales, setSales] = useState<Sale[]>([]);
  const [saleItems, setSaleItems] = useState<SaleItem[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [selectedSaleItems, setSelectedSaleItems] = useState<SaleItem[]>([]);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [downloadingInvoice, setDownloadingInvoice] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      setError("");

      const [salesResult, itemsResult, productsResult] = await Promise.all([
        supabase
          .from("sales")
          .select("*")
          .order("created_at", { ascending: false }),

        supabase
          .from("sale_items")
          .select("*")
          .order("id", { ascending: false }),

        supabase
          .from("products")
          .select("id,name,current_stock,selling_price")
          .eq("is_active", true),
      ]);

      if (salesResult.error) throw salesResult.error;
      if (itemsResult.error) throw itemsResult.error;
      if (productsResult.error) throw productsResult.error;

      setSales((salesResult.data || []) as Sale[]);
      setSaleItems((itemsResult.data || []) as SaleItem[]);
      setProducts((productsResult.data || []) as Product[]);
    } catch (err) {
      console.error(err);
      setError(
        err instanceof Error
          ? err.message
          : "Unable to load sales data.",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const todaySales = useMemo(() => {
    const today = new Date();

    return sales.filter((sale) => {
      const date = new Date(sale.created_at);

      return (
        date.getFullYear() === today.getFullYear() &&
        date.getMonth() === today.getMonth() &&
        date.getDate() === today.getDate()
      );
    });
  }, [sales]);

  const todayRevenue = useMemo(
    () =>
      todaySales.reduce(
        (total, sale) => total + Number(sale.total_amount || 0),
        0,
      ),
    [todaySales],
  );

  const todayItems = useMemo(() => {
    const ids = new Set(todaySales.map((sale) => sale.id));

    return saleItems
      .filter((item) => ids.has(item.sale_id))
      .reduce((total, item) => total + Number(item.quantity || 0), 0);
  }, [todaySales, saleItems]);

  const stockValue = useMemo(
    () =>
      products.reduce(
        (total, product) =>
          total +
          Number(product.current_stock || 0) *
            Number(product.selling_price || 0),
        0,
      ),
    [products],
  );

  const formatMoney = (value: number) =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 2,
    }).format(value);

  const dateOnly = (value: string) =>
    new Date(value).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });

  const getSaleItems = (saleId: string) =>
    saleItems.filter((item) => item.sale_id === saleId);


  const openSaleDetails = async (sale: Sale) => {
    setSelectedSale(sale);
    setSelectedSaleItems([]);
    setDetailsLoading(true);
    setError("");

    const { data, error: itemsError } = await supabase
      .from("sale_items")
      .select("*")
      .eq("sale_id", sale.id)
      .order("id", { ascending: true });

    if (itemsError) {
      console.error(itemsError);
      setError(`Unable to load invoice items: ${itemsError.message}`);
    } else {
      setSelectedSaleItems((data || []) as SaleItem[]);
    }

    setDetailsLoading(false);
  };

  const closeSaleDetails = () => {
    setSelectedSale(null);
    setSelectedSaleItems([]);
  };

  const downloadInvoice = async () => {
    if (!selectedSale) return;

    setDownloadingInvoice(true);

    try {
      let items = selectedSaleItems;

      if (!items.length) {
        const { data, error: itemsError } = await supabase
          .from("sale_items")
          .select("*")
          .eq("sale_id", selectedSale.id)
          .order("id", { ascending: true });

        if (itemsError) throw itemsError;
        items = (data || []) as SaleItem[];
      }

      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();

      doc.setFont("helvetica", "bold");
      doc.setFontSize(22);
      doc.text("ORDERLY", 18, 20);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.text("RETAIL POINT OF SALE", 18, 27);

      doc.setFont("helvetica", "bold");
      doc.setFontSize(15);
      doc.text("TAX INVOICE", pageWidth - 18, 20, { align: "right" });

      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.text(`Invoice: ${selectedSale.bill_number}`, pageWidth - 18, 27, {
        align: "right",
      });
      doc.text(
        `Date: ${new Date(selectedSale.created_at).toLocaleString("en-IN")}`,
        pageWidth - 18,
        33,
        { align: "right" },
      );

      doc.setDrawColor(210, 210, 210);
      doc.line(18, 40, pageWidth - 18, 40);

      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.text("CUSTOMER", 18, 52);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.text(selectedSale.customer_name || "Walk-in Customer", 18, 59);
      doc.text(selectedSale.customer_phone || "No phone number", 18, 65);

      doc.setFont("helvetica", "bold");
      doc.text("PAYMENT", pageWidth - 70, 52);
      doc.setFont("helvetica", "normal");
      doc.text(
        selectedSale.payment_method?.toUpperCase() || "—",
        pageWidth - 18,
        59,
        { align: "right" },
      );

      let y = 80;

      doc.setFillColor(245, 245, 245);
      doc.rect(18, y - 7, pageWidth - 36, 10, "F");

      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.text("PRODUCT", 20, y);
      doc.text("QTY", 112, y);
      doc.text("UNIT PRICE", 140, y);
      doc.text("GST", 170, y);
      doc.text("TOTAL", pageWidth - 20, y, { align: "right" });

      y += 12;
      doc.setFont("helvetica", "normal");

      items.forEach((item) => {
        if (y > 265) {
          doc.addPage();
          y = 20;
        }

        const name =
          item.product_name.length > 34
            ? `${item.product_name.slice(0, 31)}...`
            : item.product_name;

        doc.text(name, 20, y);
        doc.text(String(item.quantity), 115, y, { align: "right" });
        doc.text(formatMoney(Number(item.unit_price || 0)), 157, y, {
          align: "right",
        });
        doc.text(`${Number(item.gst_rate || 0)}%`, 180, y, {
          align: "right",
        });
        doc.text(
          formatMoney(Number(item.line_total || 0)),
          pageWidth - 20,
          y,
          { align: "right" },
        );

        y += 8;

        if (item.sku || item.barcode) {
          doc.setFontSize(7);
          doc.setTextColor(100, 100, 100);
          doc.text(
            `SKU: ${item.sku || "-"}   Barcode: ${item.barcode || "-"}`,
            20,
            y,
          );
          doc.setTextColor(0, 0, 0);
          doc.setFontSize(8);
          y += 5;
        }

        y += 3;
      });

      if (y > 245) {
        doc.addPage();
        y = 20;
      }

      doc.setDrawColor(210, 210, 210);
      doc.line(18, y, pageWidth - 18, y);
      y += 12;

      const cgst = Number(selectedSale.gst_amount || 0) / 2;
      const sgst = Number(selectedSale.gst_amount || 0) / 2;

      const summary = [
        ["Subtotal", formatMoney(Number(selectedSale.subtotal || 0))],
        ["CGST", formatMoney(cgst)],
        ["SGST", formatMoney(sgst)],
        ["Discount", formatMoney(Number(selectedSale.discount_amount || 0))],
      ];

      doc.setFontSize(10);

      summary.forEach(([label, value]) => {
        doc.setFont("helvetica", "normal");
        doc.text(label, pageWidth - 85, y);
        doc.text(value, pageWidth - 18, y, { align: "right" });
        y += 8;
      });

      doc.setFont("helvetica", "bold");
      doc.text("TOTAL", pageWidth - 85, y + 3);
      doc.text(
        formatMoney(Number(selectedSale.total_amount || 0)),
        pageWidth - 18,
        y + 3,
        { align: "right" },
      );

      y += 20;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(100, 100, 100);
      doc.text("Thank you for shopping with Orderly.", pageWidth / 2, y, {
        align: "center",
      });

      doc.save(`${selectedSale.bill_number}-Invoice.pdf`);
    } catch (err) {
      console.error(err);
      setError(
        err instanceof Error
          ? `Invoice download failed: ${err.message}`
          : "Invoice download failed.",
      );
    } finally {
      setDownloadingInvoice(false);
    }
  };

  return (
    <section className="analytics-page">
      <div className="analytics-header">
        <div>
          <span className="eyebrow">RETAIL INTELLIGENCE</span>
          <h1>Sales & Analytics</h1>
          <p>
            Real-time performance from your Orderly transactions.
          </p>
        </div>

        <button
          className="analytics-refresh"
          type="button"
          onClick={loadData}
          disabled={loading}
        >
          <RefreshCw size={16} />
          Refresh
        </button>
      </div>

      {error && (
        <div className="analytics-error">
          {error}
        </div>
      )}

      <div className="analytics-cards">
        <div className="analytics-card">
          <div className="analytics-card-icon">
            <IndianRupee size={20} />
          </div>

          <div>
            <span>Today's Sales</span>
            <strong>{formatMoney(todayRevenue)}</strong>
          </div>
        </div>

        <div className="analytics-card">
          <div className="analytics-card-icon">
            <Receipt size={20} />
          </div>

          <div>
            <span>Bills Today</span>
            <strong>{todaySales.length}</strong>
          </div>
        </div>

        <div className="analytics-card">
          <div className="analytics-card-icon">
            <ShoppingBag size={20} />
          </div>

          <div>
            <span>Items Sold Today</span>
            <strong>{todayItems}</strong>
          </div>
        </div>

        <div className="analytics-card">
          <div className="analytics-card-icon">
            <Boxes size={20} />
          </div>

          <div>
            <span>Stock Value</span>
            <strong>{formatMoney(stockValue)}</strong>
          </div>
        </div>
      </div>

      <div className="analytics-section">
        <div className="analytics-section-header">
          <div>
            <h2>Recent Sales</h2>
            <p>Completed transactions from Orderly.</p>
          </div>

          <span className="sales-count">
            {sales.length} {sales.length === 1 ? "bill" : "bills"}
          </span>
        </div>

        {loading ? (
          <div className="analytics-empty">
            <RefreshCw className="spin" size={24} />
            <strong>Loading sales...</strong>
          </div>
        ) : sales.length === 0 ? (
          <div className="analytics-empty">
            <BarChart3 size={32} />
            <strong>No sales yet</strong>
            <span>
              Completed bills will appear here automatically.
            </span>
          </div>
        ) : (
          <div className="sales-table-wrapper">
            <table className="sales-table">
              <thead>
                <tr>
                  <th>Bill</th>
                  <th>Date</th>
                  <th>Items</th>
                  <th>Payment</th>
                  <th>GST</th>
                  <th>Total</th>
                </tr>
              </thead>

              <tbody>
                {sales.map((sale) => {
                  const items = getSaleItems(sale.id);

                  return (
                    <tr
                      key={sale.id}
                      className="sale-clickable-row"
                      onClick={() => openSaleDetails(sale)}
                      title="Click to view complete sale details"
                    >
                      <td>
                        <div className="bill-cell">
                          <strong>{sale.bill_number}</strong>

                          {items.map((item) => (
                            <span key={item.id}>
                              {item.product_name} × {item.quantity}
                            </span>
                          ))}
                        </div>
                      </td>

                      <td>
                        {new Date(sale.created_at).toLocaleString(
                          "en-IN",
                          {
                            dateStyle: "medium",
                            timeStyle: "short",
                          },
                        )}
                      </td>

                      <td>
                        {items.reduce(
                          (total, item) =>
                            total + Number(item.quantity || 0),
                          0,
                        )}
                      </td>

                      <td>
                        <span className="payment-badge">
                          {sale.payment_method?.toUpperCase() || "—"}
                        </span>
                      </td>

                      <td>
                        {formatMoney(Number(sale.gst_amount || 0))}
                      </td>

                      <td>
                        <strong>
                          {formatMoney(
                            Number(sale.total_amount || 0),
                          )}
                        </strong>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="analytics-section">
        <div className="analytics-section-header">
          <div>
            <h2>Sales Items</h2>
            <p>Every product included in completed bills.</p>
          </div>
        </div>

        {saleItems.length === 0 ? (
          <div className="analytics-empty">
            <ShoppingBag size={32} />
            <strong>No sales items</strong>
          </div>
        ) : (
          <div className="sales-table-wrapper">
            <table className="sales-table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>SKU</th>
                  <th>Barcode</th>
                  <th>Quantity</th>
                  <th>Unit Price</th>
                  <th>GST</th>
                  <th>Line Total</th>
                </tr>
              </thead>

              <tbody>
                {saleItems.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <strong>{item.product_name}</strong>
                    </td>

                    <td>{item.sku}</td>

                    <td>{item.barcode}</td>

                    <td>{item.quantity}</td>

                    <td>
                      {formatMoney(Number(item.unit_price || 0))}
                    </td>

                    <td>{item.gst_rate}%</td>

                   <td>
  <strong>
    {formatMoney(
      Number(item.unit_price || 0) *
        Number(item.quantity || 0),
    )}
  </strong>
</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {selectedSale && (
        <div
          className="invoice-preview-overlay"
          onClick={closeSaleDetails}
        >
          <div
            className="invoice-preview-modal"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="invoice-preview-toolbar">
              <div>
                <span className="eyebrow">INVOICE PREVIEW</span>
                <h2>{selectedSale.bill_number}</h2>
              </div>

              <div className="invoice-preview-actions">
                <button
                  type="button"
                  className="invoice-download-button"
                  onClick={downloadInvoice}
                  disabled={downloadingInvoice || detailsLoading}
                >
                  <Download size={16} />
                  {downloadingInvoice ? "Creating..." : "Download Invoice"}
                </button>

                <button
                  type="button"
                  className="sale-details-close"
                  onClick={closeSaleDetails}
                  aria-label="Close invoice preview"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            <div className="invoice-preview-scroll">
              {detailsLoading ? (
                <div className="invoice-loading">
                  <RefreshCw className="spin" size={24} />
                  <strong>Preparing invoice...</strong>
                  <span>Loading purchased products</span>
                </div>
              ) : (
                <div className="invoice-paper">
                  <div className="invoice-brand-row">
                    <div>
                      <div className="invoice-brand">ORDERLY</div>
                      <div className="invoice-subtitle">
                        RETAIL POINT OF SALE
                      </div>
                    </div>

                    <div className="invoice-title-block">
                      <div className="invoice-title">INVOICE</div>
                      <div>
                        <strong>{selectedSale.bill_number}</strong>
                      </div>
                      <div>
                        {new Date(selectedSale.created_at).toLocaleString(
                          "en-IN",
                          {
                            dateStyle: "medium",
                            timeStyle: "short",
                          },
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="invoice-divider" />

                  <div className="invoice-customer-grid">
                    <div>
                      <span className="invoice-label">BILL TO</span>
                      <strong>
                        {selectedSale.customer_name || "Walk-in Customer"}
                      </strong>
                      <span>
                        {selectedSale.customer_phone || "No phone number"}
                      </span>
                    </div>

                    <div className="invoice-payment-box">
                      <span className="invoice-label">PAYMENT</span>
                      <strong>
                        {selectedSale.payment_method?.toUpperCase() || "—"}
                      </strong>
                      <span>Payment completed</span>
                    </div>
                  </div>

                  <div className="invoice-items">
                    <div className="invoice-items-header">
                      <span>PRODUCT</span>
                      <span>QTY</span>
                      <span>UNIT PRICE</span>
                      <span>GST</span>
                      <span>TOTAL</span>
                    </div>

                    {selectedSaleItems.length === 0 ? (
                      <div className="invoice-no-items">
                        No products found for this invoice.
                      </div>
                    ) : (
                      selectedSaleItems.map((item) => (
                        <div className="invoice-item-row" key={item.id}>
                          <div>
                            <strong>{item.product_name}</strong>
                            <small>
                              SKU: {item.sku || "—"} · Barcode:{" "}
                              {item.barcode || "—"}
                            </small>
                          </div>
                          <span>{item.quantity}</span>
                          <span>
                            {formatMoney(Number(item.unit_price || 0))}
                          </span>
                          <span>
                            {Number(item.gst_rate || 0)}%
                            <small>
                              {formatMoney(Number(item.gst_amount || 0))}
                            </small>
                          </span>
                          <strong>
                            {formatMoney(Number(item.line_total || 0))}
                          </strong>
                        </div>
                      ))
                    )}
                  </div>

                  <div className="invoice-bottom">
                    <div className="invoice-thank-you">
                      <FileText size={17} />
                      <div>
                        <strong>Thank you for shopping with Orderly.</strong>
                        <span>
                          This invoice records your completed transaction.
                        </span>
                      </div>
                    </div>

                    <div className="invoice-total-box">
                      <div>
                        <span>Subtotal</span>
                        <strong>
                          {formatMoney(Number(selectedSale.subtotal || 0))}
                        </strong>
                      </div>
                      <div>
                        <span>CGST</span>
                        <strong>
                          {formatMoney(
                            Number(selectedSale.gst_amount || 0) / 2,
                          )}
                        </strong>
                      </div>
                      <div>
                        <span>SGST</span>
                        <strong>
                          {formatMoney(
                            Number(selectedSale.gst_amount || 0) / 2,
                          )}
                        </strong>
                      </div>
                      <div>
                        <span>Discount</span>
                        <strong>
                          {formatMoney(
                            Number(selectedSale.discount_amount || 0),
                          )}
                        </strong>
                      </div>
                      <div className="invoice-grand-total">
                        <span>TOTAL</span>
                        <strong>
                          {formatMoney(
                            Number(selectedSale.total_amount || 0),
                          )}
                        </strong>
                      </div>
           <style>{`
        .sale-clickable-row {
          cursor: pointer !important;
          transition: background-color .15s ease;
        }

        .sale-clickable-row:hover {
          background: #faf8f4 !important;
        }

        .invoice-preview-overlay {
          position: fixed;
          inset: 0;
          z-index: 99999;
          background: rgba(0, 0, 0, .62);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 22px;
        }

        .invoice-preview-modal {
          width: min(1000px, 100%);
          max-height: 94vh;
          background: #f3f2ef;
          box-shadow: 0 28px 90px rgba(0,0,0,.35);
          display: flex;
          flex-direction: column;
        }

        .invoice-preview-toolbar {
          flex: 0 0 auto;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 20px;
          padding: 18px 22px;
          background: #fff;
          border-bottom: 1px solid #ddd;
        }

        .invoice-preview-toolbar h2 {
          margin: 4px 0 0;
          font-family: Georgia, serif;
          font-weight: 500;
          font-size: 22px;
        }

        .invoice-preview-actions {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .invoice-download-button {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          border: 0;
          background: #111;
          color: #fff;
          padding: 12px 17px;
          cursor: pointer;
          font-weight: 600;
        }

        .invoice-download-button:disabled {
          opacity: .6;
          cursor: wait;
        }

        .sale-details-close {
          width: 42px;
          height: 42px;
          display: grid;
          place-items: center;
          border: 1px solid #ddd;
          background: #fff;
          cursor: pointer;
        }

        .invoice-preview-scroll {
          overflow: auto;
          padding: 28px;
        }

        .invoice-paper {
          width: min(820px, 100%);
          margin: 0 auto;
          background: #fff;
          min-height: 720px;
          padding: 42px 48px;
          box-shadow: 0 5px 25px rgba(0,0,0,.08);
        }

        .invoice-brand-row {
          display: flex;
          justify-content: space-between;
          gap: 30px;
        }

        .invoice-brand {
          font-family: Georgia, serif;
          font-size: 28px;
          letter-spacing: 2px;
          font-weight: 700;
        }

        .invoice-subtitle {
          margin-top: 5px;
          font-size: 9px;
          letter-spacing: 2.5px;
          color: #7c858e;
        }

        .invoice-title-block {
          text-align: right;
          color: #59616a;
          font-size: 11px;
          line-height: 1.7;
        }

        .invoice-title {
          font-family: Georgia, serif;
          color: #111;
          font-size: 25px;
          margin-bottom: 2px;
        }

        .invoice-divider {
          height: 1px;
          background: #222;
          margin: 25px 0;
        }

        .invoice-customer-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 40px;
          margin-bottom: 28px;
        }

        .invoice-customer-grid > div {
          display: flex;
          flex-direction: column;
          gap: 5px;
          font-size: 12px;
          color: #68717b;
        }

        .invoice-customer-grid strong {
          color: #111;
          font-size: 14px;
        }

        .invoice-label {
          font-size: 9px !important;
          letter-spacing: 1.8px;
          color: #858d95 !important;
          margin-bottom: 2px;
        }

        .invoice-payment-box {
          text-align: right;
          align-items: flex-end;
        }

        .invoice-items {
          border-top: 1px solid #222;
          border-bottom: 1px solid #ddd;
        }

        .invoice-items-header,
        .invoice-item-row {
          display: grid;
          grid-template-columns: minmax(210px, 2.4fr) .5fr 1fr .7fr 1fr;
          gap: 12px;
          align-items: center;
        }

        .invoice-items-header {
          padding: 11px 0;
          border-bottom: 1px solid #ddd;
          font-size: 9px;
          letter-spacing: 1.3px;
          color: #737c85;
        }

        .invoice-items-header span:not(:first-child),
        .invoice-item-row > span:not(:first-child),
        .invoice-item-row > strong:last-child {
          text-align: right;
        }

        .invoice-item-row {
          padding: 14px 0;
          border-bottom: 1px solid #eee;
          font-size: 11px;
        }

        .invoice-item-row:last-child {
          border-bottom: 0;
        }

        .invoice-item-row > div {
          min-width: 0;
        }

        .invoice-item-row small {
          display: block;
          margin-top: 4px;
          color: #8a939b;
          font-size: 8.5px;
          line-height: 1.35;
        }

        .invoice-item-row > span small {
          text-align: right;
        }

        .invoice-no-items {
          padding: 30px 0;
          text-align: center;
          color: #7a838c;
          font-size: 12px;
        }

        .invoice-bottom {
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          gap: 40px;
          margin-top: 30px;
        }

        .invoice-thank-you {
          display: flex;
          gap: 9px;
          align-items: flex-start;
          color: #737c85;
          font-size: 10px;
          max-width: 330px;
        }

        .invoice-thank-you strong,
        .invoice-thank-you span {
          display: block;
        }

        .invoice-thank-you strong {
          color: #222;
          margin-bottom: 4px;
        }

        .invoice-total-box {
          width: 280px;
          border-top: 2px solid #111;
        }

        .invoice-total-box > div {
          display: flex;
          justify-content: space-between;
          gap: 20px;
          padding: 6px 0;
          font-size: 11px;
        }

        .invoice-grand-total {
          border-top: 1px solid #ddd;
          margin-top: 5px;
          padding-top: 12px !important;
          font-size: 17px !important;
        }

        .invoice-preview-footer {
          flex: 0 0 auto;
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 13px 22px;
          background: #fff;
          border-top: 1px solid #ddd;
          color: #7b8490;
          font-size: 11px;
        }

        .invoice-footer-download {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          background: #111;
          color: #fff;
          border: 0;
          padding: 10px 14px;
          cursor: pointer;
          font-weight: 600;
        }

        .invoice-footer-download:disabled {
          opacity: .6;
          cursor: wait;
        }

        .invoice-loading {
          min-height: 500px;
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          gap: 8px;
          color: #6f7881;
        }

        .invoice-loading strong {
          color: #222;
        }

        .invoice-loading span {
          font-size: 12px;
        }

        @media (max-width: 700px) {
          .invoice-preview-overlay {
            padding: 0;
          }

          .invoice-preview-modal {
            max-height: 100vh;
          }

          .invoice-preview-scroll {
            padding: 12px;
          }

          .invoice-paper {
            padding: 28px 20px;
          }

          .invoice-preview-toolbar {
            padding: 14px;
          }

          .invoice-preview-actions {
            flex-direction: column;
          }

          .invoice-customer-grid {
            grid-template-columns: 1fr;
            gap: 18px;
          }

          .invoice-payment-box {
            text-align: left;
            align-items: flex-start;
          }

          .invoice-items {
            overflow-x: auto;
          }

          .invoice-items-header,
          .invoice-item-row {
            min-width: 680px;
          }

          .invoice-bottom {
            flex-direction: column;
            align-items: stretch;
          }

          .invoice-total-box {
            width: 100%;
          }
        }
      `}</style>

    </section>
  );
}
