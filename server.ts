import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import Stripe from "stripe";
import admin from "firebase-admin";
import fs from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Initialize Firebase Admin
  const configPath = path.join(__dirname, "firebase-applet-config.json");
  if (fs.existsSync(configPath)) {
    const firebaseConfig = JSON.parse(fs.readFileSync(configPath, "utf-8"));
    if (!admin.apps.length) {
      admin.initializeApp({
        projectId: firebaseConfig.projectId,
      });
    }
  }

  app.use(express.json());

  // Stripe Lazy Initialization
  let stripe: Stripe | null = null;
  const getStripe = () => {
    if (!stripe) {
      const key = process.env.STRIPE_SECRET_KEY;
      if (!key || !key.startsWith('sk_')) {
        throw new Error("Invalid or missing STRIPE_SECRET_KEY. It must start with 'sk_'. Please configure it in the Settings menu.");
      }
      stripe = new Stripe(key);
    }
    return stripe;
  };

  // API Routes
  app.post("/api/create-checkout-session", async (req, res) => {
    try {
      const { userId, email } = req.body;
      if (!userId) {
        return res.status(400).json({ error: "User ID is required" });
      }

      const stripeClient = getStripe();
      const session = await stripeClient.checkout.sessions.create({
        payment_method_types: ["card"],
        line_items: [
          {
            price_data: {
              currency: "inr",
              product_data: {
                name: "Muslim Pro Subscription",
                description: "Unlimited AI Scholar questions and exclusive Fiqh resources.",
              },
              unit_amount: 2000, // ₹20.00
              recurring: {
                interval: "month",
              },
            },
            quantity: 1,
          },
        ],
        mode: "subscription",
        success_url: `${req.headers.origin}/?session_id={CHECKOUT_SESSION_ID}&upgrade=success`,
        cancel_url: `${req.headers.origin}/?upgrade=cancel`,
        customer_email: email,
        metadata: {
          userId: userId,
        },
      });

      res.json({ id: session.id });
    } catch (error: any) {
      console.error("Stripe Error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Verify Payment and Update User
  app.get("/api/verify-session", async (req, res) => {
    const { session_id } = req.query;
    if (!session_id) {
      return res.status(400).json({ error: "Session ID is required" });
    }

    try {
      const stripeClient = getStripe();
      const session = await stripeClient.checkout.sessions.retrieve(session_id as string);
      
      if (session.payment_status === "paid" && session.metadata?.userId) {
        const userId = session.metadata.userId;
        const db = admin.firestore();
        await db.collection("users").doc(userId).set({
          subscriptionStatus: "pro",
          subscriptionId: session.subscription as string,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        }, { merge: true });
        return res.json({ status: "success" });
      }
      
      res.status(400).json({ error: "Payment not verified" });
    } catch (error: any) {
      console.error("Verification Error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Demo Upgrade for testing
  app.post("/api/demo-upgrade", async (req, res) => {
    const { userId } = req.body;
    if (!userId) {
      return res.status(400).json({ error: "User ID is required" });
    }

    try {
      const db = admin.firestore();
      await db.collection("users").doc(userId).set({
        subscriptionStatus: "pro",
        subscriptionId: "demo_sub_" + Date.now(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      }, { merge: true });
      res.json({ status: "success" });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
