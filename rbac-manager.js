// RBAC Manager
// Handles Role-Based Access Control

class RBACManager {
  constructor() {
    this.db = firebase.firestore();
    this.auth = firebase.auth();
    this.roles = {
      admin: {
        permissions: ['read', 'write', 'delete', 'manage_users', 'view_audit_logs', 'export_data', 'manage_roles'],
        level: 3
      },
      editor: {
        permissions: ['read', 'write', 'view_audit_logs'],
        level: 2
      },
      viewer: {
        permissions: ['read'],
        level: 1
      }
    };
  }

  // Check if user has specific permission
  async hasPermission(userId, permission) {
    try {
      const userRole = await this.getUserRole(userId);
      if (!userRole) return false;
      
      return userRole.permissions.includes(permission);
    } catch (error) {
      console.error('Error checking permission:', error);
      return false;
    }
  }

  // Check if current user has permission
  async currentUserHasPermission(permission) {
    const currentUser = this.auth.currentUser;
    if (!currentUser) return false;
    
    return await this.hasPermission(currentUser.uid, permission);
  }

  // Get user role
  async getUserRole(userId) {
    try {
      const roleDoc = await this.db.collection('user_roles').doc(userId).get();
      
      if (!roleDoc.exists) {
        // Create default viewer role
        await this.assignRole(userId, 'viewer');
        return this.roles.viewer;
      }
      
      return roleDoc.data();
    } catch (error) {
      console.error('Error getting user role:', error);
      return null;
    }
  }

  // Assign role to user
  async assignRole(userId, roleName, assignedBy = null) {
    try {
      // Check if assigner has permission
      if (assignedBy && !(await this.hasPermission(assignedBy, 'manage_roles'))) {
        throw new Error('Insufficient permissions to assign roles');
      }

      const roleData = this.roles[roleName];
      if (!roleData) {
        throw new Error(`Invalid role: ${roleName}`);
      }

      // Get old role for audit log
      const oldRole = await this.getUserRole(userId);

      // Assign new role
      await this.db.collection('user_roles').doc(userId).set({
        role: roleName,
        permissions: roleData.permissions,
        level: roleData.level,
        updated_at: firebase.firestore.FieldValue.serverTimestamp(),
        updated_by: assignedBy
      }, { merge: true });

      // Log role change
      await AuditLogger.logPermissionChange(
        userId,
        oldRole?.role || 'none',
        roleName,
        assignedBy || 'system'
      );

      console.log(`Role ${roleName} assigned to user ${userId}`);
      return true;
    } catch (error) {
      console.error('Error assigning role:', error);
      throw error;
    }
  }

  // Get all users with their roles (admin only)
  async getAllUsersWithRoles() {
    try {
      // Check if current user is admin
      if (!(await this.currentUserHasPermission('manage_users'))) {
        throw new Error('Insufficient permissions');
      }

      const snapshot = await this.db.collection('user_roles').get();
      const users = [];
      
      snapshot.forEach(doc => {
        users.push({
          userId: doc.id,
          ...doc.data()
        });
      });

      return users;
    } catch (error) {
      console.error('Error getting users:', error);
      throw error;
    }
  }

  // Check if user can access resource
  async canAccessResource(userId, resourceType, resourceId, action) {
    try {
      const userRole = await this.getUserRole(userId);
      if (!userRole) return false;

      // Admin can access everything
      if (userRole.role === 'admin') return true;

      // Check specific permission for action
      switch (action) {
        case 'read':
          return userRole.permissions.includes('read');
        case 'write':
        case 'update':
          return userRole.permissions.includes('write');
        case 'delete':
          return userRole.permissions.includes('delete');
        default:
          return false;
      }
    } catch (error) {
      console.error('Error checking resource access:', error);
      return false;
    }
  }

  // Middleware to protect routes/actions
  async requirePermission(permission, action) {
    const hasPermission = await this.currentUserHasPermission(permission);
    
    if (!hasPermission) {
      // Log unauthorized access attempt
      await AuditLogger.logSecurityEvent(
        'unauthorized_access',
        'medium',
        {
          requiredPermission: permission,
          attemptedAction: action,
          userId: this.auth.currentUser?.uid
        }
      );
      
      throw new Error('Insufficient permissions');
    }
    
    return true;
  }

  // UI Helper: Show/hide elements based on permissions
  async applyUIPermissions() {
    const currentUser = this.auth.currentUser;
    if (!currentUser) return;

    const userRole = await this.getUserRole(currentUser.uid);
    if (!userRole) return;

    // Hide elements that require admin permission
    if (!userRole.permissions.includes('manage_users')) {
      document.querySelectorAll('[data-require-permission="manage_users"]').forEach(el => {
        el.style.display = 'none';
      });
    }

    // Hide write actions for viewers
    if (!userRole.permissions.includes('write')) {
      document.querySelectorAll('[data-require-permission="write"]').forEach(el => {
        el.style.display = 'none';
      });
    }

    // Hide delete actions for non-admins
    if (!userRole.permissions.includes('delete')) {
      document.querySelectorAll('[data-require-permission="delete"]').forEach(el => {
        el.style.display = 'none';
      });
    }

    // Show role badge
    const roleBadge = document.getElementById('userRoleBadge');
    if (roleBadge) {
      const colors = {
        admin: 'bg-red-600',
        editor: 'bg-blue-600',
        viewer: 'bg-green-600'
      };
      
      roleBadge.className = `px-3 py-1 rounded-full text-white text-xs ${colors[userRole.role]}`;
      roleBadge.textContent = userRole.role.toUpperCase();
    }
  }

  // Get role display info
  getRoleInfo(roleName) {
    const info = {
      admin: {
        name: 'Administrator',
        description: 'Full access to all features and user management',
        color: 'red',
        icon: '👑'
      },
      editor: {
        name: 'Editor',
        description: 'Can read and modify data',
        color: 'blue',
        icon: '✏️'
      },
      viewer: {
        name: 'Viewer',
        description: 'Read-only access to data',
        color: 'green',
        icon: '👁️'
      }
    };

    return info[roleName] || info.viewer;
  }

  // Upgrade user role (with approval workflow in real app)
  async requestRoleUpgrade(userId, requestedRole, reason) {
    try {
      // In a real application, this would create an approval request
      // For demo purposes, we'll just log it
      
      await AuditLogger.logEvent('role_upgrade_request', {
        userId,
        currentRole: (await this.getUserRole(userId))?.role,
        requestedRole,
        reason,
        status: 'pending',
        timestamp: new Date().toISOString()
      });

      console.log('Role upgrade request submitted');
      return true;
    } catch (error) {
      console.error('Error requesting role upgrade:', error);
      throw error;
    }
  }

  // Revoke specific permission temporarily
  async revokePermission(userId, permission, duration = 3600000) { // 1 hour default
    try {
      const currentUser = this.auth.currentUser;
      if (!currentUser || !(await this.hasPermission(currentUser.uid, 'manage_roles'))) {
        throw new Error('Insufficient permissions');
      }

      // Store revocation in a separate collection
      await this.db.collection('permission_revocations').add({
        userId,
        permission,
        revokedBy: currentUser.uid,
        revokedAt: firebase.firestore.FieldValue.serverTimestamp(),
        expiresAt: new Date(Date.now() + duration),
        reason: 'Temporary revocation'
      });

      // Log the revocation
      await AuditLogger.logSecurityEvent(
        'permission_revoked',
        'high',
        {
          userId,
          permission,
          revokedBy: currentUser.uid,
          duration: duration / 1000 / 60 + ' minutes'
        }
      );

      console.log(`Permission ${permission} revoked for user ${userId}`);
      return true;
    } catch (error) {
      console.error('Error revoking permission:', error);
      throw error;
    }
  }
}

// Initialize RBAC manager
const rbacManager = new RBACManager();

// Export for use in other files
window.rbacManager = rbacManager;

console.log('RBAC Manager initialized');