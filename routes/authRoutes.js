const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const authMiddleware = require("../middleware/authMiddleware"); 

router.post('/telegram', authController.telegramLoginOrRegister);

router.post("/daily-login", authMiddleware.isAuthenticated, authController.processDailyLogin);

module.exports = router;