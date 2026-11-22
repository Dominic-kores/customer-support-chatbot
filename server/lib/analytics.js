
import { randomUUID } from "node:crypto";
import { supabase, resend } from "../lib/clients.js";

// ============================================
// TOOL 1: CHECK ORDER STATUS
// ============================================

export async function checkOrderStatus({ order_id }) {
  // Normalize the order ID before searching.
  const id = String(order_id || "")
    .trim()
    .toUpperCase();

  // Validate the expected order ID pattern.
  if (!/^SC-\d{4,}$/.test(id)) {
    return {
      error: "Invalid order ID. Use a format like SC-1847."
    };
  }

  // Look up a mock order in Supabase.
  const { data, error } = await supabase
    .from("orders")
    .select(
      "id,items,total,payment_method,status," +
      "tracking_number,delivery_estimate"
    )
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;

  // Handle unknown orders gracefully.
  if (!data) {
    return {
      error: `Order ${id} was not found.`
    };
  }

  return {
    currency: "KES",
    ...data
  };
}

// ============================================
// TOOL 2: GET PRODUCT INFORMATION
// ============================================

export async function getProductInfo({ query }) {
  const search = String(query || "").trim();

  if (!search) {
    return { error: "A product search is required." };
  }

  // Limit input length to avoid oversized queries.
  if (search.length > 100) {
    return { error: "Search text is too long." };
  }

  // Search by name, category or specifications.
  // For a larger catalogue, use full-text search.
  const { data, error } = await supabase
    .from("products")
    .select("name,category,price_kes,stock_status,specs")
    .or(
      `name.ilike.%${search.replace(/[,%().]/g, "")}%,` +
      `category.ilike.%${search.replace(/[,%().]/g, "")}%`
    )
    .limit(10);

  if (error) throw error;

  if (!data?.length) {
    return {
      message: "No products matched that search."
    };
  }

  return {
    currency: "KES",
    products: data
  };
}

// ============================================
// TOOL 3: ESCALATE TO HUMAN
// ============================================

export async function escalateToHuman(
  { reason, priority },
  context
) {
  // Create a unique ticket number.
  const ticketId =
    "SC-TKT-" + randomUUID().slice(0, 8).toUpperCase();

  const safePriority = ["low", "medium", "high"]
    .includes(priority) ? priority : "medium";

  const safeReason = String(reason || "Customer request")
    .slice(0, 1000);

  // Insert the ticket before attempting email.
  const { error } = await supabase
    .from("support_tickets")
    .insert({
      id: ticketId,
      session_id: context.sessionId,
      reason: safeReason,
      priority: safePriority,
      status: "open"
    });

  if (error) throw error;

  let notificationStatus = "not_configured";

  // Send an email only when Resend is configured.
  if (resend && process.env.SUPPORT_EMAIL) {
    try {
      const result = await resend.emails.send({
        from: process.env.RESEND_FROM,
        to: process.env.SUPPORT_EMAIL,

        subject:
          `Customer Support Escalation - ${ticketId}`,

        text: [
          `Ticket ID: ${ticketId}`,
          `Priority: ${safePriority}`,
          `Reason: ${safeReason}`,
          `Question: ${context.question}`,
          "",
          "Conversation summary:",
          ...context.history.map(
            item => `${item.role}: ${item.content}`
          )
        ].join("\n")
      });

      if (result.error) throw result.error;

      notificationStatus = "sent";
    } catch (error) {
      console.error("Resend error:", error);
      notificationStatus = "failed";
    }
  }

  // The ticket exists even if email delivery fails.
  return {
    success: true,
    ticket_id: ticketId,
    status: "open",
    notification_status: notificationStatus
  };
}

// ============================================
// CENTRAL TOOL DISPATCHER
// ============================================
// Only approved tool names can be executed.

export async function executeTool(
  name,
  input,
  context
) {
  switch (name) {
    case "check_order_status":
      return checkOrderStatus(input);

    case "get_product_info":
      return getProductInfo(input);

    case "escalate_to_human":
      return escalateToHuman(input, context);

    default:
      return {
        error: `Unsupported tool: ${name}`
      };
  }
}
