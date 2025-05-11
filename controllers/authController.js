const User = require('../models/User');  
const LeaderboardService = require('../services/leaderboardService');  
const { LOGIN_TOKEN_REWARD, STREAK_BONUS_MULTIPLIER } = require('../config/constants');
const gamificationService = require('../services/gamificationService');
const crypto = require('crypto');

// Hàm xác thực data từ Telegram WebApp
function validateTelegramWebAppData(initData, botToken) {
  const data = new URLSearchParams(initData);
  const dataToCheck = [...data.entries()]
    .filter(([key]) => key !== 'hash')
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join('\n');

  const secretKey = crypto
    .createHmac('sha256', 'WebAppData')
    .update(botToken)
    .digest();

  const hash = crypto
    .createHmac('sha256', secretKey)
    .update(dataToCheck)
    .digest('hex');

  return hash === data.get('hash');
}

const telegramLoginOrRegister = async (req, res, next) => {
  console.log('\n--- [authController] Running telegramLoginOrRegister ---');
  console.log('[authController] Request Body:', req.body);
  const userData = req.body.user;  

  if (!userData || !userData.id) {
    return res.status(400).json({ message: 'Missing Telegram user data.' });
  }

  // Thêm đoạn mã kiểm tra initData trước khi xử lý
  if (!validateTelegramWebAppData(req.body.initData, process.env.TELEGRAM_BOT_TOKEN)) {
    return res.status(401).json({ message: 'Invalid Telegram WebApp data' });
  }

  try {
    const telegramId = String(userData.id);  
    let user = await User.findOne({ telegramId: telegramId });
    let isNewUser = false;

    if (user) {
      console.log(`[authController] Found existing user: ${user.id}`);
      let updated = false;
      if (userData.username && user.username !== userData.username) {
        user.username = userData.username;
        updated = true;
      }
      if (userData.photo_url && user.avatar !== userData.photo_url) {
        user.avatar = userData.photo_url;
        updated = true;
      }
      if (updated) {
        await user.save();  
        console.log(`[authController] User ${user.id} info updated.`);
      }
    } else {
      console.log(`[authController] Creating new user for telegramId: ${telegramId}`);
      user = new User({
        telegramId: telegramId,
        username: userData.username,
        avatar: userData.photo_url,
        tokens: 0,
      });
      await user.save();
      isNewUser = true;
      console.log(`[authController] New user created with ID: ${user.id}`);
      await LeaderboardService.updateScore(user.id, 0); 
    }
    req.session.userId = user.id;  
    req.session.save((err) => {
        if (err) {
            console.error('[authController] Error saving session:', err);
            return next(new Error('Failed to save session after login.')); 
        }
        console.log(`[authController] Session saved for userId: ${user.id}`);
        const userProfile = user.toObject();        
        res.status(isNewUser ? 201 : 200).json(userProfile); 
    });


  } catch (error) {
    console.error('[authController] Error during login/register:', error);
    next(error); 
  }
};

const processDailyLogin = async (req, res, next) => {
  try {
    const userId = req.user.id; // Đảm bảo middleware đã gắn `req.user`
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const now = new Date();
    const today = new Date(now.setHours(0, 0, 0, 0)); // Đặt thời gian về 00:00:00
    const lastLogin = user.lastDailyLogin ? new Date(user.lastDailyLogin) : null;

    // Kiểm tra xem đây có phải lần đăng nhập đầu tiên trong ngày không
    const isFirstLogin = !lastLogin || lastLogin.toDateString() !== today.toDateString();

    if (isFirstLogin) {
      // Tính streak
      let newStreak = 1;
      if (lastLogin) {
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        if (lastLogin.toDateString() === yesterday.toDateString()) {
          newStreak = (user.dailyLoginStreak || 0) + 1;
        }
      }

      // Tính toán phần thưởng token
      const tokensAwarded = 5; // Ví dụ: phần thưởng token cơ bản
      user.lastDailyLogin = today;
      user.dailyLoginStreak = newStreak;
      user.tokens += tokensAwarded;
      await user.save();

      return res.status(200).json({
        isFirstLogin: true,
        tokensAwarded,
        currentStreak: newStreak,
      });
    }

    // Nếu không phải lần đăng nhập đầu tiên trong ngày
    return res.status(200).json({
      isFirstLogin: false,
      tokensAwarded: 0,
      currentStreak: user.dailyLoginStreak || 0,
    });
  } catch (error) {
    console.error('Error processing daily login:', error);
    next(error);
  }
};

module.exports = {
  telegramLoginOrRegister,
  processDailyLogin
};