import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import {
  Barcode,
  Check,
  CreditCard,
  Minus,
  Plus,
  Search,
  ShoppingCart,
  Trash2,
  X,
} from "lucide-react";
import { supabase } from "../../lib/supabase";

import {
  Html5Qrcode,
  Html5QrcodeSupportedFormats,
} from "html5-qrcode";

type Product = {
  id: string;
  name: string;
  sku: string;
  barcode: string;
  category: string;
  sellingPrice: number;
  gstRate: number;
  currentStock: number;
};

type ProductRow = {
  id: string;
  name: string;
  sku: string;
  barcode: string;
  category: string;
  selling_price: number;
  gst_rate: number;
  current_stock: number;
};

type CartItem = {
  id: string;
  name: string;
  sku: string;
  barcode: string;
  price: number;
  gstRate: number;
  quantity: number;
  availableStock: number;
};

type PaymentMethod = "cash" | "upi" | "card";

function mapProduct(row: ProductRow): Product {
  return {
    id: row.id,
    name: row.name,
    sku: row.sku,
    barcode: row.barcode,
    category: row.category,
    sellingPrice: Number(row.selling_price),
    gstRate: Number(row.gst_rate),
    currentStock: Number(row.current_stock),
  };
}

export function Billing() {
  const [search, setSearch] = useState("");
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);

  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [processing, setProcessing] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [discount, setDiscount] = useState("0");

  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerFound, setCustomerFound] = useState(false);
  const [customerSearching, setCustomerSearching] = useState(false);

  const [showPayment, setShowPayment] = useState(false);
  const [paymentMethod, setPaymentMethod] =
    useState<PaymentMethod>("cash");

  const searchInputRef = useRef<HTMLInputElement>(null);
  const barcodeScannerRef = useRef<Html5Qrcode | null>(null);

const [scannerOpen, setScannerOpen] = useState(false);
const [scannerStarting, setScannerStarting] = useState(false);
const [scannerError, setScannerError] = useState("");

  /*
   * ---------------------------------------------------------
   * LOAD PRODUCTS
   * ---------------------------------------------------------
   */

  const loadProducts = async () => {
    setLoading(true);
    setError("");

    const { data, error: fetchError } = await supabase
      .from("products")
      .select(
        "id,name,sku,barcode,category,selling_price,gst_rate,current_stock",
      )
      .eq("is_active", true)
      .order("name", {
        ascending: true,
      });

    if (fetchError) {
      console.error("Billing product load error:", fetchError);
      setError(fetchError.message);
      setLoading(false);
      return;
    }

    setProducts(
      ((data || []) as ProductRow[]).map(mapProduct),
    );

    setLoading(false);
  };

  useEffect(() => {
    loadProducts();
  }, []);
useEffect(() => {
  return () => {
    const scanner = barcodeScannerRef.current;

    if (scanner) {
      scanner.stop().catch(() => {});
    }
  };
}, []);

useEffect(() => {
  const phone = customerPhone.trim();

  setCustomerFound(false);

  if (phone.length !== 10) {
    setCustomerSearching(false);
    return;
  }

  let cancelled = false;

  const findCustomer = async () => {
    setCustomerSearching(true);

    const { data, error } = await supabase
      .from("customers")
      .select("id,name,phone")
      .eq("phone", phone)
      .maybeSingle();

    if (cancelled) return;

    setCustomerSearching(false);

    if (error) {
      console.error("Customer lookup error:", error);
      return;
    }

    if (data) {
      setCustomerName(data.name || "");
      setCustomerFound(true);
    } else {
      setCustomerName("");
      setCustomerFound(false);
    }
  };

  const timer = setTimeout(findCustomer, 400);

  return () => {
    cancelled = true;
    clearTimeout(timer);
  };
}, [customerPhone]);
  /*
   * ---------------------------------------------------------
   * SEARCH
   * ---------------------------------------------------------
   */

  const filteredProducts = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) {
      return products;
    }

    return products.filter((product) => {
      return (
        product.name.toLowerCase().includes(query) ||
        product.sku.toLowerCase().includes(query) ||
        product.barcode.includes(query) ||
        product.category.toLowerCase().includes(query)
      );
    });
  }, [products, search]);

  /*
   * ---------------------------------------------------------
   * CART CALCULATIONS
   * ---------------------------------------------------------
   */

  const subtotal = useMemo(() => {
    return cart.reduce(
      (total, item) =>
        total + item.price * item.quantity,
      0,
    );
  }, [cart]);

  const gst = useMemo(() => {
    return cart.reduce((total, item) => {
      const itemSubtotal =
        item.price * item.quantity;

      return (
        total +
        (itemSubtotal * item.gstRate) / 100
      );
    }, 0);
  }, [cart]);

  const cgst = useMemo(() => gst / 2, [gst]);
  const sgst = useMemo(() => gst / 2, [gst]);

  const discountAmount = useMemo(() => {
    const value = Number(discount);

    if (!Number.isFinite(value) || value < 0) {
      return 0;
    }

    return Math.min(value, subtotal + gst);
  }, [discount, subtotal, gst]);

  const grandTotal = useMemo(() => {
    return Math.max(
      0,
      subtotal + gst - discountAmount,
    );
  }, [subtotal, gst, discountAmount]);

  const totalItems = useMemo(() => {
    return cart.reduce(
      (total, item) => total + item.quantity,
      0,
    );
  }, [cart]);

  /*
   * ---------------------------------------------------------
   * ADD PRODUCT TO CART
   * ---------------------------------------------------------
   */

  const addToCart = (product: Product) => {
    setError("");
    setSuccess("");

    if (product.currentStock <= 0) {
      setError(
        `${product.name} is out of stock.`,
      );
      return;
    }

    setCart((current) => {
      const existing = current.find(
        (item) => item.id === product.id,
      );

      if (existing) {
        if (
          existing.quantity >=
          product.currentStock
        ) {
          setError(
            `Only ${product.currentStock} units of ${product.name} are available.`,
          );

          return current;
        }

        return current.map((item) =>
          item.id === product.id
            ? {
                ...item,
                quantity: item.quantity + 1,
                availableStock:
                  product.currentStock,
              }
            : item,
        );
      }

      return [
        ...current,
        {
          id: product.id,
          name: product.name,
          sku: product.sku,
          barcode: product.barcode,
          price: product.sellingPrice,
          gstRate: product.gstRate,
          quantity: 1,
          availableStock: product.currentStock,
        },
      ];
    });

    setSearch("");
  };

  /*
   * ---------------------------------------------------------
   * BARCODE / SKU SEARCH
   *
   * USB barcode scanners normally behave like keyboards.
   * They type the barcode and press Enter.
   * ---------------------------------------------------------
   */

  const handleSearchKeyDown = async (
    event: KeyboardEvent<HTMLInputElement>,
  ) => {
    if (event.key !== "Enter") {
      return;
    }

    const value = search.trim();

    if (!value) {
      return;
    }

    setSearching(true);
    setError("");

    const { data, error: lookupError } =
      await supabase
        .from("products")
        .select(
          "id,name,sku,barcode,category,selling_price,gst_rate,current_stock",
        )
        .or(
          `barcode.eq.${value},sku.eq.${value}`,
        )
        .eq("is_active", true)
        .maybeSingle();

    setSearching(false);

    if (lookupError) {
      console.error(
        "Barcode lookup error:",
        lookupError,
      );

      setError(lookupError.message);
      return;
    }

    if (!data) {
      setError(
        `No product found for "${value}".`,
      );
      return;
    }

    addToCart(
      mapProduct(data as ProductRow),
    );
  };

  /*
 * ---------------------------------------------------------
 * CAMERA BARCODE SCANNER
 * ---------------------------------------------------------
 */

const stopBarcodeScanner = async () => {
  const scanner = barcodeScannerRef.current;

  if (!scanner) {
    setScannerOpen(false);
    setScannerStarting(false);
    return;
  }

  try {
    await scanner.stop();
  } catch (error) {
    console.warn("Barcode scanner stop warning:", error);
  }

  try {
    await scanner.clear();
  } catch (error) {
    console.warn("Barcode scanner clear warning:", error);
  }

  barcodeScannerRef.current = null;
  setScannerOpen(false);
  setScannerStarting(false);
};

const findProductByBarcode = async (barcode: string) => {
  const cleanBarcode = barcode.trim();

  if (!cleanBarcode) {
    return;
  }

  setError("");
  setScannerError("");

  const { data, error: lookupError } = await supabase
    .from("products")
    .select(
      "id,name,sku,barcode,category,selling_price,gst_rate,current_stock",
    )
    .eq("barcode", cleanBarcode)
    .eq("is_active", true)
    .maybeSingle();

  if (lookupError) {
    console.error("Camera barcode lookup error:", lookupError);

    setScannerError(
      lookupError.message || "Unable to find the product.",
    );

    return;
  }

  if (!data) {
    setScannerError(
      `No product found for barcode "${cleanBarcode}".`,
    );

    return;
  }

  addToCart(mapProduct(data as ProductRow));
};

const startBarcodeScanner = async () => {
  if (barcodeScannerRef.current || scannerStarting) {
    return;
  }

  setScannerStarting(true);
  setScannerError("");

  const scanner = new Html5Qrcode("orderly-camera-scanner", {
    formatsToSupport: [
      Html5QrcodeSupportedFormats.EAN_13,
      Html5QrcodeSupportedFormats.EAN_8,
      Html5QrcodeSupportedFormats.UPC_A,
      Html5QrcodeSupportedFormats.UPC_E,
      Html5QrcodeSupportedFormats.CODE_128,
      Html5QrcodeSupportedFormats.CODE_39,
    ],
  });

  barcodeScannerRef.current = scanner;

  try {
    await scanner.start(
      {
        facingMode: "environment",
      },
      {
        fps: 10,
        qrbox: {
          width: 300,
          height: 150,
        },
        aspectRatio: 1.777778,
      },
      async (decodedText) => {
        console.log("Orderly barcode scanned:", decodedText);

        await stopBarcodeScanner();

        await findProductByBarcode(decodedText);
      },
      () => {
        // Barcode not detected in this frame.
      },
    );

    setScannerStarting(false);
  } catch (error) {
    console.error("Camera scanner error:", error);

    barcodeScannerRef.current = null;
    setScannerStarting(false);

    setScannerError(
      "Camera could not be started. Please allow camera access and try again.",
    );
  }
};

const openBarcodeScanner = () => {
  setError("");
  setScannerError("");
  setScannerOpen(true);

  setTimeout(() => {
    startBarcodeScanner();
  }, 150);
};
  
  /*
   * ---------------------------------------------------------
   * QUANTITY
   * ---------------------------------------------------------
   */

  const updateQuantity = (
    id: string,
    change: number,
  ) => {
    setCart((current) =>
      current
        .map((item) => {
          if (item.id !== id) {
            return item;
          }

          const newQuantity =
            item.quantity + change;

          if (newQuantity <= 0) {
            return null;
          }

          if (
            newQuantity >
            item.availableStock
          ) {
            setError(
              `Only ${item.availableStock} units of ${item.name} are available.`,
            );

            return item;
          }

          return {
            ...item,
            quantity: newQuantity,
          };
        })
        .filter(
          (item): item is CartItem =>
            item !== null,
        ),
    );
  };

  const removeItem = (id: string) => {
    setCart((current) =>
      current.filter(
        (item) => item.id !== id,
      ),
    );
  };

  const clearCart = () => {
    setCart([]);
    setDiscount("0");
    setCustomerName("");
    setCustomerPhone("");
    setCustomerFound(false);
    setError("");
    setSuccess("");
  };

  /*
   * ---------------------------------------------------------
   * PAYMENT
   * ---------------------------------------------------------
   */

  const openPayment = () => {
    if (cart.length === 0) {
      setError(
        "Add at least one product before payment.",
      );
      return;
    }

    const phone = customerPhone.trim();
    const name = customerName.trim();

    if (phone && !/^\d{10}$/.test(phone)) {
      setError("Please enter a valid 10-digit customer phone number.");
      return;
    }

    if (phone && !name) {
      setError("Please enter the customer name.");
      return;
    }

    setError("");
    setShowPayment(true);
  };

  /*
   * ---------------------------------------------------------
   * COMPLETE PAYMENT
   * ---------------------------------------------------------
   */

const completePayment = async () => {
  console.log("=== PAYMENT STARTED ===");

  if (cart.length === 0 || processing) {
    console.log("Payment blocked:", {
      cartLength: cart.length,
      processing,
    });
    return;
  }

  setProcessing(true);
  setError("");
  setSuccess("");

  try {
    const savedCustomerName = customerName.trim();
    const savedCustomerPhone = customerPhone.trim();

    console.log("Customer:", {
      name: savedCustomerName,
      phone: savedCustomerPhone,
    });

    console.log("Cart:", cart);

    // ---------------------------------------------------------
    // 1. SAVE / UPDATE CUSTOMER
    // ---------------------------------------------------------

    if (savedCustomerPhone) {
      console.log("Looking for customer:", savedCustomerPhone);

      const { data: existingCustomer, error: customerLookupError } =
        await supabase
          .from("customers")
          .select("id,name,phone")
          .eq("phone", savedCustomerPhone)
          .maybeSingle();

      console.log("Customer lookup result:", {
        existingCustomer,
        customerLookupError,
      });

      if (customerLookupError) {
        throw new Error(
          `Customer lookup failed: ${customerLookupError.message}`
        );
      }

      if (existingCustomer) {
        console.log("Existing customer found:", existingCustomer);

        if (
          savedCustomerName &&
          savedCustomerName !== existingCustomer.name
        ) {
          const { error: customerUpdateError } = await supabase
            .from("customers")
            .update({
              name: savedCustomerName,
              updated_at: new Date().toISOString(),
            })
            .eq("id", existingCustomer.id);

          console.log("Customer update:", customerUpdateError);

          if (customerUpdateError) {
            throw new Error(
              `Customer update failed: ${customerUpdateError.message}`
            );
          }
        }
      } else {
        console.log("Creating new customer...");

        const { error: customerInsertError } = await supabase
          .from("customers")
          .insert({
            name: savedCustomerName,
            phone: savedCustomerPhone,
          });

        console.log("Customer insert:", customerInsertError);

        if (customerInsertError) {
          throw new Error(
            `Customer creation failed: ${customerInsertError.message}`
          );
        }
      }
    }

    // ---------------------------------------------------------
    // 2. PREPARE ITEMS
    // ---------------------------------------------------------

    const items = cart.map((item) => ({
      id: item.id,
      quantity: item.quantity,
    }));

    console.log("Sending items to create_orderly_sale:", items);

    console.log("Discount:", Number(discount) || 0);
    console.log("Payment method:", paymentMethod);

    // ---------------------------------------------------------
    // 3. CREATE SALE
    // ---------------------------------------------------------

    console.log("Calling create_orderly_sale...");

    const { data, error: rpcError } = await supabase.rpc(
      "create_orderly_sale",
      {
        p_items: items,
        p_discount: Number(discount) || 0,
        p_payment_method: paymentMethod,
      }
    );

    console.log("RPC RESPONSE:", {
      data,
      rpcError,
    });

    if (rpcError) {
      throw new Error(
        `Sale creation failed: ${rpcError.message}`
      );
    }

    if (!data || data.length === 0) {
      throw new Error(
        "Sale was not created. The database returned no sale."
      );
    }

    const sale = data[0];

    console.log("SALE CREATED:", sale);

    // ---------------------------------------------------------
    // 4. SAVE CUSTOMER ON SALE
    // ---------------------------------------------------------

    if (savedCustomerPhone || savedCustomerName) {
      console.log("Updating sale with customer details...");

      const { error: saleCustomerError } = await supabase
        .from("sales")
        .update({
          customer_name: savedCustomerName || null,
          customer_phone: savedCustomerPhone || null,
        })
        .eq("id", sale.sale_id);

      console.log("Sale customer update:", saleCustomerError);

      if (saleCustomerError) {
        throw new Error(
          `Sale customer update failed: ${saleCustomerError.message}`
        );
      }
    }

    // ---------------------------------------------------------
    // 5. SUCCESS
    // ---------------------------------------------------------

    console.log("=== PAYMENT SUCCESS ===");

    setShowPayment(false);

    setSuccess(
      `Orderly bill ${sale.bill_number} created successfully. Total ₹${Number(
        sale.total_amount
      ).toFixed(2)} via ${paymentMethod.toUpperCase()}.`
    );

    setCart([]);
    setDiscount("0");
    setCustomerName("");
    setCustomerPhone("");
    setCustomerFound(false);

    await loadProducts();

    setTimeout(() => {
      setSuccess("");
    }, 6000);

  } catch (unknownError) {
    console.error("=== PAYMENT FAILED ===", unknownError);

    const message =
      unknownError instanceof Error
        ? unknownError.message
        : "Payment could not be completed.";

    setError(message);

    // Keep payment modal open so the error can be seen.
  } finally {
    console.log("=== PAYMENT FINISHED ===");
    setProcessing(false);
  }
};
        }
      }
    }

    /*
     * Send only product IDs + quantities.
     *
     * The database function calculates the real prices,
     * GST and stock itself.
     */
    const items = cart.map((item) => ({
      id: item.id,
      quantity: item.quantity,
    }));

    const { data, error: rpcError } = await supabase.rpc(
      "create_orderly_sale",
      {
        p_items: items,
        p_discount: Number(discount) || 0,
        p_payment_method: paymentMethod,
      },
    );

    if (rpcError) {
      console.error(
        "Orderly payment RPC error:",
        rpcError,
      );

      throw new Error(
        rpcError.message ||
          "Payment could not be completed.",
      );
    }

    if (!data || data.length === 0) {
      throw new Error(
        "The sale was not created. Please try again.",
      );
    }

    const sale = data[0];

    if (savedCustomerPhone || savedCustomerName) {
      const { error: saleCustomerError } = await supabase
        .from("sales")
        .update({
          customer_name: savedCustomerName || null,
          customer_phone: savedCustomerPhone || null,
        })
        .eq("id", sale.sale_id);

      if (saleCustomerError) {
        throw new Error(
          `Sale customer update failed: ${saleCustomerError.message}`,
        );
      }
    }

    /*
     * Only show success AFTER the database confirms
     * the complete transaction.
     */
    setShowPayment(false);

    setSuccess(
      `Orderly bill ${sale.bill_number} created successfully. Total ₹${Number(
        sale.total_amount,
      ).toFixed(2)} via ${paymentMethod.toUpperCase()}.`,
    );

    /*
     * Clear cart only after successful database transaction.
     */
    setCart([]);
    setDiscount("0");
    setCustomerName("");
    setCustomerPhone("");
    setCustomerFound(false);

    /*
     * Refresh products so the new stock is immediately visible.
     */
    await loadProducts();

    setTimeout(() => {
      setSuccess("");
    }, 6000);
  } catch (unknownError) {
    console.error(
      "Orderly payment processing error:",
      unknownError,
    );

    setError(
      unknownError instanceof Error
        ? unknownError.message
        : "Payment could not be completed.",
    );

    /*
     * IMPORTANT:
     * Cart remains untouched when payment fails.
     */
  } finally {
    setProcessing(false);
  }
};  /*
   * ---------------------------------------------------------
   * UI
   * ---------------------------------------------------------
   */

  return (
    <section className="billing-page">
      <div className="page-heading">
        <div>
          <span className="section-kicker">
            RETAIL OPERATIONS
          </span>

          <h2>Billing</h2>

          <p>
            Create a new bill and process
            the payment.
          </p>
        </div>

        <div className="bill-status">
          <span className="status-dot" />
          New Bill
        </div>
      </div>

      {error && (
        <div className="error-message">
          {error}
        </div>
      )}

      {success && (
        <div
          className="success-message"
          style={{
            marginBottom: "20px",
            padding: "14px 18px",
            border:
              "1px solid #b8d8c0",
            background: "#f1faf3",
            color: "#246b36",
            display: "flex",
            alignItems: "center",
            gap: "10px",
          }}
        >
          <Check size={18} />
          {success}
        </div>
      )}

      <div className="billing-layout">
        <div className="billing-products">
          <div className="search-panel">
            <div className="search-input-wrapper">
              <Search size={18} />

              <input
                ref={searchInputRef}
                type="text"
                value={search}
                onChange={(event) =>
                  setSearch(
                    event.target.value,
                  )
                }
                onKeyDown={
                  handleSearchKeyDown
                }
                placeholder="Search product by name, SKU or barcode..."
                autoComplete="off"
              />

              {search && (
                <button
                  className="clear-search"
                  onClick={() =>
                    setSearch("")
                  }
                  type="button"
                >
                  Clear
                </button>
              )}
            </div>

           <button
  className="scan-button"
  type="button"
  onClick={openBarcodeScanner}
>
  <Barcode size={19} />
  Scan
</button>
          </div>

          <div className="product-area">
            {loading ? (
              <div className="empty-products">
                <div className="empty-icon">
                  <ShoppingCart
                    size={28}
                  />
                </div>

                <h3>
                  Loading products...
                </h3>

                <p>
                  Connecting to your
                  inventory.
                </p>
              </div>
            ) : products.length === 0 ? (
              <div className="empty-products">
                <div className="empty-icon">
                  <ShoppingCart
                    size={28}
                  />
                </div>

                <h3>
                  No products available
                </h3>

                <p>
                  Add products from
                  Inventory before
                  creating a bill.
                </p>

                <span>
                  Products added to
                  Inventory will appear
                  here automatically.
                </span>
              </div>
            ) : filteredProducts.length ===
              0 ? (
              <div className="empty-products">
                <div className="empty-icon">
                  <Search size={28} />
                </div>

                <h3>
                  No matching products
                </h3>

                <p>
                  Try the product name,
                  SKU or barcode.
                </p>
              </div>
            ) : (
              <div className="billing-product-grid">
                {filteredProducts.map(
                  (product) => {
                    const cartItem =
                      cart.find(
                        (item) =>
                          item.id ===
                          product.id,
                      );

                    const inCart =
                      cartItem?.quantity ||
                      0;

                    const outOfStock =
                      product.currentStock <=
                      0;

                    return (
                      <button
                        key={product.id}
                        type="button"
                        className="billing-product-card"
                        disabled={
                          outOfStock
                        }
                        onClick={() =>
                          addToCart(
                            product,
                          )
                        }
                      >
                        <div>
                          <strong>
                            {product.name}
                          </strong>

                          <span>
                            {product.category}
                          </span>

                          <small>
                            SKU:{" "}
                            {product.sku}
                          </small>

                          <small>
                            EAN:{" "}
                            {product.barcode}
                          </small>
                        </div>

                        <div className="billing-product-price">
                          <strong>
                            ₹
                            {product.sellingPrice.toFixed(
                              2,
                            )}
                          </strong>

                          <span>
                            Stock:{" "}
                            {
                              product.currentStock
                            }
                          </span>

                          {inCart > 0 && (
                            <b>
                              {inCart} in cart
                            </b>
                          )}

                          {outOfStock && (
                            <b>
                              Out of stock
                            </b>
                          )}
                        </div>
                      </button>
                    );
                  },
                )}
              </div>
            )}
          </div>
        </div>

        <aside className="bill-panel">
          <div
            style={{
              padding: "18px 20px",
              borderBottom: "1px solid #e5e5e5",
              background: "#fff",
            }}
          >
            <div
              style={{
                fontSize: "11px",
                letterSpacing: "2px",
                textTransform: "uppercase",
                color: "#777",
                marginBottom: "12px",
              }}
            >
              Customer Details
            </div>

            <div style={{ display: "grid", gap: "10px" }}>
              <input
                type="tel"
                inputMode="numeric"
                maxLength={10}
                value={customerPhone}
                onChange={(event) => {
                  const value = event.target.value
                    .replace(/\D/g, "")
                    .slice(0, 10);

                  setCustomerPhone(value);

                  if (value.length < 10) {
                    setCustomerName("");
                    setCustomerFound(false);
                  }
                }}
                placeholder="Customer phone number"
                autoComplete="tel"
                style={{
                  width: "100%",
                  padding: "11px 12px",
                  border: "1px solid #ddd",
                  fontSize: "14px",
                  boxSizing: "border-box",
                }}
              />

              <input
                type="text"
                value={customerName}
                onChange={(event) => {
                  setCustomerName(event.target.value);
                  setCustomerFound(false);
                }}
                placeholder="Customer name"
                autoComplete="name"
                style={{
                  width: "100%",
                  padding: "11px 12px",
                  border: "1px solid #ddd",
                  fontSize: "14px",
                  boxSizing: "border-box",
                }}
              />

              {customerSearching && (
                <span style={{ fontSize: "12px", color: "#777" }}>
                  Searching customer...
                </span>
              )}

              {!customerSearching && customerFound && (
                <span
                  style={{
                    fontSize: "12px",
                    color: "#246b36",
                    fontWeight: 600,
                  }}
                >
                  ✓ Existing customer found
                </span>
              )}

              {!customerSearching &&
                customerPhone.length === 10 &&
                !customerFound && (
                  <span style={{ fontSize: "12px", color: "#777" }}>
                    New customer
                  </span>
                )}
            </div>
          </div>

          <div className="bill-panel-header">
            <div>
              <h3>
                Current Bill
              </h3>

              <p>
                {totalItems === 0
                  ? "No items added"
                  : `${totalItems} item${
                      totalItems === 1
                        ? ""
                        : "s"
                    }`}
              </p>
            </div>

            <button
              className="clear-cart"
              type="button"
              disabled={
                cart.length === 0
              }
              onClick={clearCart}
            >
              Clear
            </button>
          </div>

          <div className="cart-items">
            {cart.length === 0 ? (
              <div className="empty-cart">
                <ShoppingCart
                  size={34}
                />

                <strong>
                  Your cart is empty
                </strong>

                <span>
                  Select a product or
                  scan its barcode to
                  add it.
                </span>
              </div>
            ) : (
              cart.map((item) => (
                <div
                  className="cart-item"
                  key={item.id}
                >
                  <div className="cart-item-info">
                    <strong>
                      {item.name}
                    </strong>

                    <span>
                      {item.sku}
                    </span>

                    <b>
                      ₹
                      {item.price.toFixed(
                        2,
                      )}
                    </b>

                    <small>
                      CGST {(item.gstRate / 2).toFixed(2)}% • SGST {(item.gstRate / 2).toFixed(2)}%
                    </small>
                  </div>

                  <div className="cart-item-actions">
                    <div className="quantity-control">
                      <button
                        type="button"
                        onClick={() =>
                          updateQuantity(
                            item.id,
                            -1,
                          )
                        }
                      >
                        <Minus
                          size={14}
                        />
                      </button>

                      <span>
                        {item.quantity}
                      </span>

                      <button
                        type="button"
                        onClick={() =>
                          updateQuantity(
                            item.id,
                            1,
                          )
                        }
                      >
                        <Plus
                          size={14}
                        />
                      </button>
                    </div>

                    <button
                      className="remove-item"
                      type="button"
                      onClick={() =>
                        removeItem(
                          item.id,
                        )
                      }
                    >
                      <Trash2
                        size={16}
                      />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="bill-summary">
            <div>
              <span>Items</span>

              <strong>
                {totalItems}
              </strong>
            </div>

            <div>
              <span>Subtotal</span>

              <strong>
                ₹
                {subtotal.toFixed(2)}
              </strong>
            </div>

            <div>
              <span>CGST</span>

              <strong>
                ₹
                {cgst.toFixed(2)}
              </strong>
            </div>

            <div>
              <span>SGST</span>

              <strong>
                ₹
                {sgst.toFixed(2)}
              </strong>
            </div>

            <div>
              <span>Discount</span>

              <input
                type="number"
                min="0"
                step="0.01"
                value={discount}
                onChange={(event) =>
                  setDiscount(
                    event.target.value,
                  )
                }
                disabled={
                  cart.length === 0
                }
                style={{
                  width: "100px",
                  textAlign: "right",
                }}
              />
            </div>

            <div className="bill-total">
              <span>Total</span>

              <strong>
                ₹
                {grandTotal.toFixed(
                  2,
                )}
              </strong>
            </div>
          </div>

          <button
            className="payment-button"
            type="button"
            disabled={
              cart.length === 0 ||
              processing
            }
            onClick={openPayment}
          >
            {processing
              ? "Processing..."
              : "Proceed to Payment"}
          </button>
        </aside>
      </div>
      
{scannerOpen && (
  <div
    className="barcode-scanner-backdrop"
    onMouseDown={(event) => {
      if (event.target === event.currentTarget) {
        stopBarcodeScanner();
      }
    }}
  >
    <div
      className="barcode-scanner-modal"
      role="dialog"
      aria-modal="true"
      aria-label="Scan barcode"
    >
      <div className="barcode-scanner-header">
        <div>
          <span className="section-kicker">
            ORDERLY SCANNER
          </span>

          <h2>Scan Barcode</h2>

          <p>
            Point your camera at the product barcode.
          </p>
        </div>

        <button
          className="modal-close"
          type="button"
          onClick={stopBarcodeScanner}
        >
          <X size={19} />
        </button>
      </div>

      <div className="barcode-scanner-content">
        <div
          id="orderly-camera-scanner"
          className="barcode-camera-container"
        />

        {scannerStarting && (
          <div className="barcode-scanner-status">
            Starting camera...
          </div>
        )}

        {!scannerStarting && !scannerError && (
          <div className="barcode-scanner-help">
            <Barcode size={20} />

            <div>
              <strong>
                Align the barcode inside the frame
              </strong>

              <span>
                Keep the barcode steady until Orderly detects it.
              </span>
            </div>
          </div>
        )}

        {scannerError && (
          <div className="barcode-scanner-error">
            <strong>Scanner error</strong>
            <span>{scannerError}</span>
          </div>
        )}
      </div>

      <div className="barcode-scanner-footer">
        <button
          className="secondary-button"
          type="button"
          onClick={stopBarcodeScanner}
        >
          Cancel
        </button>

        {scannerError && (
          <button
            className="primary-button"
            type="button"
            onClick={() => {
              setScannerError("");
              setTimeout(startBarcodeScanner, 100);
            }}
          >
            Try Again
          </button>
        )}
      </div>
    </div>
  </div>
)}
      {showPayment && (
        <div
          className="modal-backdrop"
          onMouseDown={(event) => {
            if (
              event.target ===
              event.currentTarget
            ) {
              if (!processing) {
                setShowPayment(
                  false,
                );
              }
            }
          }}
        >
          <div
            className="product-modal"
            role="dialog"
            aria-modal="true"
          >
            <div className="modal-header">
              <div>
                <span className="section-kicker">
                  PAYMENT
                </span>

                <h2>
                  Complete Payment
                </h2>
              </div>

              <button
                className="modal-close"
                type="button"
                disabled={
                  processing
                }
                onClick={() =>
                  setShowPayment(
                    false,
                  )
                }
              >
                <X size={19} />
              </button>
            </div>

            <div
              style={{
                padding:
                  "28px 24px",
              }}
            >
              {(customerName || customerPhone) && (
                <div
                  style={{
                    marginBottom: "22px",
                    padding: "14px 16px",
                    border: "1px solid #e5e5e5",
                    background: "#fafafa",
                  }}
                >
                  <div
                    style={{
                      fontSize: "10px",
                      letterSpacing: "2px",
                      textTransform: "uppercase",
                      color: "#777",
                      marginBottom: "7px",
                    }}
                  >
                    Customer
                  </div>
                  <strong style={{ display: "block", fontSize: "15px" }}>
                    {customerName || "Customer"}
                  </strong>
                  {customerPhone && (
                    <span
                      style={{
                        display: "block",
                        marginTop: "3px",
                        color: "#777",
                        fontSize: "13px",
                      }}
                    >
                      {customerPhone}
                    </span>
                  )}
                </div>
              )}

              <div
                style={{
                  display: "grid",
                  gap: "8px",
                  marginBottom: "24px",
                  fontSize: "14px",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span>Subtotal</span>
                  <strong>₹{subtotal.toFixed(2)}</strong>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span>CGST</span>
                  <strong>₹{cgst.toFixed(2)}</strong>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span>SGST</span>
                  <strong>₹{sgst.toFixed(2)}</strong>
                </div>
                {discountAmount > 0 && (
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span>Discount</span>
                    <strong>-₹{discountAmount.toFixed(2)}</strong>
                  </div>
                )}
              </div>

              <div
                style={{
                  textAlign:
                    "center",
                  marginBottom:
                    "28px",
                }}
              >
                <span
                  style={{
                    display:
                      "block",
                    fontSize:
                      "13px",
                    letterSpacing:
                      "2px",
                    textTransform:
                      "uppercase",
                    color: "#777",
                    marginBottom:
                      "8px",
                  }}
                >
                  Amount Payable
                </span>

                <strong
                  style={{
                    fontSize:
                      "38px",
                    fontFamily:
                      "Georgia, serif",
                  }}
                >
                  ₹
                  {grandTotal.toFixed(
                    2,
                  )}
                </strong>
              </div>

              <div
                style={{
                  display:
                    "grid",
                  gridTemplateColumns:
                    "repeat(3, 1fr)",
                  gap: "10px",
                }}
              >
                <button
                  type="button"
                  onClick={() =>
                    setPaymentMethod(
                      "cash",
                    )
                  }
                  disabled={
                    processing
                  }
                  style={{
                    padding:
                      "18px 10px",
                    border:
                      paymentMethod ===
                      "cash"
                        ? "2px solid #111"
                        : "1px solid #ddd",
                    background:
                      paymentMethod ===
                      "cash"
                        ? "#f5f5f5"
                        : "#fff",
                    cursor:
                      "pointer",
                  }}
                >
                  <strong>
                    Cash
                  </strong>
                </button>

                <button
                  type="button"
                  onClick={() =>
                    setPaymentMethod(
                      "upi",
                    )
                  }
                  disabled={
                    processing
                  }
                  style={{
                    padding:
                      "18px 10px",
                    border:
                      paymentMethod ===
                      "upi"
                        ? "2px solid #111"
                        : "1px solid #ddd",
                    background:
                      paymentMethod ===
                      "upi"
                        ? "#f5f5f5"
                        : "#fff",
                    cursor:
                      "pointer",
                  }}
                >
                  <strong>
                    UPI
                  </strong>
                </button>

                <button
                  type="button"
                  onClick={() =>
                    setPaymentMethod(
                      "card",
                    )
                  }
                  disabled={
                    processing
                  }
                  style={{
                    padding:
                      "18px 10px",
                    border:
                      paymentMethod ===
                      "card"
                        ? "2px solid #111"
                        : "1px solid #ddd",
                    background:
                      paymentMethod ===
                      "card"
                        ? "#f5f5f5"
                        : "#fff",
                    cursor:
                      "pointer",
                    display:
                      "flex",
                    alignItems:
                      "center",
                    justifyContent:
                      "center",
                    gap: "7px",
                  }}
                >
                  <CreditCard
                    size={18}
                  />

                  <strong>
                    Card
                  </strong>
                </button>
              </div>
            </div>

            <div className="modal-footer">
              <button
                className="secondary-button"
                type="button"
                disabled={
                  processing
                }
                onClick={() =>
                  setShowPayment(
                    false,
                  )
                }
              >
                Cancel
              </button>

              <button
                className="primary-button"
                type="button"
                disabled={
                  processing
                }
                onClick={
                  completePayment
                }
              >
                <Check size={17} />

                {processing
                  ? "Processing..."
                  : `Pay ₹${grandTotal.toFixed(
                      2,
                    )}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
