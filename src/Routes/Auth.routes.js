import { Router } from "express";
import { CreateUser, getUser, LoginUser, logOut } from "../Controllers/Auth.controller.js";

const router = Router();

router.route("/sign-up").post(CreateUser);
router.route("/login").post(LoginUser);
router.route("/me").get(getUser);
router.route("/logout").get(logOut);

export default router;
