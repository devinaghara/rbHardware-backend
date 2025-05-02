import { connectDB } from "./DB/ConnectDb.js";
import bodyparser from "body-parser";
import express from 'express';
import cookieParser from 'cookie-parser';
import session from "express-session";
import dotenv from 'dotenv';
import MongoStore from "connect-mongo";
import mongoose from "mongoose";
import cors from "cors"

const app = express();


app.use(cors({
  origin: ['http://localhost:5173', 'https://www.rbhardware.in'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  credentials: true,
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.set("trust proxy", 1);

dotenv.config();
app.use(express.json({ limit: "16kb" }));
app.use(express.urlencoded({ extended: true, limit: "16kb" }));
app.use(express.static("public"));
app.use(cookieParser());



app.use(bodyparser.json());

connectDB()
  .then(() => {
    app.listen(process.env.PORT || 8000, () => {
      console.log(`server is litsening on port number ${process.env.PORT}`);
    });
  })
  .catch((err) => {
    console.log("MongoDB connection failed.", err);
  });

// session Configuration
// app.use(
//     session({
//       secret: "secret",
//       resave: false,
//       saveUninitialized: false,
//       cookie: {
//         maxAge: 24 * 60 * 60 * 1000,
//         secure: false,
//         httpOnly: true,
//         sameSite: "lax",
//       },
//       name: "user",
//       store: MongoStore.create({
//         client: mongoose.connection.getClient(),
//         dbName: process.env.DB_NAME,
//         collectionName: "sessions",
//         stringify: false,
//         autoRemove: "interval",
//         autoRemoveInterval: 1,
//       }),
//     }),
//   );

app.use(
  session({
    secret: process.env.Session_Secret || "secret",
    resave: false,
    saveUninitialized: true,
    cookie: {
      maxAge: 24 * 60 * 60 * 1000,
      secure: true,
      secure: process.env.NODE_ENV === 'production',
      httpOnly: true,
      sameSite: "none",
    },
    proxy: true,
    name: "user",
    store: MongoStore.create({
      client: mongoose.connection.getClient(),
      // dbName: process.env.DB_NAME,
      collectionName: "sessions",
      stringify: false,
      autoRemove: "interval",
      autoRemoveInterval: 1,
    }),
  }),
);

import AuthRoutes from "./Routes/Auth.routes.js";
import ProductRoutes from "./Routes/Product.routes.js";
import ColorRoutes from "./Routes/Color.routes.js";
import MaterialRoutes from "./Routes/Material.routes.js";
import CategoryRoutes from "./Routes/Category.routes.js";
import AddressRoutes from "./Routes/Address.routes.js"
import CartRoutes from "./Routes/Cart.routes.js"
import OrderRoutes from "./Routes/Order.routes.js"

app.use("/auth", AuthRoutes);
app.use("/plist", ProductRoutes);
app.use("/colorfilter", ColorRoutes);
app.use("/materialfilter", MaterialRoutes);
app.use("/categoryfilter", CategoryRoutes);
app.use("/api/addresses", AddressRoutes)
app.use("/api/cart", CartRoutes)
app.use("/order", OrderRoutes)