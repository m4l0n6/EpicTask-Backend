const express = require('express');
const router = express.Router();
const badgeController = require('../controllers/badgeController');
const authMiddleware = require("../middleware/authMiddleware"); 


router.get('/', badgeController.getAllBadges);
router.post('/', badgeController.addBadge);
router.get(
  "/users/badges",
  authMiddleware.isAuthenticated,
  badgeController.getUserBadges
);



module.exports = router;