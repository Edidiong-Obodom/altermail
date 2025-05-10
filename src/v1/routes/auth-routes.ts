import { Router } from "express";
import {
  register,
  sendVerificationCode,
} from "../controllers/auth/authController";

const router = Router();

// sends verification code for reg
router.post("/signup/send-code", sendVerificationCode);

// registers user
router.post("/signup/register", register);

export default router;
