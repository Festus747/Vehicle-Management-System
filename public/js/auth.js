/* =============================================
   Authentication Module - JWT backed
   ============================================= */

const Auth = {
    currentUser: null,

    init() {
        // Check for saved session
        const saved = DataStore.get(DataStore.KEYS.CURRENT_USER);
        const token = ApiClient.getToken();
        if (saved && token) {
            this.currentUser = saved;
            return true;
        }
        return false;
    },

    async login(username, password, role) {
        try {
            const result = await ApiClient.login(username, password, role);
            if (result && result.success) {
                ApiClient.setToken(result.token);
                this.currentUser = {
                    id: result.user.id,
                    username: result.user.username,
                    role: result.user.role,
                    name: result.user.name
                };
                DataStore.set(DataStore.KEYS.CURRENT_USER, this.currentUser);
                return { success: true, user: this.currentUser };
            }
            return { success: false, message: result ? result.error : 'Login failed' };
        } catch (err) {
            // Fallback to local auth when offline
            if (!navigator.onLine) {
                return this.localLogin(username, password, role);
            }
            return { success: false, message: err.message || 'Login failed' };
        }
    },

    localLogin(username, password, role) {
        var users = DataStore.get(DataStore.KEYS.USERS) || [];
        var user = users.find(function(u) {
            return u.username === username && u.password === password && u.role === role;
        });
        if (user) {
            this.currentUser = { username: user.username, role: user.role, name: user.name };
            DataStore.set(DataStore.KEYS.CURRENT_USER, this.currentUser);
            return { success: true, user: this.currentUser };
        }
        return { success: false, message: 'Invalid credentials' };
    },

    logout() {
        if (this.currentUser) {
            DataStore.addActivity('auth', this.currentUser.name + ' logged out', 'fa-sign-out-alt');
        }
        this.currentUser = null;
        ApiClient.setToken(null);
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
