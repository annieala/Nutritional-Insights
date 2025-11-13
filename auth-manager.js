// Authentication Manager
// Handles login, logout, 2FA, session management

class AuthManager {
  constructor() {
    this.auth = firebase.auth();
    this.db = firebase.firestore();
    this.currentUser = null;
    this.userRole = null;
    
    // Listen for auth state changes
    this.auth.onAuthStateChanged(async (user) => {
      await this.handleAuthStateChange(user);
    });
  }

  async handleAuthStateChange(user) {
    if (user) {
      this.currentUser = user;
      console.log('User signed in:', user.email);
      
      // Load user role
      await this.loadUserRole();
      
      // Log authentication event
      await AuditLogger.logEvent('user_login', {
        userId: user.uid,
        email: user.email,
        provider: user.providerData[0]?.providerId,
        timestamp: new Date().toISOString()
      });
      
      // Show authenticated UI
      this.showAuthenticatedUI();
    } else {
      this.currentUser = null;
      this.userRole = null;
      console.log('User signed out');
      
      // Show login UI
      this.showLoginUI();
    }
  }

  // Google OAuth Login
  async loginWithGoogle() {
    try {
      const provider = new firebase.auth.GoogleAuthProvider();
      provider.addScope('profile');
      provider.addScope('email');
      
      const result = await this.auth.signInWithPopup(provider);
      
      // Check if 2FA is required
      if (await this.requires2FA(result.user.uid)) {
        await this.prompt2FA(result.user);
      }
      
      this.showNotification('Successfully logged in with Google', 'success');
      return result.user;
    } catch (error) {
      console.error('Google login error:', error);
      this.showNotification(`Login failed: ${error.message}`, 'error');
      
      // Log failed attempt
      await AuditLogger.logEvent('login_failed', {
        provider: 'google',
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  // GitHub OAuth Login
  async loginWithGitHub() {
    try {
      const provider = new firebase.auth.GithubAuthProvider();
      provider.addScope('read:user');
      provider.addScope('user:email');
      
      const result = await this.auth.signInWithPopup(provider);
      
      // Check if 2FA is required
      if (await this.requires2FA(result.user.uid)) {
        await this.prompt2FA(result.user);
      }
      
      this.showNotification('Successfully logged in with GitHub', 'success');
      return result.user;
    } catch (error) {
      console.error('GitHub login error:', error);
      this.showNotification(`Login failed: ${error.message}`, 'error');
      
      // Log failed attempt
      await AuditLogger.logEvent('login_failed', {
        provider: 'github',
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  // Email/Password Login
  async loginWithEmail(email, password) {
    try {
      const result = await this.auth.signInWithEmailAndPassword(email, password);
      
      // Check if 2FA is required
      if (await this.requires2FA(result.user.uid)) {
        await this.prompt2FA(result.user);
      }
      
      this.showNotification('Successfully logged in', 'success');
      return result.user;
    } catch (error) {
      console.error('Email login error:', error);
      this.showNotification(`Login failed: ${error.message}`, 'error');
      
      // Log failed attempt
      await AuditLogger.logEvent('login_failed', {
        provider: 'email',
        email: email,
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  // Sign Up with Email
  async signUpWithEmail(email, password, displayName) {
    try {
      const result = await this.auth.createUserWithEmailAndPassword(email, password);
      
      // Update profile
      await result.user.updateProfile({
        displayName: displayName
      });
      
      // Create user document with default viewer role
      await this.db.collection('user_roles').doc(result.user.uid).set({
        role: 'viewer',
        permissions: ['read'],
        created_at: firebase.firestore.FieldValue.serverTimestamp(),
        email: email,
        displayName: displayName
      });
      
      this.showNotification('Account created successfully!', 'success');
      return result.user;
    } catch (error) {
      console.error('Sign up error:', error);
      this.showNotification(`Sign up failed: ${error.message}`, 'error');
    }
  }

  // Logout
  async logout() {
    try {
      const userId = this.currentUser?.uid;
      
      await this.auth.signOut();
      
      // Log logout event
      if (userId) {
        await AuditLogger.logEvent('user_logout', {
          userId: userId,
          timestamp: new Date().toISOString()
        });
      }
      
      this.showNotification('Logged out successfully', 'success');
    } catch (error) {
      console.error('Logout error:', error);
      this.showNotification(`Logout failed: ${error.message}`, 'error');
    }
  }

  // Check if user requires 2FA
  async requires2FA(userId) {
    try {
      const userDoc = await this.db.collection('users').doc(userId).get();
      return userDoc.exists && userDoc.data().twoFactorEnabled === true;
    } catch (error) {
      console.error('Error checking 2FA status:', error);
      return false;
    }
  }

  // Prompt for 2FA code
  async prompt2FA(user) {
    const code = prompt('Enter your 6-digit 2FA code:');
    
    if (!code || code.length !== 6) {
      await this.auth.signOut();
      this.showNotification('Invalid 2FA code. Please try again.', 'error');
      throw new Error('2FA verification failed');
    }
    
    // Verify 2FA code
    const isValid = await this.verify2FACode(user.uid, code);
    
    if (!isValid) {
      await this.auth.signOut();
      this.showNotification('Invalid 2FA code. Access denied.', 'error');
      throw new Error('2FA verification failed');
    }
    
    // Log successful 2FA
    await AuditLogger.logEvent('2fa_success', {
      userId: user.uid,
      timestamp: new Date().toISOString()
    });
  }

  // Verify 2FA code (TOTP)
  async verify2FACode(userId, code) {
    try {
      // Get user's 2FA secret from Firestore
      const userDoc = await this.db.collection('users').doc(userId).get();
      const secret = userDoc.data()?.twoFactorSecret;
      
      if (!secret) return false;
      
      // Verify TOTP code using a library (you'd need to add this)
      // For now, we'll simulate verification
      // In production, use: https://github.com/bellstrand/totp-generator
      return true; // Simulated
    } catch (error) {
      console.error('2FA verification error:', error);
      return false;
    }
  }

  // Enable 2FA for user
  async enable2FA() {
    if (!this.currentUser) {
      this.showNotification('Please log in first', 'error');
      return;
    }
    
    try {
      // Generate TOTP secret
      const secret = this.generateSecret();
      
      // Save to Firestore
      await this.db.collection('users').doc(this.currentUser.uid).set({
        twoFactorEnabled: true,
        twoFactorSecret: secret,
        twoFactorEnabledAt: firebase.firestore.FieldValue.serverTimestamp()
      }, { merge: true });
      
      // Generate QR code for user
      const qrCodeUrl = this.generateQRCode(this.currentUser.email, secret);
      
      // Show QR code to user
      this.showQRCodeModal(qrCodeUrl, secret);
      
      // Log 2FA enablement
      await AuditLogger.logEvent('2fa_enabled', {
        userId: this.currentUser.uid,
        timestamp: new Date().toISOString()
      });
      
      this.showNotification('2FA enabled successfully!', 'success');
    } catch (error) {
      console.error('Error enabling 2FA:', error);
      this.showNotification(`Failed to enable 2FA: ${error.message}`, 'error');
    }
  }

  // Generate TOTP secret
  generateSecret() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    let secret = '';
    for (let i = 0; i < 32; i++) {
      secret += chars[Math.floor(Math.random() * chars.length)];
    }
    return secret;
  }

  // Generate QR code URL for authenticator apps
  generateQRCode(email, secret) {
    const issuer = 'Nutritional Insights';
    const label = `${issuer}:${email}`;
    const otpauthUrl = `otpauth://totp/${encodeURIComponent(label)}?secret=${secret}&issuer=${encodeURIComponent(issuer)}`;
    return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(otpauthUrl)}`;
  }

  // Show QR code modal
  showQRCodeModal(qrCodeUrl, secret) {
    const modal = document.getElementById('qrCodeModal');
    if (modal) {
      document.getElementById('qrCodeImage').src = qrCodeUrl;
      document.getElementById('secretKey').textContent = secret;
      modal.classList.remove('hidden');
    }
  }

  // Load user role from Firestore
  async loadUserRole() {
    if (!this.currentUser) return;
    
    try {
      const roleDoc = await this.db.collection('user_roles').doc(this.currentUser.uid).get();
      
      if (roleDoc.exists) {
        this.userRole = roleDoc.data();
        console.log('User role loaded:', this.userRole.role);
      } else {
        // Create default viewer role if none exists
        this.userRole = {
          role: 'viewer',
          permissions: ['read']
        };
        
        await this.db.collection('user_roles').doc(this.currentUser.uid).set({
          ...this.userRole,
          created_at: firebase.firestore.FieldValue.serverTimestamp(),
          email: this.currentUser.email
        });
      }
    } catch (error) {
      console.error('Error loading user role:', error);
    }
  }

  // Check if user has permission
  hasPermission(permission) {
    if (!this.userRole) return false;
    return this.userRole.permissions.includes(permission);
  }

  // Show authenticated UI
  showAuthenticatedUI() {
    const loginSection = document.getElementById('loginSection');
    const mainContent = document.getElementById('mainContent');
    const userInfo = document.getElementById('userInfo');
    const loadingOverlay = document.getElementById('loadingOverlay');
    
    if (loginSection) loginSection.classList.add('hidden');
    if (mainContent) mainContent.classList.remove('hidden');
    if (loadingOverlay) loadingOverlay.style.display = 'none';
    
    if (userInfo && this.currentUser) {
      userInfo.innerHTML = `
        <div class="flex items-center gap-4">
          <img src="${this.currentUser.photoURL || 'https://via.placeholder.com/40'}" 
               alt="Profile" 
               class="w-10 h-10 rounded-full">
          <div>
            <p class="font-semibold">${this.currentUser.displayName || this.currentUser.email}</p>
            <p class="text-xs text-gray-600">Role: ${this.userRole?.role || 'viewer'}</p>
          </div>
          <button onclick="authManager.logout()" 
                  class="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700">
            Logout
          </button>
        </div>
      `;
    }
  }

  // Show login UI
  showLoginUI() {
    const loginSection = document.getElementById('loginSection');
    const mainContent = document.getElementById('mainContent');
    const loadingOverlay = document.getElementById('loadingOverlay');
    
    if (loginSection) loginSection.classList.remove('hidden');
    if (mainContent) mainContent.classList.add('hidden');
    if (loadingOverlay) loadingOverlay.style.display = 'none';
  }

  // Show notification
  showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `fixed top-4 right-4 px-6 py-4 rounded-lg shadow-lg z-50 ${
      type === 'success' ? 'bg-green-500' :
      type === 'error' ? 'bg-red-500' :
      'bg-blue-500'
    } text-white`;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
      notification.remove();
    }, 3000);
  }

  // Get current user
  getCurrentUser() {
    return this.currentUser;
  }

  // Get user role
  getUserRole() {
    return this.userRole;
  }
}

// Initialize auth manager
const authManager = new AuthManager();

// Export for use in other files
window.authManager = authManager;