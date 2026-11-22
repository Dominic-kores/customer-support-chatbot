
export const supportTools = [
  {
    name: "check_order_status",
    description:
      "Check a customer's demo order using its order ID.",
    input_schema: {
      type: "object",
      properties: {
        order_id: {
          type: "string",
          description: 'Order ID, e.g. "SC-1847"'
        }
      },
      required: ["order_id"]
    }
  },
  {
    name: "get_product_info",
    description:
      "Search the product catalogue by product name " +
      "or category. Return prices in Kenyan shillings.",
    input_schema: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "Product model or category to search"
        }
      },
      required: ["query"]
    }
  },
  {
    name: "escalate_to_human",
    description:
      "Create a human support ticket when the customer " +
      "requests an agent or agrees to escalation.",
    input_schema: {
      type: "object",
      properties: {
        reason: {
          type: "string",
          description: "Reason for escalation"
        },
        priority: {
          type: "string",
          enum: ["low", "medium", "high"],
          description: "Urgency of the support issue"
        }
      },
      required: ["reason", "priority"]
    }
  }
];
