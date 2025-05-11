// Phương thức gửi thông báo về badge mới
const notifyNewBadge = (io, userId, badge) => {
  console.log(`[SocketService] Sending badge_unlocked event to user ${userId}:`, badge);
  io.to(`user-${userId}`).emit('badge_unlocked', { badge });
  console.log(`[SocketService] Sent badge_unlocked event to user ${userId}`);
};

// Phương thức gửi thông báo về task đã cập nhật
const notifyTaskUpdate = (io, userId, task) => {
  io.to(`user-${userId}`).emit('task_updated', { task });
  console.log(`[SocketService] Sent task_updated event to user ${userId}`);
};

// Phương thức gửi thông báo về level up
const notifyLevelUp = (io, userId, data) => {
  io.to(`user-${userId}`).emit('level_up', data);
  console.log(`[SocketService] Sent level_up event to user ${userId}`);
};

// Phương thức gửi thông báo khi tokens được cộng
const notifyTokensAdded = (io, userId, amount) => {
  io.to(`user-${userId}`).emit('tokens_added', { amount });
  console.log(`[SocketService] Sent tokens_added event to user ${userId}`);
};

module.exports = {
  notifyNewBadge,
  notifyTaskUpdate,
  notifyLevelUp,
  notifyTokensAdded
};