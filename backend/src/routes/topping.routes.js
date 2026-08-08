import express from "express";
import {
  getAllToppings,
  getToppingById,
  createTopping,
  updateTopping,
  deleteTopping,
} from "../controllers/topping.controller.js";
 
const router = express.Router();
 
router.get("/", getAllToppings);
router.get("/:MA_TOPPING", getToppingById);
router.post("/", createTopping);
router.put("/:MA_TOPPING", updateTopping);
router.delete("/:MA_TOPPING", deleteTopping);
 
export default router;
 