
import { supabase } from "../lib/clients.js";
import { saveDocument } from "../lib/documents.js";
import { faqs } from "./faq-entries.js";

const orders = [
  {
    id: "SC-1847",
    customer_name: "Demo Customer A",
    items: [{ name: "Samsung Galaxy A15", qty: 1 }],
    total: 24500,
    payment_method: "M-Pesa",
    status: "shipped",
    tracking_number: "KE-TRK-1001",
    delivery_estimate: "2-3 business days"
  },
  {
    id: "SC-1848",
    customer_name: "Demo Customer B",
    items: [{ name: "HP Pavilion Laptop", qty: 1 }],
    total: 82000,
    payment_method: "Card",
    status: "pending",
    tracking_number: null,
    delivery_estimate: "Awaiting payment"
  },
  {
    id: "SC-1849",
    customer_name: "Demo Customer C",
    items: [{ name: "Redmi Note 13", qty: 1 }],
    total: 28999,
    payment_method: "M-Pesa",
    status: "processing",
    tracking_number: null,
    delivery_estimate: "3-5 business days"
  },
  {
    id: "SC-1850",
    customer_name: "Demo Customer D",
    items: [{ name: "JBL Headphones", qty: 1 }],
    total: 8900,
    payment_method: "Card",
    status: "delivered",
    tracking_number: "KE-TRK-1004",
    delivery_estimate: "Delivered"
  },
  {
    id: "SC-1851",
    customer_name: "Demo Customer E",
    items: [{ name: "iPhone 13", qty: 1 }],
    total: 75500,
    payment_method: "M-Pesa",
    status: "cancelled",
    tracking_number: null,
    delivery_estimate: "Cancelled"
  }
];

async function seed() {
  console.log("Seeding Safari Connect knowledge base...");

  // Re-running is safe: IDs are deterministic.
  for (let i = 0; i < faqs.length; i++) {
    const faq = faqs[i];

    await saveDocument({
      id: `faq-${String(i + 1).padStart(3, "0")}`,
      ...faq
    });

    console.log(`Embedded FAQ ${i + 1}/${faqs.length}`);
  }

  const { error } = await supabase
    .from("orders")
    .upsert(orders);

  if (error) throw error;

  console.log("FAQ documents and mock orders seeded.");
}

seed().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
