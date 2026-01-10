const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");

router.post("/signup", authController.signup);
router.post("/login", authController.login);
router.post("/forgot-password", authController.forgotPassword);
router.post("/reset-password", authController.resetPassword);
router.get("/admins", authController.getAllAdmins);
router.delete("/admins/:id", authController.deleteAdmin);
router.get("/stats", authController.getAdminStats);
router.get("/recent-activity", authController.getRecentActivity);
router.get("/users", authController.getAllUsers);
router.post("/users", authController.createUser);
router.put("/users/:id", authController.updateUser);
router.delete("/users/:id", authController.deleteUser);
router.put("/profile", authController.updateProfile);

module.exports = router;







