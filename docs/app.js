// app.js - نسخه نهایی با رفع باگ‌ها
(function() {
    'use strict';

    // تنظیمات پایه
    const isGitHubPages = window.location.hostname.includes('github.io');
    const pathSegments = window.location.pathname.split('/');
    const repoName = pathSegments[1] || 'mesh-chat';
    
    window.APP_CONFIG = {
        BASE_URL: isGitHubPages ? `/${repoName}` : '',
        IS_GITHUB: isGitHubPages,
        REPO_NAME: repoName,
        VERSION: '3.0.0'
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
        self = this;
        
        // صبر کن تا DOM کامل لود بشه
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.init());
        } else {
            this.init();
        }
    }

    init() {
        console.log('🚀 شروع راه‌اندازی MeshChat...');
        
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

        // بررسی وجود المنت‌های ضروری
        if (!this.elements.userId) {
            console.error('❌ المنت‌های DOM پیدا نشد!');
            return;
        }

        // راه‌اندازی
        this.generateUserId();
        this.setupEventListeners();
        this.setupInstallPrompt();
        this.setupConnectivityListeners();
        this.registerServiceWorker();
        
        // چک کردن وضعیت سرویس ورکر
        this.checkServiceWorker();
        
        console.log('✅ راه‌اندازی کامل شد');
    }

    checkServiceWorker() {
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.ready.then(registration => {
                console.log('✅ سرویس ورکر آماده است:', registration.active);
                
                // ارسال پیام به سرویس ورکر
                if (registration.active) {
                    registration.active.postMessage({
                        type: 'GET_STATUS'
                    });
                }
            });
            
            // شنونده برای پیام‌های سرویس ورکر
            navigator.serviceWorker.addEventListener('message', event => {
                console.log('📨 پیام از سرویس ورکر:', event.data);
            });
        }
    }

    registerServiceWorker() {
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register(`${this.BASE_URL}/sw.js`)
                .then(registration => {
                    console.log('✅ سرویس ورکر ثبت شد:', registration.scope);
                    
                    // بررسی به‌روزرسانی
                    registration.addEventListener('updatefound', () => {
                        const newWorker = registration.installing;
                        console.log('🔄 نسخه جدید سرویس ورکر در حال نصب...');
                        
                        newWorker.addEventListener('statechange', () => {
                            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                                console.log('🔄 نسخه جدید آماده است. صفحه رو رفرش کن.');
                            }
                        });
                    });
                })
                .catch(error => {
                    console.log('⚠️ خطا در ثبت سرویس ورکر:', error);
                });
        }
    }

    setupEventListeners() {
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
        
        // Enter key
        this.elements.publicMessageInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.sendPublicMessage();
        });
        
        this.elements.privateMessageInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.sendPrivateMessage();
        });
        
        this.elements.peerIdInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.connectToPeer();
        });
    }

    generateUserId() {
        this.userId = Math.floor(10000 + Math.random() * 90000).toString();
        if (this.elements.userId) {
            this.elements.userId.textContent = this.userId;
        }
        localStorage.setItem('meshChat_userId', this.userId);
    }

    setupInstallPrompt() {
        window.addEventListener('beforeinstallprompt', (e) => {
            e.preventDefault();
            this.deferredPrompt = e;
            
            if (!this.isAppInstalled() && this.elements.installBanner) {
                setTimeout(() => {
                    this.elements.installBanner.classList.remove('hidden');
                }, 2000);
            }
        });

        window.addEventListener('appinstalled', () => {
            this.deferredPrompt = null;
            this.hideInstallBanner();
            console.log('✅ برنامه نصب شد');
        });
    }

    isAppInstalled() {
        return window.matchMedia('(display-mode: standalone)').matches ||
               window.navigator.standalone === true ||
               localStorage.getItem('install-banner-closed') === 'true';
    }

    hideInstallBanner() {
        if (this.elements.installBanner) {
            this.elements.installBanner.classList.add('hidden');
            localStorage.setItem('install-banner-closed', 'true');
        }
    }

    async installApp() {
        if (!this.deferredPrompt) {
            alert('برای نصب:\n' +
                  '📱 در موبایل: از منوی مرورگر "Add to Home Screen" را انتخاب کنید\n' +
                  '💻 در دسکتاپ: روی آیکون نصب در آدرس بار کلیک کنید');
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
        this.updateOnlineStatus();
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

    async joinNetwork() {
        this.username = this.elements.usernameInput.value.trim();
        
        if (!this.username) {
            alert('لطفاً نام خود را وارد کنید');
            return;
        }

        try {
            // تنظیمات STUN سرورها
            const iceServers = {
                iceServers: [
                    { urls: 'stun:stun.l.google.com:19302' },
                    { urls: 'stun:stun1.l.google.com:19302' },
                    { urls: 'stun:stun2.l.google.com:19302' },
                    { urls: 'stun:stun3.l.google.com:19302' },
                    { urls: 'stun:stun4.l.google.com:19302' }
                ]
            };

            this.peer = new Peer(this.userId, {
                config: iceServers,
                debug: 2
            });

            this.setupPeerEvents();
            
            // تغییر به صفحه اصلی
            this.elements.loginScreen.classList.remove('active');
            this.elements.mainScreen.classList.add('active');
            this.elements.headerUsername.textContent = this.username;
            
            localStorage.setItem('meshChat_username', this.username);
            
            // شروع کشف همسایه
            this.startPeerDiscovery();
            
            // نمایش پیام خوش‌آمد
            setTimeout(() => {
                this.updateConnectionStatus('✅ آماده اتصال', 'success');
                
                // اضافه کردن پیام راهنما به چت کلی
                if (this.elements.publicMessages) {
                    this.displayMessage(this.elements.publicMessages, {
                        text: 'به چت کلی خوش آمدید! برای شروع گفتگو، چند نفر دیگر هم باید این برنامه را باز کنند.',
                        sender: 'سیستم',
                        isSent: false,
                        time: new Date().toLocaleTimeString('fa-IR')
                    });
                }
            }, 1000);
            
        } catch (error) {
            console.error('❌ خطا:', error);
            alert('خطا در اتصال. اما می‌توانید در حالت آفلاین کار کنید.');
            
            this.elements.loginScreen.classList.remove('active');
            this.elements.mainScreen.classList.add('active');
            this.elements.headerUsername.textContent = this.username;
        }
    }

    setupPeerEvents() {
        this.peer.on('open', (id) => {
            console.log('✅ PeerJS آماده:', id);
        });

        this.peer.on('connection', (conn) => {
            console.log('📞 اتصال جدید از:', conn.peer);
            this.handleIncomingConnection(conn);
        });

        this.peer.on('error', (err) => {
            console.error('❌ خطای PeerJS:', err);
        });

        this.peer.on('disconnected', () => {
            console.log('📴 قطع موقت اتصال');
            setTimeout(() => {
                if (this.peer && !this.peer.destroyed) {
                    this.peer.reconnect();
                }
            }, 3000);
        });
    }

    startPeerDiscovery() {
        // روش اول: BroadcastChannel
        if (typeof BroadcastChannel !== 'undefined') {
            try {
                const channel = new BroadcastChannel('mesh-chat');
                
                channel.onmessage = (event) => {
                    if (event.data && 
                        event.data.type === 'peer-discovery' && 
                        event.data.userId !== this.userId) {
                        
                        console.log('🔍 همسایه پیدا شد:', event.data);
                        this.addToPeersList(event.data);
                        
                        // اتصال خودکار برای چت کلی
                        if (!this.connections.has(event.data.userId)) {
                            setTimeout(() => {
                                this.connectToPeer(event.data.userId, true);
                            }, 500);
                        }
                    }
                };
                
                // ارسال سیگنال کشف هر ۳ ثانیه
                setInterval(() => {
                    if (this.username) {
                        channel.postMessage({
                            type: 'peer-discovery',
                            userId: this.userId,
                            username: this.username,
                            timestamp: Date.now()
                        });
                    }
                }, 3000);
                
                console.log('📡 BroadcastChannel فعال شد');
                
            } catch (e) {
                console.log('⚠️ BroadcastChannel خطا:', e);
                this.startLocalStorageDiscovery();
            }
        } else {
            this.startLocalStorageDiscovery();
        }
    }

    startLocalStorageDiscovery() {
        console.log('🔄 استفاده از localStorage discovery');
        
        // ذخیره اطلاعات خودم
        const myInfo = {
            userId: this.userId,
            username: this.username,
            timestamp: Date.now()
        };
        localStorage.setItem('mesh-chat-me', JSON.stringify(myInfo));
        
        // گوش دادن به تغییرات localStorage
        window.addEventListener('storage', (e) => {
            if (e.key === 'mesh-chat-peer' && e.newValue) {
                try {
                    const data = JSON.parse(e.newValue);
                    if (data.userId !== this.userId && (Date.now() - data.timestamp) < 10000) {
                        console.log('🔍 همسایه (localStorage):', data);
                        this.addToPeersList(data);
                        
                        if (!this.connections.has(data.userId)) {
                            setTimeout(() => {
                                this.connectToPeer(data.userId, true);
                            }, 500);
                        }
                    }
                } catch (error) {}
            }
        });
        
        // ارسال منظم
        setInterval(() => {
            if (this.username) {
                localStorage.setItem('mesh-chat-peer', JSON.stringify({
                    userId: this.userId,
                    username: this.username,
                    timestamp: Date.now()
                }));
            }
        }, 3000);
    }

    addToPeersList(peerInfo) {
        if (!this.elements.peersList) return;
        
        // حذف موارد تکراری
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
            
            // اگه چت کلی باز بود، پیام بده
            if (!this.elements.publicChatSection.classList.contains('hidden')) {
                this.displayMessage(this.elements.publicMessages, {
                    text: `👤 ${peerInfo.username || peerInfo.userId} به شبکه پیوست`,
                    sender: 'سیستم',
                    isSent: false,
                    time: new Date().toLocaleTimeString('fa-IR')
                });
            }
        }
    }

    handleIncomingConnection(conn) {
        this.connections.set(conn.peer, conn);
        
        conn.on('open', () => {
            console.log('✅ اتصال برقرار شد با:', conn.peer);
            
            // ارسال اطلاعات خودم
            conn.send({
                type: 'user-info',
                username: this.username,
                userId: this.userId
            });
            
            // اگه چت کلی باز بود، پیام بده
            if (!this.elements.publicChatSection.classList.contains('hidden')) {
                this.displayMessage(this.elements.publicMessages, {
                    text: `🔗 اتصال به ${conn.remoteUsername || conn.peer} برقرار شد`,
                    sender: 'سیستم',
                    isSent: false,
                    time: new Date().toLocaleTimeString('fa-IR')
                });
            }
        });

        conn.on('data', (data) => {
            this.handleIncomingData(conn, data);
        });

        conn.on('close', () => {
            console.log('📴 اتصال بسته شد:', conn.peer);
            this.connections.delete(conn.peer);
            this.removeFromPeersList(conn.peer);
            
            if (!this.elements.publicChatSection.classList.contains('hidden')) {
                this.displayMessage(this.elements.publicMessages, {
                    text: `👋 ${conn.remoteUsername || conn.peer} از شبکه خارج شد`,
                    sender: 'سیستم',
                    isSent: false,
                    time: new Date().toLocaleTimeString('fa-IR')
                });
            }
        });
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
                if (!this.elements.publicChatSection.classList.contains('hidden')) {
                    this.displayMessage(this.elements.publicMessages, {
                        text: data.text,
                        sender: conn.remoteUsername || 'کاربر',
                        isSent: false,
                        time: data.time || time
                    });
                }
                break;
                
            case 'private-message':
                if (!this.elements.privateChatSection.classList.contains('hidden')) {
                    this.displayMessage(this.elements.privateMessages, {
                        text: data.text,
                        sender: conn.remoteUsername || 'کاربر',
                        isSent: false,
                        time: data.time || time
                    });
                    
                    this.elements.privateMessageInput.disabled = false;
                    this.elements.sendPrivateBtn.disabled = false;
                }
                break;
        }
    }

    openPublicChat() {
        this.elements.publicChatSection.classList.remove('hidden');
        this.elements.privateChatSection.classList.add('hidden');
        
        // پاک کردن و اضافه کردن پیام‌های قبلی
        this.elements.publicMessages.innerHTML = '';
        
        // پیام خوش‌آمد
        this.displayMessage(this.elements.publicMessages, {
            text: '🌐 چت کلی - با همه افراد آنلاین در اطراف خود صحبت کنید',
            sender: 'سیستم',
            isSent: false,
            time: new Date().toLocaleTimeString('fa-IR')
        });
        
        // نمایش تعداد افراد آنلاین
        const onlineCount = this.connections.size;
        if (onlineCount > 0) {
            this.displayMessage(this.elements.publicMessages, {
                text: `👥 ${onlineCount} نفر آنلاین هستند`,
                sender: 'سیستم',
                isSent: false,
                time: new Date().toLocaleTimeString('fa-IR')
            });
        } else {
            this.displayMessage(this.elements.publicMessages, {
                text: '🕐 هیچ کس آنلاین نیست. منتظر بمانید...',
                sender: 'سیستم',
                isSent: false,
                time: new Date().toLocaleTimeString('fa-IR')
            });
        }
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
                alert('از قبل متصل هستید');
                this.activatePrivateChat();
            }
            return;
        }

        try {
            console.log('🔌 تلاش برای اتصال به:', targetId);
            const conn = this.peer.connect(targetId);
            
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
                alert('خطا در اتصال');
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
        
        // نمایش پیام خودم
        this.displayMessage(this.elements.publicMessages, {
            text: message,
            sender: 'شما',
            isSent: true,
            time: time
        });
        
        // ارسال به همه
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
                    console.error('❌ خطا در ارسال:', e);
                }
            }
        });
        
        if (sentCount === 0) {
            this.displayMessage(this.elements.publicMessages, {
                text: '⚠️ هیچ کسی آنلاین نیست',
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
        
        // پیدا کردن اولین اتصال فعال
        let targetConn = null;
        for (let [_, conn] of this.connections) {
            if (conn.open) {
                targetConn = conn;
                break;
            }
        }
        
        if (!targetConn) {
            alert('⚠️ ابتدا به یک کاربر متصل شوید');
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

    displayMessage(container, message) {
        if (!container) return;
        
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${message.isSent ? 'sent' : 'received'}`;
        
        messageDiv.innerHTML = `
            <div class="message-content">${this.escapeHtml(message.text)}</div>
            <div class="message-info">${this.escapeHtml(message.sender)} • ${message.time}</div>
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
        let bgColor = '#f3f4f6';
        
        switch(type) {
            case 'success':
                dotColor = '#10b981';
                bgColor = '#f0fdf4';
                break;
            case 'error':
                dotColor = '#ef4444';
                bgColor = '#fef2f2';
                break;
            case 'offline':
                dotColor = '#f59e0b';
                bgColor = '#fffbeb';
                break;
            case 'online':
                dotColor = '#3b82f6';
                bgColor = '#eff6ff';
                break;
        }
        
        this.elements.connectionStatus.style.background = bgColor;
        this.elements.connectionStatus.innerHTML = `
            <span class="status-dot" style="background: ${dotColor};"></span>
            <span>${text}</span>
        `;
    }
}

// راه‌اندازی
window.addEventListener('load', () => {
    console.log('🚀 راه‌اندازی برنامه...');
    window.meshChat = new MeshChat();
    
    // بازیابی اطلاعات ذخیره شده
    const savedUserId = localStorage.getItem('meshChat_userId');
    const savedUsername = localStorage.getItem('meshChat_username');
    
    if (savedUserId && document.getElementById('user-id')) {
        document.getElementById('user-id').textContent = savedUserId;
    }
    
    if (savedUsername && document.getElementById('username-input')) {
        document.getElementById('username-input').value = savedUsername;
    }
});
