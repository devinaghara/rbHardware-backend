import express from "express";
import { createPaymentIntent, confirmPayment } from "../Controllers/Payment.controller.js";
import { isAuthenticated } from "../Middlewares/auth.js";

const router = express.Router();

// Both routes require authentication
router.post("/create-intent", isAuthenticated, createPaymentIntent);
router.post("/confirm", isAuthenticated, confirmPayment);

export default router;
