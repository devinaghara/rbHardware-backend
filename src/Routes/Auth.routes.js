import { Router } from "express";
import { CreateUser, getProfile, getUser, LoginUser, logOut, updateProfile } from "../Controllers/Auth.controller.js";

const router = Router();

router.route("/sign-up").post(CreateUser);
router.route("/login").post(LoginUser);
router.route("/me").get(getUser);
router.route("/logout").get(logOut);

router.put('/update-profile', updateProfile);
router.get('/get-profile', getProfile);

export default router;
