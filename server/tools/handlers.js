
import { randomUUID } from "node:crypto";
import { supabase, resend } from "../lib/clients.js";

// Demo product catalogue, priced in KES.
// Prices are fictional seed data.
const products = [
  { name: "Samsung Galaxy A15", price: 24500, category: "Smartphones", stock: "in stock", specs: "128GB, 6GB RAM" },
  { name: "Samsung Galaxy A25", price: 36500, category: "Smartphones", stock: "limited", specs: "128GB, AMOLED" },
  { name: "Redmi Note 13", price: 28999, category: "Smartphones", stock: "in stock", specs: "256GB, 8GB RAM" },
  { name: "iPhone 13", price: 75500, category: "Smartphones", stock: "limited", specs: "128GB" },
  { name: "Tecno Spark 20", price: 17500, category: "Smartphones", stock: "in stock", specs: "128GB" },
  { name: "HP Pavilion Laptop", price: 82000, category: "Laptops", stock: "in stock", specs: "Core i5, 8GB RAM" },
  { name: "Lenovo IdeaPad", price: 69000, category: "Laptops", stock: "limited", specs: "Ryzen 5, 512GB SSD" },
  { name: "Dell Inspiron", price: 91000, category: "Laptops", stock: "out of stock", specs: "Core i7, 16GB RAM" },
  { name: "JBL Headphones", price: 8900, category: "Accessories", stock: "in stock", specs: "Wireless Bluetooth" },
  { name: "Oraimo Power Bank", price: 3500, category: "Accessories", stock: "in stock", specs: "20000mAh" },
  { name: "Logitech Mouse", price: 2200, category: "Accessories", stock: "in stock", specs: "Wireless" },
  { name: "USB-C Fast Charger", price: 1800, category: "Accessories", stock: "limited", specs: "25W" }
];

export async function checkOrderStatus(input) {
  const id = String(input.order_id || "").trim().toUpperCase();

  if (!/^SC-\d{4,}$/.test(id)) {
    return { error: "Invalid order ID. Use SC-XXXX." };
  }

  const { data, error } = await supabase
    .from("orders")
    .select(
      "id,items,total,payment_method,status," +
      "tracking_number,delivery_estimate"
    )
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;

  return data || {
    error: `No demo order found for ${id}`
  };
}

export function getProductInfo(input) {
  const query = String(input.query || "").trim().toLowerCase();

  if (!query) return { error: "Search query is required" };

  const matches = products.filter(product => {
    const text = [
      product.name,
      product.category,
      product.specs
    ].join(" ").toLowerCase();

    return text.includes(query);
  });

  return matches.length
    ? { currency: "KES", products: matches.slice(0, 10) }
    : { message: "No matching products were found" };
}

export async function escalateToHuman(input, context) {
  // One ticket per tool invocation.
  const ticketId =
    "SC-TKT-" + randomUUID().slice(0, 8).toUpperCase();

  const priority = ["low", "medium", "high"].includes(
    input.priority
  ) ? input.priority : "medium";

  const reason = String(input.reason || "Customer request")
    .slice(0, 1000);

  const { error } = await supabase
    .from("support_tickets")
    .insert({
      id: ticketId,
      session_id: context.sessionId,
      reason,
      priority
    });

  if (error) throw error;

  // Customer support receives a notification if configured.
  let notificationStatus = "not_configured";

  if (resend && process.env.SUPPORT_EMAIL) {
    try {
      const result = await resend.emails.send({
        from: process.env.RESEND_FROM,
        to: process.env.SUPPORT_EMAIL,
        subject: `Customer Support Escalation - ${ticketId}`,
        text: [
          `Ticket: ${ticketId}`,
          `Priority: ${priority}`,
          `Reason: ${reason}`,
          `Customer question: ${context.question}`,
          "",
          "Conversation:",
          ...context.history.map(
            m => `${m.role}: ${m.content}`
          )
        ].join("\n")
      });

      if (result.error) throw result.error;
      notificationStatus = "sent";
    } catch (err) {
      notificationStatus = "failed";
      console.error("Notification failed:", err);
    }
  }

  return {
    success: true,
    ticket_id: ticketId,
    status: "open",
    notification_status: notificationStatus,
    message: "A support ticket has been created."
  };
}

// Execute only the three approved operations.
export async function executeTool(name, input, context) {
  switch (name) {
    case "check_order_status":
      return checkOrderStatus(input);

    case "get_product_info":
      return getProductInfo(input);

    case "escalate_to_human":
      return escalateToHuman(input, context);

    default:
      return { error: `Unknown tool: ${name}` };
  }
}
