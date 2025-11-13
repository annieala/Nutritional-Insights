// Audit Logger
// Logs all security and data access events for compliance

class AuditLoggerClass {
  constructor() {
    this.db = firebase.firestore();
    this.logsCollection = 'audit_logs';
  }

  // Log any event
  async logEvent(eventType, data) {
    try {
      const logEntry = {
        eventType: eventType,
        timestamp: firebase.firestore.FieldValue.serverTimestamp(),
        clientTimestamp: new Date().toISOString(),
        userId: firebase.auth().currentUser?.uid || 'anonymous',
        userEmail: firebase.auth().currentUser?.email || 'anonymous',
        ipAddress: await this.getClientIP(),
        userAgent: navigator.userAgent,
        data: data || {},
        environment: window.location.hostname
      };

      await this.db.collection(this.logsCollection).add(logEntry);
      
      console.log('Audit log created:', eventType);
    } catch (error) {
      console.error('Error creating audit log:', error);
      // Fallback to localStorage if Firestore fails
      this.fallbackLog(eventType, data);
    }
  }

  // Get client IP address (approximate)
  async getClientIP() {
    try {
      const response = await fetch('https://api.ipify.org?format=json');
      const data = await response.json();
      return data.ip;
    } catch {
      return 'unknown';
    }
  }

  // Fallback logging to localStorage
  fallbackLog(eventType, data) {
    try {
      const logs = JSON.parse(localStorage.getItem('audit_logs_fallback') || '[]');
      logs.push({
        eventType,
        timestamp: new Date().toISOString(),
        data
      });
      
      // Keep only last 100 logs
      if (logs.length > 100) {
        logs.shift();
      }
      
      localStorage.setItem('audit_logs_fallback', JSON.stringify(logs));
    } catch (error) {
      console.error('Fallback logging failed:', error);
    }
  }

  // Specific event loggers
  async logDataAccess(resourceType, resourceId, action) {
    await this.logEvent('data_access', {
      resourceType,
      resourceId,
      action,
      timestamp: new Date().toISOString()
    });
  }

  async logDataModification(resourceType, resourceId, changes) {
    await this.logEvent('data_modification', {
      resourceType,
      resourceId,
      changes,
      timestamp: new Date().toISOString()
    });
  }

  async logPermissionChange(targetUserId, oldRole, newRole, changedBy) {
    await this.logEvent('permission_change', {
      targetUserId,
      oldRole,
      newRole,
      changedBy,
      timestamp: new Date().toISOString()
    });
  }

  async logSecurityEvent(eventType, severity, details) {
    await this.logEvent('security_event', {
      securityEventType: eventType,
      severity,
      details,
      timestamp: new Date().toISOString()
    });
  }

  async logComplianceEvent(complianceType, action, details) {
    await this.logEvent('compliance_event', {
      complianceType, // 'gdpr', 'ccpa', etc.
      action, // 'data_export', 'data_deletion', 'consent_given', etc.
      details,
      timestamp: new Date().toISOString()
    });
  }

  // Retrieve audit logs with filters
  async getLogs(filters = {}, limit = 50) {
    try {
      let query = this.db.collection(this.logsCollection);

      // Apply filters
      if (filters.eventType) {
        query = query.where('eventType', '==', filters.eventType);
      }
      
      if (filters.userId) {
        query = query.where('userId', '==', filters.userId);
      }
      
      if (filters.startDate) {
        query = query.where('timestamp', '>=', filters.startDate);
      }
      
      if (filters.endDate) {
        query = query.where('timestamp', '<=', filters.endDate);
      }

      // Order by timestamp and limit
      query = query.orderBy('timestamp', 'desc').limit(limit);

      const snapshot = await query.get();
      const logs = [];
      
      snapshot.forEach(doc => {
        logs.push({
          id: doc.id,
          ...doc.data()
        });
      });

      return logs;
    } catch (error) {
      console.error('Error retrieving audit logs:', error);
      return [];
    }
  }

  // Get logs for current user
  async getMyLogs(limit = 50) {
    const currentUser = firebase.auth().currentUser;
    if (!currentUser) return [];
    
    return await this.getLogs({ userId: currentUser.uid }, limit);
  }

  // Get security events
  async getSecurityEvents(limit = 50) {
    return await this.getLogs({ eventType: 'security_event' }, limit);
  }

  // Get compliance events
  async getComplianceEvents(limit = 50) {
    return await this.getLogs({ eventType: 'compliance_event' }, limit);
  }

  // Get login attempts
  async getLoginAttempts(limit = 50) {
    return await this.getLogs({ eventType: 'user_login' }, limit);
  }

  // Get failed login attempts
  async getFailedLogins(limit = 50) {
    return await this.getLogs({ eventType: 'login_failed' }, limit);
  }

  // Export user data for GDPR compliance
  async exportUserData(userId) {
    try {
      // Get all user-related data
      const userData = {
        profile: {},
        audit_logs: [],
        user_role: {},
        exported_at: new Date().toISOString()
      };

      // Get user profile
      const userDoc = await this.db.collection('users').doc(userId).get();
      if (userDoc.exists) {
        userData.profile = userDoc.data();
      }

      // Get user role
      const roleDoc = await this.db.collection('user_roles').doc(userId).get();
      if (roleDoc.exists) {
        userData.user_role = roleDoc.data();
      }

      // Get user audit logs
      userData.audit_logs = await this.getLogs({ userId }, 1000);

      // Log the export
      await this.logComplianceEvent('gdpr', 'data_export', {
        userId,
        exportedAt: new Date().toISOString()
      });

      return userData;
    } catch (error) {
      console.error('Error exporting user data:', error);
      throw error;
    }
  }

  // Delete user data for GDPR compliance
  async deleteUserData(userId) {
    try {
      const batch = this.db.batch();

      // Delete user document
      const userRef = this.db.collection('users').doc(userId);
      batch.delete(userRef);

      // Delete user role
      const roleRef = this.db.collection('user_roles').doc(userId);
      batch.delete(roleRef);

      // Note: Audit logs are typically retained for compliance
      // But mark them as "user_deleted"
      const logsQuery = this.db.collection(this.logsCollection)
        .where('userId', '==', userId)
        .limit(500);
      
      const logsSnapshot = await logsQuery.get();
      logsSnapshot.forEach(doc => {
        batch.update(doc.ref, { 
          userDeleted: true,
          deletedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
      });

      await batch.commit();

      // Log the deletion
      await this.logComplianceEvent('gdpr', 'data_deletion', {
        userId,
        deletedAt: new Date().toISOString()
      });

      console.log('User data deleted successfully');
    } catch (error) {
      console.error('Error deleting user data:', error);
      throw error;
    }
  }

  // Generate compliance report
  async generateComplianceReport(startDate, endDate) {
    try {
      const report = {
        generated_at: new Date().toISOString(),
        period: {
          start: startDate,
          end: endDate
        },
        stats: {
          total_logins: 0,
          failed_logins: 0,
          data_exports: 0,
          data_deletions: 0,
          security_events: 0,
          unique_users: new Set()
        },
        events: []
      };

      // Get all logs for the period
      const logs = await this.getLogs({
        startDate: firebase.firestore.Timestamp.fromDate(new Date(startDate)),
        endDate: firebase.firestore.Timestamp.fromDate(new Date(endDate))
      }, 10000);

      // Process logs
      logs.forEach(log => {
        report.events.push(log);
        report.stats.unique_users.add(log.userId);

        switch (log.eventType) {
          case 'user_login':
            report.stats.total_logins++;
            break;
          case 'login_failed':
            report.stats.failed_logins++;
            break;
          case 'compliance_event':
            if (log.data.action === 'data_export') {
              report.stats.data_exports++;
            } else if (log.data.action === 'data_deletion') {
              report.stats.data_deletions++;
            }
            break;
          case 'security_event':
            report.stats.security_events++;
            break;
        }
      });

      report.stats.unique_users = report.stats.unique_users.size;

      return report;
    } catch (error) {
      console.error('Error generating compliance report:', error);
      throw error;
    }
  }
}

// Initialize audit logger
const AuditLogger = new AuditLoggerClass();

// Export for use in other files
window.AuditLogger = AuditLogger;

console.log('Audit Logger initialized');