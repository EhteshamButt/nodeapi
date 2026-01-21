const express = require("express");
const router = express.Router();
const walletController = require("../controllers/walletController");

router.options("*", (req, res) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.sendStatus(204);
});

router.get("/me", walletController.getMyWallet);
router.post("/withdraw", walletController.requestWithdraw);

module.exports = router;

