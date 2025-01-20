import { Router } from "express";
import { getAllProducts, getProduct, addProducts, updateProduct, deleteProduct } from "../Controllers/Product.controller.js";

const router = Router();

router.route("/addproduct").post(addProducts);
router.route("/productlist").get(getAllProducts);
router.route("/productlist/:id").get(getProduct);
router.route("/productlist/:id").put(updateProduct);
router.route("/productlist/:id").delete(deleteProduct);

export default router;
