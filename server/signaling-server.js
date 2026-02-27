// signaling-server.js - سرور سیگنالینگ برای اتصالات WebRTC
// نصب: npm install express socket.io cors

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');

const app = express();
const server = http.createServer(app);

// تنظیم CORS برای پشتیبانی از همه کلاینت‌ها
const io = new Server(server, {
    cors: {
        origin: "*", // در محیط تولید، بهتر است محدود شود
        methods: ["GET", "POST"],
        credentials: true,
        allowedHeaders: ["my-custom-header"]
    },
    transports: ['websocket', 'polling'], // پشتیبانی از هر دو روش
    pingTimeout: 60000,
    pingInterval: 25000
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../'))); // سرو فایل‌های استاتیک

// ذخیره اطلاعات کاربران آنلاین
const onlineUsers = new Map(); // socket.id -> user info
const userSockets = new Map(); // userId -> socket.id

// صفحه اصلی سرور
app.get('/', (req, res) => {
    res.send(`
        <html dir="rtl">
            <head><title>سرور سیگنالینگ مش چت</title></head>
            <body style="font-family: Tahoma; text-align: center; padding: 50px;">
                <h1>🚀 سرور سیگنالینگ مش چت آفلاین</h1>
                <p>وضعیت: <span style="color: green; font-weight: bold;">فعال ✅</span></p>
                <p>تعداد کاربران آنلاین: <span id="online-count">0</span></p>
                <p>ساخته شده توسط طاها قاسمی - زمستان 1404</p>
                <script src="/socket.io/socket.io.js"></script>
                <script>
                    const socket = io();
                    setInterval(() => {
                        fetch('/stats').then(r => r.json()).then(data => {
                            document.getElementById('online-count').textContent = data.online;
                        });
                    }, 2000);
                </script>
            </body>
        </html>
    `);
});

// آمار
app.get('/stats', (req, res) => {
    res.json({
        online: onlineUsers.size,
        users: Array.from(onlineUsers.values())
    });
});

// مدیریت اتصالات Socket.IO
io.on('connection', (socket) => {
    console.log('📱 کاربر جدید متصل شد:', socket.id, 'آیپی:', socket.handshake.address);

    // ثبت نام کاربر در شبکه
    socket.on('register', (data) => {
        try {
            const userInfo = {
                socketId: socket.id,
                userId: data.userId,
                username: data.username,
                connectedAt: new Date().toISOString(),
                userAgent: socket.handshake.headers['user-agent']
            };
            
            onlineUsers.set(socket.id, userInfo);
            userSockets.set(data.userId, socket.id);
            
            console.log(`✅ کاربر ثبت نام کرد: ${data.username} (${data.userId})`);
            
            // ارسال لیست کاربران آنلاین به کاربر جدید
            const usersList = Array.from(onlineUsers.values()).map(u => ({
                userId: u.userId,
                username: u.username
            }));
            
            socket.emit('registered', {
                success: true,
                users: usersList
            });
            
            // اطلاع به سایر کاربران (به جز خودش)
            socket.broadcast.emit('user-connected', {
                userId: data.userId,
                username: data.username
            });
            
        } catch (error) {
            console.error('خطا در ثبت نام:', error);
            socket.emit('error', { message: 'خطا در ثبت نام' });
        }
    });

    // درخواست اتصال به یک کاربر خاص
    socket.on('connect-to-peer', (data) => {
        try {
            const { targetId, fromId, fromUsername, offer } = data;
            console.log(`🔄 درخواست اتصال از ${fromId} به ${targetId}`);
            
            const targetSocketId = userSockets.get(targetId);
            
            if (targetSocketId && onlineUsers.has(targetSocketId)) {
                // ارسال درخواست به مقصد
                io.to(targetSocketId).emit('connection-request', {
                    fromId,
                    fromUsername,
                    offer,
                    fromSocketId: socket.id
                });
                console.log(`📨 درخواست اتصال به ${targetId} ارسال شد`);
            } else {
                // کاربر مقصد آفلاین است
                socket.emit('error', { 
                    message: 'کاربر مورد نظر آنلاین نیست',
                    targetId 
                });
                console.log(`❌ کاربر ${targetId} آنلاین نیست`);
            }
        } catch (error) {
            console.error('خطا در درخواست اتصال:', error);
        }
    });

    // پاسخ به درخواست اتصال
    socket.on('connection-response', (data) => {
        try {
            const { targetSocketId, answer } = data;
            io.to(targetSocketId).emit('connection-answer', {
                answer,
                fromSocketId: socket.id
            });
            console.log(`📨 پاسخ اتصال به ${targetSocketId} ارسال شد`);
        } catch (error) {
            console.error('خطا در پاسخ اتصال:', error);
        }
    });

    // تبادل ICE candidates
    socket.on('ice-candidate', (data) => {
        try {
            const { targetSocketId, candidate } = data;
            io.to(targetSocketId).emit('ice-candidate', {
                candidate,
                fromSocketId: socket.id
            });
        } catch (error) {
            console.error('خطا در ارسال ICE candidate:', error);
        }
    });

    // ارسال پیام ساده (برای چت در حالت آنلاین)
    socket.on('send-message', (data) => {
        try {
            const { targetId, message } = data;
            const targetSocketId = userSockets.get(targetId);
            
            if (targetSocketId) {
                io.to(targetSocketId).emit('receive-message', {
                    fromId: onlineUsers.get(socket.id)?.userId,
                    fromUsername: onlineUsers.get(socket.id)?.username,
                    message,
                    time: new Date().toLocaleTimeString('fa-IR')
                });
            }
        } catch (error) {
            console.error('خطا در ارسال پیام:', error);
        }
    });

    // جستجوی کاربران نزدیک (بر اساس شبکه)
    socket.on('discover-peers', () => {
        try {
            const userInfo = onlineUsers.get(socket.id);
            if (!userInfo) return;
            
            const nearbyUsers = Array.from(onlineUsers.values())
                .filter(u => u.socketId !== socket.id)
                .map(u => ({
                    userId: u.userId,
                    username: u.username
                }));
            
            socket.emit('peers-list', nearbyUsers);
            console.log(`🔍 کاربر ${userInfo.userId} لیست همسایه‌ها را درخواست کرد: ${nearbyUsers.length} نفر`);
        } catch (error) {
            console.error('خطا در کشف همسایه:', error);
        }
    });

    // قطع اتصال کاربر
    socket.on('disconnect', () => {
        try {
            const userInfo = onlineUsers.get(socket.id);
            if (userInfo) {
                console.log(`📴 کاربر قطع اتصال کرد: ${userInfo.username} (${userInfo.userId})`);
                
                // پاک کردن از لیست
                onlineUsers.delete(socket.id);
                userSockets.delete(userInfo.userId);
                
                // اطلاع به سایر کاربران
                socket.broadcast.emit('user-disconnected', {
                    userId: userInfo.userId
                });
            }
        } catch (error) {
            console.error('خطا در قطع اتصال:', error);
        }
    });

    // خطاهای Socket
    socket.on('error', (error) => {
        console.error('خطای Socket:', error);
    });
});

// مدیریت خطاهای سرور
server.on('error', (error) => {
    console.error('خطای سرور:', error);
});

// راه‌اندازی سرور
const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
    console.log(`
    ╔══════════════════════════════════════╗
    ║   سرور سیگنالینگ مش چت آفلاین        ║
    ║   پورت: ${PORT}                         ║
    ║   وضعیت: فعال ✅                      ║
    ║   ساخته شده توسط طاها قاسمی          ║
    ║   زمستان 1404                        ║
    ╚══════════════════════════════════════╝
    `);
    console.log(`🌐 آدرس محلی: http://localhost:${PORT}`);
    console.log(`📱 برای استفاده در شبکه: آدرس IP سرور را وارد کنید`);
});

// نمایش آمار هر 30 ثانیه
setInterval(() => {
    console.log(`📊 آمار: ${onlineUsers.size} کاربر آنلاین`);
}, 30000);