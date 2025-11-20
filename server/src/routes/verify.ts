
// server/src/routes/verify.ts
import { Router } from "express";
import crypto from "crypto";
import User from "../models/user";
import EmailVerification from "../models/EmailVerification";

const router = Router();

router.get("/verify/:token", async (req, res) => {
  try {
    const token = req.params.token;
    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

    const record = await EmailVerification.findOne({
      tokenHash,
      usedAt: null,
      expiresAt: { $gt: new Date() },
    });

    if (!record) {
      return res.status(400).send("Invalid or expired verification link.");
    }

    await User.findByIdAndUpdate(record.userId, { isVerified: true });
    record.usedAt = new Date();
    await record.save();

    return res.redirect("https://bfflix.com/verify-success");
  } catch (err) {
    return res.status(500).send("Verification failed.");
  }
});

export default router;