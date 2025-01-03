import { Router } from "express";
import {
  CreateUser,
  getProfile,
  getUser,
  LoginUser,
  logOut,
  updateProfile,
  authVerifyController
} from "../Controllers/Auth.controller.js";

const router = Router();

router.post("/sign-up", CreateUser);
router.post("/login", LoginUser);
router.get("/logout", logOut);
router.get("/me", getUser);

router.put('/update-profile', updateProfile);
router.get('/get-profile', getProfile);

router.post('/send-otp', authVerifyController.sendOTP);//signup - otpVerification Page
router.post('/verify-otp', authVerifyController.verifyOTPHandler);//otp verification page - navigation from signup
router.post('/forgot-password', authVerifyController.forgotPassword);//login
router.post('/reset-password', authVerifyController.resetPassword);//resetpassword page

export default router;