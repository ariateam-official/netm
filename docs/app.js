// app.js - نسخه بهینه برای GitHub Pages
// تنظیم خودکار آدرس پایه بر اساس محیط
(function() {
    'use strict';

    // تشخیص محیط و تنظیم BASE_URL
    const isGitHubPages = window.location.hostname.includes('github.io');
    const repoName = 'mesh-chat'; // اسم مخزن خودت رو اینجا بذار
    
    window.APP_CONFIG = {
        BASE_URL: isGitHubPages ? `/${repoName}` : '',
        IS_GITHUB: isGitHubPages,
        REPO_NAME: repoName
    };
    
    console.log('🌐 محیط:', isGitHubPages ? 'GitHub Pages' : 'محلی');
    console.log('📁 BASE_URL:', window.APP_CONFIG.BASE_URL);
})();

class MeshChat {
    constructor() {
        this.peer = null;
        this.userId = null;
        this.username = '';
        this.connections = new Map();
        this.publicConnections = new Set();
        this.isOffline = !navigator.onLine;
        this.deferredPrompt = null;
        this.BASE_URL = window.APP_CONFIG.BASE_URL;
        
        this.init();
        this.setupInstallPrompt();
        this.setupConnectivityListeners();
        this.registerServiceWorker();
    }

    // ثبت سرویس ورکر
    registerServiceWorker() {
        if ('serviceWorker' in navigator) {
            window.addEventListener('load', () => {
                navigator.serviceWorker.register(`${this.BASE_URL}/sw.js`)
                    .then(registration => {
                        console.log('✅ سرویس ورکر ثبت شد:', registration.scope);
                        
                        // بررسی به‌روزرسانی
                        registration.addEventListener('updatefound', () => {
                            const newWorker = registration.installing;
                            console.log('🔄 نسخه جدید سرویس ورکر در حال نصب...');
                        });
                    })
                    .catch(error => {
                        console.log('❌ خطا در ثبت سرویس ورکر:', error);
                    });
            });

            // شنونده برای پیام‌های سرویس ورکر
            navigator.serviceWorker.addEventListener('message', event => {
                console.log('📨 پیام از سرویس ورکر:', event.data);
            });
        }
    }

    init() {
        // المنت‌های DOM با در نظر گرفتن BASE_URL
        this.elements = {
            userId: document.getElementById('user-id'),
            refreshIdBtn: document.getElementById('refresh-id-btn'),
            usernameInput: document.getElementById('username-input'),
            joinNetworkBtn: document.getElementById('join-network-btn'),
            loginScreen: document.getElementById('login-screen'),
            mainScreen: document.getElementById('main-screen'),
            headerUsername: document.getElementById('header-username'),
            publicChatBtn: document.getElementById('public-chat-btn'),
            privateChatBtn: document.getElementById('private-chat-btn'),
            publicChatSection: document.getElementById('public-chat-section'),
            privateChatSection: document.getElementById('private-chat-section'),
            closePublicChat: document.getElementById('close-public-chat'),
            closePrivateChat: document.getElementById('close-private-chat'),
            publicMessages: document.getElementById('public-messages'),
            privateMessages: document.getElementById('private-messages'),
            publicMessageInput: document.getElementById('public-message-input'),
            privateMessageInput: document.getElementById('private-message-input'),
            sendPublicBtn: document.getElementById('send-public-btn'),
            sendPrivateBtn: document.getElementById('send-private-btn'),
            peerIdInput: document.getElementById('peer-id-input'),
            connectPeerBtn: document.getElementById('connect-peer-btn'),
            peersList: document.getElementById('peers-list'),
            connectionStatus: document.getElementById('connection-status'),
            installBanner: document.getElementById('install-banner'),
            installBtn: document.getElementById('install-btn'),
            closeBanner: document.getElementById('close-banner')
        };

        // بررسی وجود المنت‌ها
        if (!this.elements.userId) {
            console.error('❌ المنت‌های DOM پیدا نشد!');
            return;
        }

        // ایجاد شناسه تصادفی ۵ رقمی
        this.generateUserId();
        
        // Event Listeners
        this.elements.refreshIdBtn.addEventListener('click', () => this.generateUserId());
        this.elements.joinNetworkBtn.addEventListener('click', () => this.joinNetwork());
        this.elements.publicChatBtn.addEventListener('click', () => this.openPublicChat());
        this.elements.privateChatBtn.addEventListener('click', () => this.openPrivateChat());
        this.elements.closePublicChat.addEventListener('click', () => this.closePublicChat());
        this.elements.closePrivateChat.addEventListener('click', () => this.closePrivateChat());
        this.elements.sendPublicBtn.addEventListener('click', () => this.sendPublicMessage());
        this.elements.sendPrivateBtn.addEventListener('click', () => this.sendPrivateMessage());
        this.elements.connectPeerBtn.addEventListener('click', () => this.connectToPeer());
        
        if (this.elements.closeBanner) {
            this.elements.closeBanner.addEventListener('click', () => this.hideInstallBanner());
        }
        
        if (this.elements.installBtn) {
            this.elements.installBtn.addEventListener('click', () => this.installApp());
        }
        
        // Enter key برای ارسال پیام
        this.elements.publicMessageInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.sendPublicMessage();
        });
        
        this.elements.privateMessageInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.sendPrivateMessage();
        });
        
        this.elements.peerIdInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.connectToPeer();
        });

        // بررسی وضعیت اینترنت
        this.updateOnlineStatus();
        
        // چک کردن نصب بودن برنامه
        setTimeout(() => {
            if (!this.isAppInstalled() && this.elements.installBanner) {
                this.elements.installBanner.classList.remove('hidden');
            }
        }, 3000);
    }

    // راه‌اندازی دکمه نصب PWA
    setupInstallPrompt() {
        window.addEventListener('beforeinstallprompt', (e) => {
            e.preventDefault();
            this.deferredPrompt = e;
            
            // نمایش بنر نصب (به جز زمانی که برنامه نصب شده)
            if (!this.isAppInstalled() && this.elements.installBanner) {
                this.elements.installBanner.classList.remove('hidden');
            }
        });

        window.addEventListener('appinstalled', () => {
            this.deferredPrompt = null;
            this.hideInstallBanner();
            console.log('✅ برنامه با موفقیت نصب شد');
            
            // ارسال پیام به سرویس ورکر
            if (navigator.serviceWorker.controller) {
                navigator.serviceWorker.controller.postMessage({
                    type: 'APP_INSTALLED'
                });
            }
        });
    }

    hideInstallBanner() {
        if (this.elements.installBanner) {
            this.elements.installBanner.classList.add('hidden');
            
            // ذخیره در localStorage که دیگه نشون نده
            localStorage.setItem('install-banner-closed', 'true');
        }
    }

    isAppInstalled() {
        return window.matchMedia('(display-mode: standalone)').matches ||
               window.navigator.standalone === true ||
               localStorage.getItem('install-banner-closed') === 'true';
    }

    async installApp() {
        if (!this.deferredPrompt) {
            alert('برای نصب:\n' +
                  '📱 در موبایل: از منوی مرورگر گزینه "Add to Home Screen" را انتخاب کنید\n' +
                  '💻 در دسکتاپ: روی آدرس بار، آیکون نصب را بزنید');
            return;
        }

        this.deferredPrompt.prompt();
        const { outcome } = await this.deferredPrompt.userChoice;
        console.log('📲 نتیجه نصب:', outcome);
        this.deferredPrompt = null;
        this.hideInstallBanner();
    }

    setupConnectivityListeners() {
        window.addEventListener('online', () => this.updateOnlineStatus());
        window.addEventListener('offline', () => this.updateOnlineStatus());
    }

    updateOnlineStatus() {
        this.isOffline = !navigator.onLine;
        
        if (this.isOffline) {
            document.body.classList.add('offline-mode');
            this.updateConnectionStatus('🔴 حالت آفلاین - اتصال مستقیم', 'offline');
        } else {
            document.body.classList.remove('offline-mode');
            this.updateConnectionStatus('🟢 آنلاین - آماده اتصال', 'online');
        }
    }

    generateUserId() {
        // تولید شناسه ۵ رقمی تصادفی
        this.userId = Math.floor(10000 + Math.random() * 90000).toString();
        if (this.elements.userId) {
            this.elements.userId.textContent = this.userId;
        }
        
        // ذخیره در localStorage
        localStorage.setItem('meshChat_userId', this.userId);
    }

    async joinNetwork() {
        this.username = this.elements.usernameInput.value.trim();
        
        if (!this.username) {
            alert('لطفاً نام خود را وارد کنید');
            return;
        }

        try {
            // تنظیمات سرورهای STUN برای پشتیبانی بهتر
            const iceServers = {
                iceServers: [
                    { urls: 'stun:stun.l.google.com:19302' },
                    { urls: 'stun:stun1.l.google.com:19302' },
                    { urls: 'stun:stun2.l.google.com:19302' },
                    { urls: 'stun:stun3.l.google.com:19302' },
                    { urls: 'stun:stun4.l.google.com:19302' },
                    { urls: 'stun:stun.ekiga.net' },
                    { urls: 'stun:stun.ideasip.com' },
                    { urls: 'stun:stun.schlund.de' },
                    { urls: 'stun:stun.stunprotocol.org:3478' },
                    { urls: 'stun:stun.voiparound.com' },
                    { urls: 'stun:stun.voipbuster.com' }
                ],
                sdpSemantics: 'unified-plan' // برای سازگاری بهتر
            };

            // تنظیمات PeerJS برای GitHub Pages
            const peerOptions = {
                config: iceServers,
                debug: 2, // لاگ برای رفع اشکال
                reliable: true // اتصال مطمئن
            };

            // در حالت آفلاین یا مشکلات CORS، از تنظیمات ساده استفاده کن
            if (this.isOffline || window.APP_CONFIG.IS_GITHUB) {
                console.log('📡 استفاده از حالت آفلاین/مستقیم');
                // بدون سرور سیگنالینگ، اتصال مستقیم
            }

            this.peer = new Peer(this.userId, peerOptions);

            this.setupPeerEvents();
            
            // تغییر به صفحه اصلی
            this.elements.loginScreen.classList.remove('active');
            this.elements.mainScreen.classList.add('active');
            this.elements.headerUsername.textContent = this.username;
            
            // ذخیره در localStorage
            localStorage.setItem('meshChat_username', this.username);
            
            // شروع جستجوی خودکار همسایه‌ها
            this.startPeerDiscovery();
            
            // نمایش پیام خوش‌آمدگویی
            setTimeout(() => {
                this.updateConnectionStatus('✅ آماده اتصال - شناسه شما: ' + this.userId, 'success');
            }, 1000);
            
        } catch (error) {
            console.error('❌ خطا در راه‌اندازی:', error);
            alert('خطا در اتصال به شبکه. اما می‌توانید در حالت آفلاین از برنامه استفاده کنید.');
            
            // حتی با خطا هم صفحه اصلی رو نشون بده
            this.elements.loginScreen.classList.remove('active');
            this.elements.mainScreen.classList.add('active');
            this.elements.headerUsername.textContent = this.username;
        }
    }

    setupPeerEvents() {
        this.peer.on('open', (id) => {
            console.log('✅ PeerJS آماده با شناسه:', id);
            this.updateConnectionStatus(
                this.isOffline ? '🟠 آماده در حالت آفلاین' : '🟢 متصل به شبکه',
                this.isOffline ? 'offline' : 'success'
            );
        });

        this.peer.on('connection', (conn) => {
            console.log('📞 اتصال دریافتی از:', conn.peer);
            this.handleIncomingConnection(conn);
        });

        this.peer.on('error', (err) => {
            console.error('❌ خطای PeerJS:', err);
            
            if (err.type === 'unavailable-id') {
                this.generateUserId();
                alert('این شناسه قبلاً استفاده شده. شناسه جدیدی برای شما ساخته شد.');
            } else if (err.type === 'network' || err.type === 'disconnected') {
                this.updateConnectionStatus('⚠️ مشکل در اتصال', 'error');
            }
        });

        this.peer.on('disconnected', () => {
            console.log('📴 قطع اتصال از شبکه');
            this.updateConnectionStatus('⚠️ قطع اتصال - تلاش برای اتصال مجدد...', 'error');
            
            setTimeout(() => {
                if (this.peer && !this.peer.destroyed) {
                    this.peer.reconnect();
                }
            }, 3000);
        });
    }

    startPeerDiscovery() {
        // استفاده از BroadcastChannel برای کشف همسایه
        if (typeof BroadcastChannel !== 'undefined') {
            try {
                const channel = new BroadcastChannel('mesh-chat-discovery');
                
                channel.onmessage = (event) => {
                    if (event.data && 
                        event.data.type === 'discovery' && 
                        event.data.userId !== this.userId) {
                        
                        console.log('🔍 همسایه پیدا شد:', event.data);
                        this.addToPeersList(event.data);
                        
                        if (!this.connections.has(event.data.userId)) {
                            setTimeout(() => {
                                this.connectToPeer(event.data.userId, true);
                            }, 1000);
                        }
                    }
                };
                
                // ارسال پیام کشف هر ۵ ثانیه
                setInterval(() => {
                    if (this.username) {
                        channel.postMessage({
                            type: 'discovery',
                            userId: this.userId,
                            username: this.username,
                            timestamp: Date.now()
                        });
                    }
                }, 5000);
                
                console.log('📡 BroadcastChannel راه‌اندازی شد');
                
            } catch (e) {
                console.log('⚠️ BroadcastChannel پشتیبانی نمی‌شود:', e);
                this.fallbackDiscovery();
            }
        } else {
            this.fallbackDiscovery();
        }
    }

    fallbackDiscovery() {
        console.log('🔄 استفاده از روش localStorage برای کشف همسایه');
        
        // استفاده از localStorage events
        window.addEventListener('storage', (e) => {
            if (e.key === 'mesh-chat-peer' && e.newValue) {
                try {
                    const data = JSON.parse(e.newValue);
                    if (data.userId !== this.userId) {
                        this.addToPeersList(data);
                    }
                } catch (error) {}
            }
        });
        
        // ارسال سیگنال
        setInterval(() => {
            if (this.username) {
                localStorage.setItem('mesh-chat-peer', JSON.stringify({
                    userId: this.userId,
                    username: this.username,
                    time: Date.now()
                }));
            }
        }, 5000);
    }

    addToPeersList(peerInfo) {
        if (!this.elements.peersList) return;
        
        const existing = Array.from(this.elements.peersList.children).find(
            el => el.dataset.userId === peerInfo.userId
        );
        
        if (!existing) {
            const peerElement = document.createElement('span');
            peerElement.className = 'peer-badge';
            peerElement.dataset.userId = peerInfo.userId;
            peerElement.textContent = peerInfo.username || peerInfo.userId;
            peerElement.title = `شناسه: ${peerInfo.userId}`;
            this.elements.peersList.appendChild(peerElement);
        }
    }

    handleIncomingConnection(conn) {
        this.connections.set(conn.peer, conn);
        
        conn.on('open', () => {
            console.log('✅ اتصال با', conn.peer, 'برقرار شد');
            
            conn.send({
                type: 'user-info',
                username: this.username,
                userId: this.userId,
                time: Date.now()
            });
        });

        conn.on('data', (data) => {
            this.handleIncomingData(conn, data);
        });

        conn.on('close', () => {
            console.log('📴 اتصال با', conn.peer, 'بسته شد');
            this.connections.delete(conn.peer);
            this.removeFromPeersList(conn.peer);
        });

        conn.on('error', (err) => {
            console.error('❌ خطای اتصال:', err);
            this.connections.delete(conn.peer);
        });
    }

    removeFromPeersList(peerId) {
        if (!this.elements.peersList) return;
        
        const elements = this.elements.peersList.children;
        for (let i = 0; i < elements.length; i++) {
            if (elements[i].dataset.userId === peerId) {
                elements[i].remove();
                break;
            }
        }
    }

    handleIncomingData(conn, data) {
        if (!data || typeof data !== 'object') return;
        
        const time = new Date().toLocaleTimeString('fa-IR');
        
        switch (data.type) {
            case 'user-info':
                conn.remoteUsername = data.username;
                this.addToPeersList(data);
                break;
                
            case 'public-message':
                this.displayMessage(this.elements.publicMessages, {
                    text: data.text,
                    sender: conn.remoteUsername || 'کاربر ناشناس',
                    isSent: false,
                    time: data.time || time
                });
                break;
                
            case 'private-message':
                this.displayMessage(this.elements.privateMessages, {
                    text: data.text,
                    sender: conn.remoteUsername || 'کاربر ناشناس',
                    isSent: false,
                    time: data.time || time
                });
                
                this.elements.privateMessageInput.disabled = false;
                this.elements.sendPrivateBtn.disabled = false;
                break;
        }
    }

    openPublicChat() {
        this.elements.publicChatSection.classList.remove('hidden');
        this.elements.privateChatSection.classList.add('hidden');
        this.elements.publicMessages.innerHTML = '';
        
        this.displayMessage(this.elements.publicMessages, {
            text: 'به چت کلی خوش آمدید! می‌توانید با همه همسایه‌ها صحبت کنید.',
            sender: 'سیستم',
            isSent: false,
            time: new Date().toLocaleTimeString('fa-IR')
        });
    }

    openPrivateChat() {
        this.elements.privateChatSection.classList.remove('hidden');
        this.elements.publicChatSection.classList.add('hidden');
        this.elements.privateMessages.innerHTML = '';
        
        this.displayMessage(this.elements.privateMessages, {
            text: 'شناسه ۵ رقمی فرد مورد نظر را وارد کنید.',
            sender: 'سیستم',
            isSent: false,
            time: new Date().toLocaleTimeString('fa-IR')
        });
    }

    closePublicChat() {
        this.elements.publicChatSection.classList.add('hidden');
    }

    closePrivateChat() {
        this.elements.privateChatSection.classList.add('hidden');
        this.elements.privateMessageInput.disabled = true;
        this.elements.sendPrivateBtn.disabled = true;
        this.elements.peerIdInput.value = '';
    }

    connectToPeer(peerId = null, isAutoConnect = false) {
        const targetId = peerId || this.elements.peerIdInput.value.trim();
        
        if (!targetId) {
            if (!isAutoConnect) alert('لطفاً شناسه مخاطب را وارد کنید');
            return;
        }
        
        if (targetId === this.userId) {
            if (!isAutoConnect) alert('نمی‌توانید به خودتان متصل شوید');
            return;
        }

        if (this.connections.has(targetId)) {
            if (!isAutoConnect) {
                alert('از قبل به این کاربر متصل هستید');
                this.activatePrivateChat();
            }
            return;
        }

        try {
            const conn = this.peer.connect(targetId, {
                reliable: true,
                serialization: 'json',
                metadata: {
                    username: this.username
                }
            });
            
            this.handleIncomingConnection(conn);
            
            if (!isAutoConnect) {
                this.activatePrivateChat();
                
                this.displayMessage(this.elements.privateMessages, {
                    text: 'در حال برقراری اتصال...',
                    sender: 'سیستم',
                    isSent: false,
                    time: new Date().toLocaleTimeString('fa-IR')
                });
            }
            
        } catch (error) {
            console.error('❌ خطا در اتصال:', error);
            if (!isAutoConnect) {
                alert('خطا در اتصال. لطفاً دوباره تلاش کنید.');
            }
        }
    }

    activatePrivateChat() {
        this.elements.privateMessageInput.disabled = false;
        this.elements.sendPrivateBtn.disabled = false;
        this.elements.peerIdInput.value = '';
    }

    sendPublicMessage() {
        const message = this.elements.publicMessageInput.value.trim();
        
        if (!message) return;
        
        const time = new Date().toLocaleTimeString('fa-IR');
        
        this.displayMessage(this.elements.publicMessages, {
            text: message,
            sender: 'شما',
            isSent: true,
            time: time
        });
        
        const messageData = {
            type: 'public-message',
            text: message,
            time: time
        };
        
        let sentCount = 0;
        this.connections.forEach((conn) => {
            if (conn.open) {
                try {
                    conn.send(messageData);
                    sentCount++;
                } catch (e) {
                    console.error('❌ خطا در ارسال پیام:', e);
                }
            }
        });
        
        if (sentCount === 0) {
            this.displayMessage(this.elements.publicMessages, {
                text: '⚠️ هیچ کاربری آنلاین نیست',
                sender: 'سیستم',
                isSent: false,
                time: time
            });
        }
        
        this.elements.publicMessageInput.value = '';
    }

    sendPrivateMessage() {
        const message = this.elements.privateMessageInput.value.trim();
        
        if (!message) return;
        
        let targetConn = null;
        for (let [_, conn] of this.connections) {
            if (conn.open) {
                targetConn = conn;
                break;
            }
        }
        
        if (!targetConn) {
            alert('⚠️ اتصال برقرار نیست. ابتدا به یک کاربر متصل شوید.');
            return;
        }
        
        const time = new Date().toLocaleTimeString('fa-IR');
        
        this.displayMessage(this.elements.privateMessages, {
            text: message,
            sender: 'شما',
            isSent: true,
            time: time
        });
        
        targetConn.send({
            type: 'private-message',
            text: message,
            time: time
        });
        
        this.elements.privateMessageInput.value = '';
    }

    displayMessage(container, message) {
        if (!container) return;
        
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${message.isSent ? 'sent' : 'received'}`;
        
        const escapedText = this.escapeHtml(message.text);
        const escapedSender = this.escapeHtml(message.sender);
        
        messageDiv.innerHTML = `
            <div class="message-content">${escapedText}</div>
            <div class="message-info">${escapedSender} • ${message.time}</div>
        `;
        
        container.appendChild(messageDiv);
        container.scrollTop = container.scrollHeight;
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    updateConnectionStatus(text, type) {
        if (!this.elements.connectionStatus) return;
        
        let dotColor = '#10b981';
        
        switch(type) {
            case 'success':
                dotColor = '#10b981';
                break;
            case 'error':
                dotColor = '#ef4444';
                break;
            case 'offline':
                dotColor = '#f59e0b';
                break;
            case 'online':
                dotColor = '#3b82f6';
                break;
        }
        
        this.elements.connectionStatus.innerHTML = `
            <span class="status-dot" style="background: ${dotColor};"></span>
            <span>${text}</span>
        `;
    }
}

// راه‌اندازی برنامه
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 راه‌اندازی مش چت آفلاین...');
    window.meshChat = new MeshChat();
    
    const savedUserId = localStorage.getItem('meshChat_userId');
    const savedUsername = localStorage.getItem('meshChat_username');
    
    if (savedUserId && document.getElementById('user-id')) {
        document.getElementById('user-id').textContent = savedUserId;
    }
    
    if (savedUsername && document.getElementById('username-input')) {
        document.getElementById('username-input').value = savedUsername;
    }
    
    console.log('✅ برنامه آماده است');
});