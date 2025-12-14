import { Router } from "express";
import {
  getAllProducts,
  getProduct,
  addProducts,
  updateProduct,
  deleteProduct,
} from "../Controllers/Product.controller.js";
import upload from "../Middlewares/upload.js";

const router = Router();

router.route("/addproduct").post(addProducts);
router.route("/productlist").get(getAllProducts);
router.route("/productlist/:id").get(getProduct);
router.route("/productlist/:id").put(updateProduct);
router.route("/productlist/:id").delete(deleteProduct);

router.post(
  "/upload-product-images",
  upload.array("images", 6), 
  (req, res) => {
    const urls = req.files.map((file) => `/uploads/${file.filename}`);
    res.json({ images: urls });
  }
);

export default router;
