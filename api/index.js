import express from "express";
import dotenv from "dotenv";
import bodyParser from "body-parser";
import twilio from "twilio";

dotenv.config();

const app = express();
app.use(bodyParser.json());

// Health check endpoint
app.get("/", (req, res) => {
  res.status(200).json({ status: "API is running" });
});

// POST webhook/order-created
const processedOrders = new Set();
app.post("/webhook/order-created", async (req, res) => {
  const order = req.body;
  const orderId = order.id;

  const customer = order.customer;
  const name = `${customer?.first_name || "Customer"}`;
  const total = order.total_price;
  const phone = customer?.phone;
  const item_list = order?.line_items
    .map((i) => `${i.quantity}x ${i.title} (${i.variant_title})`)
    .join(", ");

  if (!phone) {
    console.error(`❌ No phone number found for Order ID: ${orderId}`);
    return;
  }

  // check duplicate process
  if (processedOrders.has(orderId)) {
    console.log(
      `Duplicate order received. Skipping WhatsApp message for Order ID: ${orderId}`
    );
    return;
  }
  processedOrders.add(orderId);
  setTimeout(() => processedOrders.delete(orderId), 10 * 60 * 1000);

  const formattedPhone = `whatsapp:${phone.replace(/\s+/g, "")}`;
  const client = twilio(
    process.env.TWILIO_ACCOUNT_SID,
    process.env.TWILIO_AUTH_TOKEN
  );

  try {
    await client.messages.create({
      from: process.env.TWILIO_WHATSAPP_FROM,
      // to: process.env.WHATSAPP_TO,
      to: formattedPhone,
      // body: `🛒 New Order Created!\n👤 Name: ${name}\n📦 Order ID: ${orderId}\n💰 Total: $${total}`,
      body: ` 
        Hi ${name}, 👋

        Thank you for your order! 🛍️

        🧾 Order ID: #${orderId} 
        📦 Items: ${item_list}
        💰 Total: $ ${total}  
        📍 Shipping to: ${order.shipping_address.address1}, ${
        order.shipping_address.city
      }, ${order.shipping_address.province}
        📅 Order Date: ${new Date(order.created_at).toLocaleDateString("en-IN")}

        We'll notify you once your order is on its way.  
        If you have any questions, reply to this message.

        Thanks for shopping with Kagu Wear! 💚
       `,
    });

    console.log("WhatsApp message sent.", formattedPhone);
    res.sendStatus(200);
  } catch (err) {
    console.error("Error sending WhatsApp message:", err);
    res.sendStatus(500);
  }
});

if (process.env.NODE_ENV !== "production") {
  app.listen(3000, () => console.log("Running at http://localhost:3000"));
}

export default app;
