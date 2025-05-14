require('dotenv').config();
const express = require('express');
const cors = require('cors');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const connectDB = require('./config/database');
const http = require('http'); // Thêm module http
const { Server } = require('socket.io'); // Thêm Socket.IO

const { bootstrap } = require('./config/bootstrap');
 
connectDB();  

const app = express();
const server = http.createServer(app); // Tạo HTTP server
const io = require("socket.io")(server, {
  cors: {
    origin: ["https://epic-task-frontend.vercel.app"],
    methods: ["GET", "POST"],
    credentials: true,
  },
});
io.origins(["https://epic-task-frontend.vercel.app"]); // Cho phép WebSocket từ frontend
app.use(
  cors({
    origin: ["https://epic-task-frontend.vercel.app"], // Cho phép frontend của bạn
    methods: ["GET", "POST", "PUT", "DELETE"], // Các phương thức HTTP được phép
    credentials: true, // Cho phép cookies và credentials
    allowedHeaders: ["Content-Type", "Authorization", "user-id", "telegram-data"], // Thêm 'telegram-data' ở đây
  })
);
app.use(express.json());

app.use((err, req, res, next) => {
  console.error("💥 Lỗi Server (middleware sớm):", err.stack || err);
  res.status(err.status || 500).json({
    message: err.message || 'Internal Server Error - Lỗi máy chủ nội bộ',
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
});

const sessionStore = MongoStore.create({
  mongoUrl: process.env.MONGO_URI,
  collectionName: 'sessions'
});
app.use(
  session({
    secret: process.env.SESSION_SECRET || 'khóa-bí-mật-rất-mạnh',
    resave: false,
    saveUninitialized: false,
    store: sessionStore,
    cookie: {
      maxAge: 24 * 60 * 60 * 1000,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production', // Sử dụng secure trong môi trường production
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax', // Quan trọng cho cookie giữa các site
    }
  })
);


const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const taskRoutes = require('./routes/taskRoutes');
const leaderboardRoutes = require('./routes/leaderboardRoutes');
const badgeRoutes = require('./routes/badgeRoutes');


app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/tasks', taskRoutes);
app.use('/api/v1/leaderboard', leaderboardRoutes);
app.use('/api/v1/badges', badgeRoutes);


const PORT = process.env.PORT || 3000;

// Socket.IO connections
io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id}`);
  
  // Lưu trữ userId khi client xác thực
  socket.on('authenticate', (userId) => {
    console.log(`User authenticated: ${userId}`);
    socket.join(`user-${userId}`); // Thêm socket vào room riêng của user
  });
  
  socket.on('disconnect', () => {
    console.log(`User disconnected: ${socket.id}`);
  });
});

// Xuất đối tượng io để các module khác có thể sử dụng
app.set('io', io);

const cleanupSessions = async () => {
  const now = new Date();
  await Session.deleteMany({ expiresAt: { $lt: now } }); // Xóa session hết hạn
};
setInterval(cleanupSessions, 24 * 60 * 60 * 1000); // Chạy mỗi ngày

const startApp = async () => {
  try {
    console.log('--- [server.js] Chuẩn bị gọi hàm bootstrap ---');
    await new Promise((resolve, reject) => {
      bootstrap((err) => {  
        if (err) {
          console.error("❌ Lỗi nghiêm trọng từ bootstrap, không thể khởi động server:", err);
          return reject(err); 
        }
        console.log('--- [server.js] Hàm bootstrap đã thực thi xong ---');
        resolve();  
      });
    });
    console.log('--- [server.js] Bootstrap hoàn thành, chuẩn bị chạy server Express ---');

    server.listen(PORT, () => {
      console.log(`-------------------------------------------------------`);
      console.log(`🚀 Server đang chạy tại http://localhost:${PORT}`);
      console.log(` WebSockets đã được kích hoạt!`);
      console.log(` Môi trường: ${process.env.NODE_ENV || 'development'}`);
      console.log(` (Nhấn CTRL+C để dừng server)`);
      console.log(`-------------------------------------------------------`);
    });

  } catch (error) {
    console.error("❌ Không thể khởi động ứng dụng do lỗi trong quá trình bootstrap hoặc server:", error);
    process.exit(1); 
  }
};
startApp();
