/* =============================================
   Authentication Module
   ============================================= */

const Auth = {
    currentUser: null,

    init() {
        const saved = DataStore.get(DataStore.KEYS.CURRENT_USER);
        if (saved) {
            this.currentUser = saved;
            return true;
        }
        return false;
    },

    login(username, password, role) {
        const users = DataStore.get(DataStore.KEYS.USERS) || [];
        const user = users.find(u => u.username === username && u.password === password && u.role === role);

        if (user) {
            this.currentUser = {
                username: user.username,
                role: user.role,
                name: user.name
            };
            DataStore.set(DataStore.KEYS.CURRENT_USER, this.currentUser);
            DataStore.addActivity('auth', `${user.name} logged in as ${user.role}`, 'fa-sign-in-alt');
            return { success: true, user: this.currentUser };
        }

        return { success: false, message: 'Invalid credentials' };
    },

    logout() {
        if (this.currentUser) {
            DataStore.addActivity('auth', `${this.currentUser.name} logged out`, 'fa-sign-out-alt');
        }
        this.currentUser = null;
        localStorage.removeItem(DataStore.KEYS.CURRENT_USER);
    },

    isAdmin() {
        return this.currentUser && this.currentUser.role === 'admin';
    },

    isDriver() {
        return this.currentUser && this.currentUser.role === 'driver';
    },

    getCurrentUser() {
        return this.currentUser;
    }
};
