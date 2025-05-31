import express from "express";
import dotenv from "dotenv";
import bodyParser from "body-parser";
import twilio from "twilio";

dotenv.config();

const app = express();
app.use(bodyParser.json());

app.post("/webhook/order-created", async (req, res) => {
  const order = req.body;

  const customer = order.customer;
  const name = `${customer?.first_name || "Customer"}`;
  const orderId = order.id;
  const total = order.total_price;

  const client = twilio(
    process.env.TWILIO_ACCOUNT_SID,
    process.env.TWILIO_AUTH_TOKEN
  );

  try {
    await client.messages.create({
      from: process.env.TWILIO_WHATSAPP_FROM,
      to: process.env.WHATSAPP_TO,
      body: `🛒 New Order Created!\n👤 Name: ${name}\n📦 Order ID: ${orderId}\n💰 Total: $${total}`,
    });

    console.log("WhatsApp message sent.");
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
