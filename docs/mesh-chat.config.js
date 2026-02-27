// mesh-chat.config.js - تنظیمات پروژه
const CONFIG = {
    // اسم مخزن گیت‌هاب خودت رو اینجا بذار
    REPO_NAME: 'mesh-chat',
    
    // نسخه برنامه
    VERSION: '1.0.0',
    
    // تاریخ ساخت
    BUILD_DATE: 'زمستان 1404',
    
    // سازنده
    AUTHOR: 'طاها قاسمی'
};

// در محیط‌های مختلف
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CONFIG;
}