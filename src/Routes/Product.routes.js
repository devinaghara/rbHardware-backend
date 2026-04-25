import { Router } from "express";
import {
  getAllProducts,
  getProduct,
  addProducts,
  updateProduct,
  deleteProduct,
  toggleProductOrderable,
} from "../Controllers/Product.controller.js";
import { isAuthenticated } from "../Middlewares/auth.js";
import { isAdmin } from "../Middlewares/adminAuth.js";
import upload from "../Middlewares/upload.js";

const router = Router();

router.route("/addproduct").post(addProducts);
router.route("/productlist").get(getAllProducts);
router.route("/productlist/:id").get(getProduct);
router.route("/productlist/:id").put(updateProduct);
router.route("/productlist/:id").delete(deleteProduct);
router.patch("/productlist/:id/orderable", isAuthenticated, isAdmin, toggleProductOrderable);

router.post(
  "/upload-product-images",
  upload.array("images", 6), 
  (req, res) => {
    const urls = req.files.map((file) => `/uploads/${file.filename}`);
    res.json({ images: urls });
  }
);

export default router;
