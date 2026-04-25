import express from 'express';

import {
  cancelOrder,
  createOrder,
  getAllOrders,
  getOrderById,
  getOrderByIdAdmin,
  getUserOrders,
  updateOrderStatus,
} from '../Controllers/Order.controller.js';
import { isAdmin } from '../Middlewares/adminAuth.js';
import { isAuthenticated } from '../Middlewares/auth.js';

const router = express.Router();

// User routes - require authentication
router.post('/create', isAuthenticated, createOrder);
router.get('/user', isAuthenticated, getUserOrders);

// Admin routes - require admin privileges (placed BEFORE :orderId to avoid conflicts)
router.get('/allOrder', isAuthenticated, isAdmin, getAllOrders);
router.get('/admin/:orderId', isAuthenticated, isAdmin, getOrderByIdAdmin);
router.patch('/admin/:orderId/status', isAuthenticated, isAdmin, updateOrderStatus);

// User order-specific routes (with :orderId param)
router.get('/:orderId', isAuthenticated, getOrderById);
router.patch('/:orderId/cancel', isAuthenticated, cancelOrder);

export default router;