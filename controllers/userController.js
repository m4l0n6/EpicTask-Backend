const User = require('../models/User');
const Task = require('../models/Task');  
const UserBadge = require('../models/UserBadge');  
const LeaderboardService = require('../services/leaderboardService');  
const gamificationService = require('../services/gamificationService');

const getMyProfile = async (req, res, next) => {
  console.log('\n--- [userController] Running getMyProfile ---');
 
  const userId = req.user.id;  

  try {
const userProfile = await User.findById(userId)
.select('-__v');  

if (!userProfile) {
return res.status(404).json({ message: 'User profile not found.' });
}
const rankInfo = await LeaderboardService.getUserRankAndScore(userId); 

 
const responseData = userProfile.toObject(); 
console.log('[userController] Querying tasks separately...');
const tasks = await Task.find({ owner: userId }).sort({ createdAt: -1 });

console.log('[userController] Querying userBadges separately and populating badge details...');
const userBadgesPopulated = await UserBadge.find({ user: userId })
                                      .populate({  
                                          path: 'badge', 
                                          model: 'Badge',
                                          select: '-__v -createdAt -updatedAt'  
                                      });

responseData.tasks = tasks;  
 
responseData.badges = userBadgesPopulated.map(ub => {
  if(ub.badge) {  
      return {
          _id: ub.badge._id,
          title: ub.badge.title,
          description: ub.badge.description,
          icon: ub.badge.icon,
          receivedAt: ub.createdAt  
      };
  }
  return null;  
}).filter(b => b !== null);  


responseData.rank = rankInfo.rank;  

console.log('[userController] Successfully fetched user profile with separate queries.');
res.status(200).json(responseData);

  } catch (error) {
    console.error('[userController] Error fetching user profile:', error);
    next(error);  
  }
};

const addTokens = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { amount } = req.body;

    if (!amount || isNaN(amount) || amount <= 0) {
      return res.status(400).json({ message: 'Invalid token amount' });
    }

    const updatedUser = await gamificationService.awardTokens(userId, amount);
    
    if (!updatedUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.status(200).json(updatedUser);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getMyProfile,
  addTokens
};