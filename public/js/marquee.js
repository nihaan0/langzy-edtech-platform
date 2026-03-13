// Shared Language Cycling Marquee
// Include this script + add <div id="langMarqueeMount"></div> anywhere in the page

(function initMarquee() {
    const langs = [
        { name: 'Spanish', flag: '🇪🇸', native: 'Español' },
        { name: 'French', flag: '🇫🇷', native: 'Français' },
        { name: 'German', flag: '🇩🇪', native: 'Deutsch' },
        { name: 'Italian', flag: '🇮🇹', native: 'Italiano' },
        { name: 'Portuguese', flag: '🇵🇹', native: 'Português' },
        { name: 'Dutch', flag: '🇳🇱', native: 'Nederlands' },
        { name: 'Swedish', flag: '🇸🇪', native: 'Svenska' },
        { name: 'Tamil', flag: '🇮🇳', native: 'தமிழ்' },
        { name: 'Hindi', flag: '🇮🇳', native: 'हिन्दी' },
        { name: 'Japanese', flag: '🇯🇵', native: '日本語' },
        { name: 'Chinese', flag: '🇨🇳', native: '中文' },
        { name: 'Korean', flag: '🇰🇷', native: '한국어' },
        { name: 'Russian', flag: '🇷🇺', native: 'Русский' },
        { name: 'Arabic', flag: '🇸🇦', native: 'العربية' },
        { name: 'Turkish', flag: '🇹🇷', native: 'Türkçe' },
        { name: 'Greek', flag: '🇬🇷', native: 'Ελληνικά' },
        { name: 'Polish', flag: '🇵🇱', native: 'Polski' },
        { name: 'Vietnamese', flag: '🇻🇳', native: 'Tiếng Việt' },
        { name: 'Indonesian', flag: '🇮🇩', native: 'Bahasa' },
        { name: 'Thai', flag: '🇹🇭', native: 'ไทย' },
        { name: 'English', flag: '🇬🇧', native: 'English' },
    ];

    const mount = document.getElementById('langMarqueeMount');
    if (!mount) return;

    const all = [...langs, ...langs]; // duplicate for seamless loop

    mount.innerHTML = `
        <div class="lang-marquee-wrapper">
            <div class="lang-marquee-fade lang-marquee-fade-left"></div>
            <div class="lang-marquee-fade lang-marquee-fade-right"></div>
            <div class="lang-marquee-track" id="langMarqueeTrack">
                ${all.map(l => `
                    <div class="lang-chip" onclick="marqueeSelectLanguage('${l.name}')" title="Switch to ${l.name}">
                        <span class="flag">${l.flag}</span>
                        <span>${l.name}</span>
                        <span class="native">${l.native}</span>
                    </div>`).join('')}
            </div>
        </div>
    `;
})();

async function marqueeSelectLanguage(language) {
    try {
        if (typeof showToast === 'function') showToast(`Switching to ${language}... 🌍`, 'info');
        if (typeof apiCall === 'function') {
            await apiCall('/auth/profile', {
                method: 'PUT',
                body: JSON.stringify({ currentLanguage: language })
            });
        }
        if (typeof getUser === 'function' && typeof saveUser === 'function') {
            const user = getUser();
            if (user) { user.currentLanguage = language; saveUser(user); }
        }
        if (typeof showToast === 'function') showToast(`${language} selected! 🎉`, 'success');
        setTimeout(() => window.location.href = 'dashboard.html', 700);
    } catch (error) {
        console.error('Language switch error:', error);
        if (typeof showToast === 'function') showToast('Failed to switch language', 'error');
    }
}
