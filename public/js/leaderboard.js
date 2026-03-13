// Leaderboard Page Logic
requireAuth();

const user = getUser();
let currentTab = 'weekly';

// Load user info
async function loadUserInfo() {
    try {
        const data = await apiCall('/auth/me');
        const userData = data.user;

        document.getElementById('userName').textContent = userData.name;
        document.getElementById('userXP').textContent = formatNumber(userData.xp || 0) + ' XP';
        const weeklyXPEl = document.getElementById('weeklyXP');
        if (weeklyXPEl) weeklyXPEl.textContent = formatNumber(userData.weeklyXP || 0);

        // Update Streak and Level
        const streakEl = document.getElementById('userStreak');
        const levelEl = document.getElementById('userLevel');
        if (streakEl) streakEl.textContent = userData.streak || 0;
        if (levelEl) levelEl.textContent = userData.level || 1;

        // Update league badge
        const leagueBadge = document.getElementById('userLeague');
        if (leagueBadge) {
            leagueBadge.className = `league-badge league-${userData.leagueTier?.toLowerCase() || 'bronze'}`;
            const leagueEmojis = {
                'Bronze': '🥉',
                'Silver': '🥈',
                'Gold': '🥇',
                'Diamond': '💎',
                'Legendary': '👑'
            };
            leagueBadge.innerHTML = `${leagueEmojis[userData.leagueTier] || '🥉'} ${userData.leagueTier || 'Bronze'} League`;
        }

        saveUser(userData);
    } catch (error) {
        console.error('Failed to load user info:', error);
    }
}

// Load leaderboard
async function loadLeaderboard() {
    try {
        let endpoint = '/leaderboard/global/weekly';

        switch (currentTab) {
            case 'weekly':
                endpoint = '/leaderboard/global/weekly';
                break;
            case 'monthly':
                endpoint = '/leaderboard/global/monthly';
                break;
            case 'friends':
                endpoint = '/leaderboard/friends';
                break;
            case 'global':
                endpoint = '/leaderboard/global/alltime';
                break;
        }

        const data = await apiCall(endpoint);
        const leaderboard = data.leaderboard || [];

        renderLeaderboard(leaderboard);
        updateUserRank(data.userRank);
    } catch (error) {
        console.error('Failed to load leaderboard:', error);
        showToast('Failed to load leaderboard', 'error');
    }
}

// Render leaderboard
function renderLeaderboard(leaderboard) {
    const container = document.getElementById('leaderboardList');
    container.innerHTML = '';

    if (leaderboard.length === 0) {
        container.innerHTML = '<p class="text-muted text-center" style="padding: 48px;">No rankings available yet</p>';
        return;
    }

    leaderboard.forEach((entry, index) => {
        const rank = index + 1;
        const isCurrentUser = entry.userId === user.id || entry.user?._id === user.id;

        const row = document.createElement('div');
        row.className = 'flex-between';
        row.style.padding = '16px';
        row.style.borderBottom = '1px solid var(--border-color)';
        row.style.background = isCurrentUser ? 'rgba(139, 92, 246, 0.1)' : 'transparent';

        // Medal for top 3
        let rankDisplay = rank;
        if (rank === 1) rankDisplay = '🥇';
        else if (rank === 2) rankDisplay = '🥈';
        else if (rank === 3) rankDisplay = '🥉';

        row.innerHTML = `
            <div class="flex gap-3" style="align-items: center;">
                <h3 style="font-size: 24px; font-weight: bold; min-width: 40px;">${rankDisplay}</h3>
                <img src="${entry.user?.avatar || entry.avatar || 'https://api.dicebear.com/7.x/avataaars/svg?seed=default'}" 
                    alt="Avatar" 
                    style="width: 48px; height: 48px; border-radius: 50%; border: 2px solid var(--purple);">
                <div>
                    <h4 style="margin-bottom: 4px;">${entry.user?.name || entry.name || 'User'}${isCurrentUser ? ' (You)' : ''}</h4>
                    <div class="league-badge league-${(entry.user?.leagueTier || entry.leagueTier || 'bronze').toLowerCase()}" 
                        style="padding: 4px 12px; font-size: 11px;">
                        ${entry.user?.leagueTier || entry.leagueTier || 'Bronze'}
                    </div>
                </div>
            </div>
            <div style="text-align: right;">
                <h3 style="color: var(--purple); margin-bottom: 4px;">${formatNumber(entry.xp || 0)}</h3>
                <p class="text-muted" style="font-size: 12px;">XP</p>
            </div>
        `;

        container.appendChild(row);
    });
}

// Update user rank
function updateUserRank(rank) {
    document.getElementById('userRank').textContent = rank ? `#${rank}` : '#-';
}

// Switch tab
function switchTab(tab) {
    currentTab = tab;

    // Update button styles
    document.querySelectorAll('[id^="tab"]').forEach(btn => {
        btn.classList.remove('btn-primary');
        btn.classList.add('btn-secondary');
    });
    document.getElementById(`tab${tab.charAt(0).toUpperCase() + tab.slice(1)}`).classList.remove('btn-secondary');
    document.getElementById(`tab${tab.charAt(0).toUpperCase() + tab.slice(1)}`).classList.add('btn-primary');

    loadLeaderboard();
}

// Go back
function goBack() {
    window.location.href = 'dashboard.html';
}

// Initialize
loadUserInfo();
loadLeaderboard();
