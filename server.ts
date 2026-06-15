import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import Stripe from "stripe";
import admin from "firebase-admin";

const app = express();
const PORT = 3000;

// Initialize Firebase Admin App lazily and resiliently
let adminApp: any = null;
function getFirebaseAdmin(): any {
  if (!adminApp) {
    const serviceAccountVar = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
    if (serviceAccountVar) {
      try {
        const serviceAccount = JSON.parse(serviceAccountVar);
        adminApp = admin.initializeApp({
          credential: (admin as any).credential.cert(serviceAccount)
        });
        console.log("Firebase Admin initialized via service account environment key.");
      } catch (e) {
        console.error("Failed to parse FIREBASE_SERVICE_ACCOUNT_KEY JSON. Falling back to Application Default Credentials...", e);
      }
    }

    if (!adminApp) {
      try {
        adminApp = admin.initializeApp();
        console.log("Firebase Admin initialized via Application Default Credentials (ADC).");
      } catch (e) {
        console.warn("Could not initialize Firebase-Admin natively. Initializing with local config projection.", e);
        // Fallback initialization to prevent startup crashes when running in sandbox, letting dev server start
        adminApp = admin.initializeApp({
          projectId: process.env.VITE_FIREBASE_PROJECT_ID || "applet-fallback-project"
        });
      }
    }
  }
  return adminApp;
}

// Global cached Firestore instance targeting the specific databaseId if configured
let dbInstance: any = null;
function getFirestoreDb(): any {
  if (!dbInstance) {
    const adminAppInstance = getFirebaseAdmin();
    let databaseId = "(default)";
    try {
      const configPath = path.join(process.cwd(), "firebase-applet-config.json");
      if (fs.existsSync(configPath)) {
        const configContent = fs.readFileSync(configPath, "utf8");
        const config = JSON.parse(configContent);
        if (config.firestoreDatabaseId) {
          databaseId = config.firestoreDatabaseId;
        }
      }
    } catch (e) {
      console.warn("Could not load databaseId from firebase-applet-config.json, defaulting to (default).");
    }

    if (databaseId && databaseId !== "(default)") {
      try {
        dbInstance = adminAppInstance.firestore(databaseId);
        console.log(`Firestore initialized targeting custom databaseId: ${databaseId}`);
      } catch (err) {
        console.warn(`Fallback to default database initializations. Failed to load firestore with DB ID ${databaseId}:`, err);
        dbInstance = adminAppInstance.firestore();
      }
    } else {
      dbInstance = adminAppInstance.firestore();
    }
  }
  return dbInstance;
}

// Lazy Initialize Stripe SDK strictly at consumption point to prevent server crashes on startup
let stripeClient: Stripe | null = null;
function getStripe(): Stripe {
  if (!stripeClient) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) {
      throw new Error("STRIPE_SECRET_KEY environment variable is required to create checkout sessions.");
    }
    stripeClient = new Stripe(key, { apiVersion: "2023-10-16" as any });
  }
  return stripeClient;
}

// 1. Stripe Webhook Endpoint (Express Raw Body Parsing)
// This is placed BEFORE Express body parsers so the raw signature verify can success
app.post("/webhook", express.raw({ type: "application/json" }), async (req: express.Request, res: express.Response) => {
  const sig = req.headers["stripe-signature"];
  let event: Stripe.Event;

  try {
    const stripe = getStripe();
    if (sig && process.env.STRIPE_WEBHOOK_SECRET) {
      event = stripe.webhooks.constructEvent(
        req.body,
        sig as string,
        process.env.STRIPE_WEBHOOK_SECRET
      );
    } else {
      // Graceful fallback for local development or testing without webhook secrets
      event = JSON.parse(req.body.toString());
    }
  } catch (err: any) {
    console.error(`Stripe Webhook Signature Verification Failed: ${err.message}`);
    // Explicit send text error response but keep server running
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Intercept checkout session completed events
  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const uid = session.metadata?.uid;

    if (uid) {
      console.log(`Setting active premium status for Firebase User ID: ${uid}`);
      try {
        const db = getFirestoreDb();
        
        // Write the premium upgrade status in Firestore under customers
        await db.collection("customers").doc(uid).set({
          isPaidSubscriber: true,
          updatedAt: (admin as any).firestore.FieldValue.serverTimestamp()
        }, { merge: true });

        console.log(`Firestore registration transaction completed successfully for customer: ${uid}`);
      } catch (err) {
        console.error(`Error saving subscriber status to Firestore:`, err);
        return res.status(500).send("Database Update Error");
      }
    } else {
      console.warn("Received checkout session but was aborted: No uid found inside metadata.");
    }
  }

  res.json({ received: true });
});

// Configure Standard Express Parsers for all subsequent request routes
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// 2. Create Stripe Checkout Session Endpoint
app.post("/api/create-checkout-session", async (req: express.Request, res: express.Response) => {
  try {
    const { uid } = req.body;
    if (!uid) {
      return res.status(400).json({ error: "Missing required account Firebase User ID 'uid'." });
    }

    const stripe = getStripe();
    const appUrl = process.env.APP_URL || "http://localhost:3000";

    // Discover if the merchant has a pre-existing Stripe Price product mapped, or fallback gracefully
    let priceId: string | null = null;
    try {
      const prices = await stripe.prices.list({ product: "prod_UhBQ0WMv4IKCWW", active: true, limit: 1 });
      if (prices.data.length > 0) {
        priceId = prices.data[0].id;
      }
    } catch (e: any) {
      console.log("No specific price items found for prod_UhBQ0WMv4IKCWW, creating inline price fallback.", e.message);
    }

    const lineItem = priceId
      ? { price: priceId, quantity: 1 }
      : {
          price_data: {
            currency: "usd",
            product: "prod_UhBQ0WMv4IKCWW",
            unit_amount: 1999, // $19.99 Premium Monthly subscription fallback
            recurring: { interval: "month" as const },
          },
          quantity: 1
        };

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [lineItem],
      mode: "subscription",
      metadata: {
        uid: uid // Link Stripe customer invoice with our specific Firebase User ID
      },
      success_url: `${appUrl}?session_id={CHECKOUT_SESSION_ID}&checkout_success=true`,
      cancel_url: `${appUrl}?checkout_canceled=true`
    });

    return res.json({ id: session.id, url: session.url });
  } catch (error: any) {
    console.error("Create Checkout Session Error:", error);
    return res.status(500).json({ error: error.message || "Failed to initiate checkout session." });
  }
});

// 3. Guarded Server-Side Gemini Melody Generation Route
app.post("/api/generate-music", async (req: express.Request, res: express.Response) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Access Unclassified: Authentication Token target is required." });
    }

    const token = authHeader.split(" ")[1];
    let uid: string;
    try {
      const adminAppInstance = getFirebaseAdmin();
      const decodedToken = await adminAppInstance.auth().verifyIdToken(token);
      uid = decodedToken.uid;
    } catch (authError) {
      console.error("Firebase ID Token verification failed:", authError);
      return res.status(401).json({ error: "Access Denied: Invalid authentication signature." });
    }

    // Verify Stripe customer active subscriber status strictly from our secured Firestore
    try {
      const db = getFirestoreDb();
      const customerDoc = await db.collection("customers").doc(uid).get();
      const isPaid = customerDoc.exists && customerDoc.data()?.isPaidSubscriber === true;

      if (!isPaid) {
        return res.status(403).json({ error: "Access Restricted: Generation commands are locked. Upgrade to premium subscription to generate." });
      }
    } catch (dbError) {
      console.error("Firestore database verification lookup failed:", dbError);
      return res.status(500).json({ error: "Database state check failed. Please try again." });
    }

    const params = req.body;
    
    // Set response headers to direct a chunk-based transfer stream
    res.setHeader("Content-Type", "application/json");
    res.setHeader("Transfer-Encoding", "chunked");

    const { GoogleGenAI, Modality } = await import("@google/genai");
    const apiKey = process.env.GEMINI_API_KEY || "";
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY environment variable is not defined on the server host.");
    }
    const ai = new GoogleGenAI({ apiKey });

    const model = params.duration === 'short' ? 'lyria-3-clip-preview' : 'lyria-3-pro-preview';
    const parts: any[] = [
      { text: `Generate a music track with the following specifications:
        Prompt: ${params.prompt}
        Genre: ${params.genre}
        Mood: ${params.mood}
        Tempo: ${params.tempo} BPM
        Instrumentation: ${params.instrumentation.join(', ')}
        ${params.lyrics ? `Lyrics to incorporate: ${params.lyrics}` : ''}
        ${params.voiceSample ? 'Use the provided voice sample as the primary vocal identity for the generated song.' : ''}
        ${params.referenceSong ? 'IMPORTANT: The generated song should be musically similar to the provided reference song in terms of arrangement, rhythm, and texture, but adapted to the prompt, genre, mood, and instrumentation specified above.' : ''}`
      }
    ];

    if (params.voiceSample) {
      parts.push({
        inlineData: {
          data: params.voiceSample.data,
          mimeType: params.voiceSample.mimeType
        }
      });
    }

    if (params.referenceSong) {
      parts.push({
        inlineData: {
          data: params.referenceSong.data,
          mimeType: params.referenceSong.mimeType
        }
      });
    }

    const responseStream = await ai.models.generateContentStream({
      model: model,
      contents: { parts },
      config: {
        responseModalities: [Modality.AUDIO],
      }
    });

    for await (const chunk of responseStream) {
      res.write(JSON.stringify(chunk) + "\n");
    }
    
    res.end();
  } catch (error: any) {
    console.error("Guarded Generation API error:", error);
    // Be careful to write response only if headers haven't been initiated yet
    if (!res.headersSent) {
      res.status(500).json({ error: error?.message || "Internal technical error during melody execution." });
    } else {
      res.end();
    }
  }
});

// 4. Secure client status verification endpoint to avoid complex client SDK rules
app.post("/api/check-subscription", async (req: express.Request, res: express.Response) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Authentication required" });
    }
    const token = authHeader.split(" ")[1];
    const adminAppInstance = getFirebaseAdmin();
    const decodedToken = await adminAppInstance.auth().verifyIdToken(token);
    const uid = decodedToken.uid;

    const db = getFirestoreDb();
    const customerDoc = await db.collection("customers").doc(uid).get();
    const isPaidSubscriber = customerDoc.exists && customerDoc.data()?.isPaidSubscriber === true;

    return res.json({ isPaidSubscriber });
  } catch (err: any) {
    return res.status(401).json({ error: err.message || "Invalid authentication status verification." });
  }
});

// Configure Vite Assets Serving & SPA Handling for Development vs Production builds
async function initializeAppServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
    console.log("Vite dev middleware mounted.");
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
    console.log("Production static build mounted.");
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Full-stack melody sandbox boot up completely. Accepting traffic on http://localhost:${PORT}`);
  });
}

initializeAppServer();
