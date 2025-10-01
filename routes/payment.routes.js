import express from "express"
import { protectRoute } from "../middleware/auth.middleware"
import {
  checkOutSuccess,
  createCheckoutSession,
} from "../controllers/payment.controller"

const router = express.Router()

router.post("/create-checkout-session", protectRoute, createCheckoutSession)

router.post("/checkout-success", protectRoute, checkOutSuccess)

export default router
