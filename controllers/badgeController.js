const Badge = require('../models/Badge');

const getAllBadges = async (req, res, next) => {
  console.log('\n--- [badgeController] Running getAllBadges ---');
  try {
    const badges = await Badge.find().sort({ title: 1 }); 
    res.status(200).json(badges);
  } catch (error) {
    console.error('[badgeController] Error fetching badges:', error);
    next(error);
  }
};

const getUserBadges = async (req, res, next) => {
  try {
    const userId = req.user.id;
    
    // Truy vấn tất cả huy hiệu của người dùng và populate thông tin huy hiệu
    const userBadges = await UserBadge
      .find({ user: userId })
      .populate('badge')
      .sort({ unlockedAt: -1 }); // Sắp xếp theo thời gian mở khóa (mới nhất trước)
      
    res.status(200).json(userBadges);
  } catch (error) {
    console.error('[badgeController] Error fetching user badges:', error);
    next(error);
  }
};

const addBadge = async (req, res, next) => {
  console.log('\n--- [badgeController] Running addBadge ---');
  try {
    const { title, description, icon, milestoneType, milestoneValue } = req.body;

    if (!title || !milestoneType || !milestoneValue) {
      return res.status(400).json({ message: 'Missing required fields.' });
    }

    const newBadge = new Badge({
      title,
      description,
      icon,
      milestoneType,
      milestoneValue,
    });

    await newBadge.save();
    res.status(201).json(newBadge);
  } catch (error) {
    console.error('[badgeController] Error adding badge:', error);
    next(error);
  }
};

module.exports = {
  getAllBadges,
  getUserBadges,
  addBadge,
};