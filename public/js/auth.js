/* =============================================
   Authentication Module - JWT backed
   ============================================= */

const Auth = {
    currentUser: null,
    permissions: [],

    init() {
        // Check for saved session
        const saved = DataStore.get(DataStore.KEYS.CURRENT_USER);
        const token = ApiClient.getToken();
        if (saved && token) {
            this.currentUser = saved;
            this.permissions = saved.permissions || [];
            return true;
        }
        return false;
    },

    async login(email, password) {
        try {
            const result = await ApiClient.login(email, password);
            if (result && result.success) {
                ApiClient.setToken(result.token);
                this.currentUser = {
                    id: result.user.id,
                    email: result.user.email,
                    role: result.user.role,
                    name: result.user.name,
                    staffId: result.user.staffId || '',
                    permissions: result.user.permissions || []
                };
                this.permissions = result.user.permissions || [];
                DataStore.set(DataStore.KEYS.CURRENT_USER, this.currentUser);
                return { success: true, user: this.currentUser };
            }
            return { success: false, message: result ? result.error : 'Login failed' };
        } catch (err) {
            // Fallback to local auth when offline
            if (!navigator.onLine) {
                return this.localLogin(email, password);
            }
            return { success: false, message: err.message || 'Login failed' };
        }
    },

    localLogin(email, password) {
        var users = DataStore.get(DataStore.KEYS.USERS) || [];
        var user = users.find(function(u) {
            return u.email === email && u.password === password;
        });
        if (user) {
            this.currentUser = { email: user.email, role: user.role, name: user.name, permissions: [] };
            this.permissions = [];
            DataStore.set(DataStore.KEYS.CURRENT_USER, this.currentUser);
            return { success: true, user: this.currentUser };
        }
        return { success: false, message: 'Invalid email or password. Please check your credentials and try again.' };
    },

    logout() {
        if (this.currentUser) {
            DataStore.addActivity('auth', this.currentUser.name + ' logged out', 'fa-sign-out-alt');
        }
        this.currentUser = null;
        this.permissions = [];
        ApiClient.setToken(null);
        localStorage.removeItem(DataStore.KEYS.CURRENT_USER);
    },

    isAdmin() {
        return this.currentUser && this.currentUser.role === 'admin';
    },

    isDriver() {
        return this.currentUser && this.currentUser.role === 'driver';
    },

    hasPermission(perm) {
        if (this.isAdmin()) return true;
        return this.permissions.includes(perm);
    },

    getCurrentUser() {
        return this.currentUser;
    }
};
