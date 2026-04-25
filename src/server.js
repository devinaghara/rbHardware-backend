import dotenv from "dotenv";
dotenv.config();

import { connectDB } from "./DB/ConnectDb.js";
import express from "express";
import cookieParser from "cookie-parser";
import session from "express-session";
import MongoStore from "connect-mongo";
import mongoose from "mongoose";
import cors from "cors";
import passport from "./Config/passport.js";

import AuthRoutes from "./Routes/Auth.routes.js";
import ProductRoutes from "./Routes/Product.routes.js";
import ColorRoutes from "./Routes/Color.routes.js";
import MaterialRoutes from "./Routes/Material.routes.js";
import CategoryRoutes from "./Routes/Category.routes.js";
import AddressRoutes from "./Routes/Address.routes.js";
import CartRoutes from "./Routes/Cart.routes.js";
import OrderRoutes from "./Routes/Order.routes.js";
import PaymentRoutes from "./Routes/Payment.routes.js";

const app = express();

app.use(cors({
  origin: [process.env.FRONTEND_URL || "http://localhost:5173", "https://www.rbhardware.in", "https://rbhardware.in"],
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
  credentials: true,
  allowedHeaders: ["Content-Type", "Authorization"],
}));

app.set("trust proxy", 1);
app.use(express.json({ limit: "16kb" }));
app.use(express.urlencoded({ extended: true, limit: "16kb" }));
app.use(express.static("public"));
app.use(cookieParser());

// ✅ Everything that needs DB connection goes INSIDE .then()
connectDB()
  .then(() => {

    const isProduction = process.env.NODE_ENV === "production";

    app.use(session({
      secret: process.env.Session_Secret || "secret",
      resave: false,
      saveUninitialized: false,
      cookie: {
        maxAge: 24 * 60 * 60 * 1000,
        secure: isProduction,
        httpOnly: true,
        sameSite: isProduction ? "none" : "lax",  // "none" required for cross-origin in production
      },
      name: "user",
      store: MongoStore.create({
        client: mongoose.connection.getClient(),
        collectionName: "sessions",
        stringify: false,
        autoRemove: "interval",
        autoRemoveInterval: 10,
      }),
    }));

    // ✅ Passport session shim — prevents server crash when MongoStore has a connection blip
    // Passport v0.7+ calls req.session.regenerate() and req.session.save() internally.
    // If MongoStore momentarily fails, req.session can be undefined, crashing the server.
    app.use((req, res, next) => {
      if (!req.session) {
        req.session = {
          regenerate: (cb) => cb(),
          save: (cb) => cb(),
          destroy: (cb) => cb(),
        };
        return next();
      }
      if (!req.session.regenerate) req.session.regenerate = (cb) => cb();
      if (!req.session.save) req.session.save = (cb) => cb();
      next();
    });

    // ✅ Passport AFTER session
    app.use(passport.initialize());
    app.use(passport.session());

    // ✅ Routes AFTER passport
    app.use("/auth", AuthRoutes);
    app.use("/plist", ProductRoutes);
    app.use("/colorfilter", ColorRoutes);
    app.use("/materialfilter", MaterialRoutes);
    app.use("/categoryfilter", CategoryRoutes);
    app.use("/api/addresses", AddressRoutes);
    app.use("/api/cart", CartRoutes);
    app.use("/order", OrderRoutes);
    app.use("/api/payment", PaymentRoutes);

    app.listen(process.env.PORT || 8000, () => {
      console.log(`Server is listening on port ${process.env.PORT || 8000}`);
    });

  })
  .catch((err) => {
    console.log("MongoDB connection failed.", err);
  });