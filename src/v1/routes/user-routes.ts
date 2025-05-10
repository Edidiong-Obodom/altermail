import { Router } from "express";
import { sendMail } from "../controllers/users/userController";

const router = Router();

// Create new regime
router.post("/email/send", sendMail);

export default router;
