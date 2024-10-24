import { Router } from "express";
import { getAllProducts, getProduct, addProducts } from "../Controllers/Product.controller.js";

const router = Router();

router.route("/addproduct").post(addProducts);
router.route("/productlist").get(getAllProducts);
router.route("/productlist/:id").get(getProduct);

export default router;
