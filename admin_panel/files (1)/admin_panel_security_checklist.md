# ADMIN PANEL SECURITY CHECKLIST & BEST PRACTICES

Use this document to ensure your admin panel implementation meets enterprise-grade security standards.

---

## PRE-DEPLOYMENT SECURITY CHECKLIST

### Authentication Security

- [ ] **Password Requirements**
  - Minimum 12 characters enforced
  - Complexity validation: uppercase + lowercase + number + special char
  - Password strength meter on frontend
  - No common passwords (check against breach database)
  - Password history prevents reuse of last 5 passwords
  - Password expiration policy (90 days)

- [ ] **Password Storage**
  - Bcrypt with salt rounds ≥ 12
  - Never hash password twice
  - Never log/display passwords
  - Use timing-safe comparison for verification

- [ ] **Account Lockout**
  - Lock after 5 failed login attempts
  - Lock duration: 30 minutes
  - Clear lockout on successful login
  - Lock mechanism uses timestamps, not counters

- [ ] **Session Management**
  - JWT access tokens: 30-minute expiration
  - Refresh tokens: 7-day expiration
  - Tokens include user_id and username only
  - Token signing uses secure algorithm (HS256 minimum)
  - No sensitive data in token payload
  - Refresh token rotation on use

- [ ] **Cookies Security**
  - HttpOnly flag enabled (prevent JS access)
  - Secure flag enabled (HTTPS only)
  - SameSite=Strict set
  - Domain and Path attributes correctly set
  - Session cookie has max age
  - No persistent storage of sensitive tokens in localStorage

- [ ] **Rate Limiting**
  - Login endpoint: 5 attempts per IP per 15 minutes
  - API endpoints: 100 requests per user per minute
  - Use exponential backoff for repeated violations
  - Implement CAPTCHA after repeated failures

- [ ] **MFA Implementation**
  - TOTP (Time-based One-Time Password) via authenticator app
  - Backup codes generated (10 codes)
  - Backup codes stored hashed, not plaintext
  - MFA required for Super Admin accounts
  - Recovery codes can only be used once

---

### Authorization & Access Control

- [ ] **Role-Based Access Control (RBAC)**
  - Users cannot modify their own permissions
  - Users cannot assign themselves higher roles
  - Admins cannot modify other Super Admin accounts
  - Roles are immutable where appropriate (system roles)
  - Permission checks on every endpoint
  - Whitelist approach: deny by default

- [ ] **Permission Checks**
  - Middleware verifies permissions on every request
  - Permission check before data retrieval
  - Resource-level permission checks (not just endpoint level)
  - Proper error responses for insufficient permissions (403, not 404)

- [ ] **Data Isolation**
  - Users can only see/edit their own profile
  - Users can only see users within their organization (if multi-tenant)
  - Admins cannot access data of higher-level admins
  - Query-level filtering prevents unauthorized data leakage

- [ ] **Session Control**
  - Track all active sessions per user
  - Allow users to revoke sessions
  - Admin can revoke user sessions
  - Session blacklist on logout
  - Sessions expire after inactivity (15 minutes)

---

### API Security

- [ ] **Input Validation**
  - All inputs validated before processing
  - Schema validation on request body
  - Query parameter validation
  - Type checking for all inputs
  - Length limits enforced
  - Special characters sanitized for context

- [ ] **Output Encoding**
  - Sensitive data not exposed in responses
  - Passwords/hashes never returned
  - Secrets never exposed in error messages
  - Proper JSON encoding to prevent XSS

- [ ] **HTTP Security Headers**
  - X-Frame-Options: DENY
  - X-Content-Type-Options: nosniff
  - X-XSS-Protection: 1; mode=block
  - Strict-Transport-Security (HSTS): max-age=31536000
  - Content-Security-Policy: restrictive policy
  - Referrer-Policy: no-referrer
  - Permissions-Policy: geolocation=(), microphone=()

- [ ] **CORS Configuration**
  - Only whitelist specific origins (no wildcards)
  - Credentials: true only for trusted origins
  - Allowed methods: POST, GET, PUT, DELETE
  - Allowed headers explicitly listed
  - Preflight requests properly handled

- [ ] **CSRF Protection**
  - CSRF tokens generated per session
  - Tokens validated on state-changing requests (POST, PUT, DELETE)
  - Tokens expire after 1 hour
  - Tokens are random and unpredictable

- [ ] **Encryption**
  - HTTPS/TLS 1.2+ for all communications
  - Certificate pinning (optional, for mobile)
  - Sensitive fields encrypted at rest (e.g., email in audit logs)
  - Database encryption enabled
  - Backups encrypted

---

### Data Protection

- [ ] **Audit Logging**
  - All user management actions logged
  - All role/permission changes logged
  - All login attempts logged (success and failure)
  - All API calls by admin users logged
  - Audit logs cannot be modified or deleted
  - Audit logs include: timestamp, user, action, entity, old/new values, IP, user agent
  - Failed action attempts logged with reason
  - Sensitive data masked in logs (passwords, tokens)

- [ ] **Data Handling**
  - No sensitive data logged
  - No passwords in logs
  - No tokens in logs
  - No payment info in logs
  - No API keys in logs
  - Logs don't expose system information

- [ ] **Backup & Recovery**
  - Encrypted backups taken daily
  - Backups stored off-site
  - Backup restoration tested regularly
  - Backup retention policy defined
  - Point-in-time recovery capability

- [ ] **Data Deletion**
  - Soft delete for user accounts (never hard delete)
  - Historical data retained for compliance
  - User deletion documented in audit log
  - Associated sessions revoked on deletion
  - Audit trail shows who deleted user account

- [ ] **Personally Identifiable Information (PII)**
  - PII not exposed in error messages
  - PII not logged unnecessarily
  - PII encrypted if stored outside main database
  - GDPR compliance (right to be forgotten requires hard delete after audit retention)
  - Data minimization principle applied

---

### Infrastructure Security

- [ ] **Environment Configuration**
  - Secrets in environment variables, not code
  - No secrets in version control
  - .env files in .gitignore
  - Secrets Manager used for production
  - Database connection strings not hardcoded
  - API keys rotated regularly

- [ ] **Database Security**
  - Database user has minimum required privileges
  - Read-only database user for queries
  - Write user for admin operations
  - No admin account used by application
  - Connection pooling configured
  - SQL prepared statements used (prevent SQL injection)
  - Database encryption enabled
  - Database user password changed regularly

- [ ] **Network Security**
  - API behind firewall
  - Database not exposed to internet
  - VPN/bastion host for admin access
  - IP whitelisting for admin panel
  - Rate limiting at load balancer
  - DDoS protection enabled

- [ ] **Server Security**
  - OS patches applied regularly
  - Security updates applied immediately
  - Unnecessary services disabled
  - SSH key-based authentication only
  - No password-based SSH access
  - SSH port changed (non-standard)
  - Firewall configured
  - Fail2ban or similar for intrusion prevention

- [ ] **Container Security** (if using Docker)
  - Base images from trusted registries
  - No secrets in Docker images
  - Run containers as non-root user
  - Read-only root filesystem where possible
  - Resource limits set (memory, CPU)
  - Health checks configured
  - Logging to stdout/stderr

---

### Application Hardening

- [ ] **Error Handling**
  - No stack traces exposed to users
  - Generic error messages for security failures
  - Proper error codes for debugging (request ID)
  - Errors logged server-side for investigation
  - No information leakage through error messages

- [ ] **Dependency Management**
  - Regular dependency updates
  - Security advisory scanning (npm audit, pip safety)
  - No known vulnerabilities in dependencies
  - Automated scanning in CI/CD pipeline
  - Lock files committed to version control

- [ ] **Code Review**
  - All code reviewed before merge
  - Security-focused code review
  - Peer review of authentication code
  - Automated security scanning (SonarQube, OWASP Dependency Check)
  - Manual penetration testing

- [ ] **Logging & Monitoring**
  - Application logs captured
  - Logs sent to centralized logging system
  - Failed login attempts alerted
  - Unusual permission grants alerted
  - Mass user modifications flagged
  - Admin access outside normal hours alerted
  - Long-running or expensive queries monitored

- [ ] **Testing**
  - Unit tests for security logic
  - Integration tests for authentication
  - Penetration testing (internal and external)
  - SQL injection testing
  - XSS testing
  - CSRF testing
  - Authorization bypass testing

---

## RUNTIME SECURITY OPERATIONS

### Daily Tasks

- [ ] Monitor failed login attempts
- [ ] Review new user creations
- [ ] Check for unusual role assignments
- [ ] Review session activity
- [ ] Verify backup completions

### Weekly Tasks

- [ ] Review audit logs for suspicious activity
- [ ] Check for dormant admin accounts
- [ ] Verify security patch status
- [ ] Review access logs
- [ ] Test password reset functionality

### Monthly Tasks

- [ ] Security policy review
- [ ] Access control audit
- [ ] Dependency update review
- [ ] Certificate expiration check
- [ ] Disaster recovery test

### Quarterly Tasks

- [ ] Full security audit
- [ ] Penetration testing
- [ ] Policy updates
- [ ] Team training
- [ ] Compliance review

---

## COMMON SECURITY VULNERABILITIES TO PREVENT

### 1. SQL Injection
```javascript
// ❌ WRONG
const query = `SELECT * FROM users WHERE username = '${username}'`;

// ✅ CORRECT
const query = 'SELECT * FROM users WHERE username = $1';
db.query(query, [username]);
```

### 2. Cross-Site Scripting (XSS)
```jsx
// ❌ WRONG
<div dangerouslySetInnerHTML={{ __html: userInput }} />

// ✅ CORRECT
<div>{userInput}</div>  // React escapes by default
```

### 3. Broken Authentication
```python
# ❌ WRONG
password_hash = md5(password)

# ✅ CORRECT
password_hash = bcrypt.hashpw(password.encode(), bcrypt.gensalt(rounds=12))
```

### 4. Insecure Direct Object References (IDOR)
```javascript
// ❌ WRONG
app.get('/api/users/:id', (req, res) => {
  const user = db.users.find(u => u.id === req.params.id);
  res.json(user);
});

// ✅ CORRECT
app.get('/api/users/:id', authenticate, authorize(['users.read']), (req, res) => {
  if (parseInt(req.params.id) !== req.user.id && !req.user.hasPermission('users.read')) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  const user = db.users.find(u => u.id === req.params.id);
  res.json(user);
});
```

### 5. Sensitive Data Exposure
```python
# ❌ WRONG
response = {
    'user_id': user.id,
    'password_hash': user.password_hash,  # NEVER EXPOSE
    'credit_card': user.credit_card        # NEVER EXPOSE
}

# ✅ CORRECT
response = {
    'user_id': user.id,
    'username': user.username,
    'email': user.email,
    'roles': [r.role_name for r in user.roles]
}
```

### 6. Missing Authorization
```javascript
// ❌ WRONG
app.post('/api/admin/users', authenticate, (req, res) => {
  // Only checks if user is logged in
  const user = User.create(req.body);
  res.json(user);
});

// ✅ CORRECT
app.post('/api/admin/users', authenticate, authorize(['users.create']), (req, res) => {
  // Checks if user has explicit permission
  const user = User.create(req.body);
  res.json(user);
});
```

### 7. Weak Session Management
```javascript
// ❌ WRONG
sessionId = uuid();  // Predictable
sessionExpiry = null;  // Never expires

// ✅ CORRECT
sessionId = crypto.randomBytes(32).toString('hex');
sessionExpiry = Date.now() + (30 * 60 * 1000);  // 30 minutes
```

### 8. Logging Sensitive Data
```python
# ❌ WRONG
logger.info(f"User login: {username}, password: {password}")
logger.error(f"Database error: {connection_string}")

# ✅ CORRECT
logger.info(f"User login attempt: {username}")
logger.error("Database connection failed")  # Don't log connection details
```

---

## SECURITY TESTING CHECKLIST

### Manual Testing

- [ ] Try to create user with blank password
- [ ] Try to create user with weak password
- [ ] Try to login with non-existent user
- [ ] Try to login with wrong password (5+ times)
- [ ] Try to access role management without permission
- [ ] Try to assign yourself a higher role
- [ ] Try to delete Super Admin user
- [ ] Try to modify another user's password
- [ ] Try to access users endpoint without token
- [ ] Try to modify token and use it
- [ ] Try to use expired refresh token
- [ ] Try SQL injection: `' OR '1'='1`
- [ ] Try XSS: `<script>alert('xss')</script>`
- [ ] Try CSRF: Post from different origin
- [ ] Try to access audit logs of other users

### Automated Testing

```python
# Example: Pytest Security Tests
import pytest
from app.security import hash_password

def test_password_not_returned_in_response(client):
    """Ensure password hash not in user response"""
    response = client.get('/api/admin/users/123')
    assert 'password_hash' not in response.json()['data']

def test_failed_login_attempts_locked(client, db):
    """Ensure account locks after 5 failed attempts"""
    for i in range(5):
        client.post('/api/auth/login', json={
            'username': 'testuser',
            'password': 'wrong'
        })
    
    response = client.post('/api/auth/login', json={
        'username': 'testuser',
        'password': 'correct'
    })
    assert response.status_code == 403
    assert 'locked' in response.json()['message'].lower()

def test_permission_required_for_user_creation(client, user_token):
    """Ensure users can't create users without permission"""
    headers = {'Authorization': f'Bearer {user_token}'}
    response = client.post('/api/admin/users', headers=headers, json={
        'username': 'newuser',
        'email': 'new@example.com',
        'password': 'SecurePass123!'
    })
    assert response.status_code == 403

def test_sql_injection_prevented(client):
    """Ensure SQL injection is prevented"""
    response = client.get("/api/admin/users?search=' OR '1'='1")
    # Should not return all users
    assert response.status_code == 200
    # Should be treated as literal string search
```

---

## SECURITY INCIDENT RESPONSE

### If You Detect a Breach

1. **Immediate Actions** (within 1 hour)
   - Revoke all active sessions
   - Force password reset for all users
   - Disable all API keys
   - Enable enhanced logging
   - Notify security team
   - Take database backup
   - Preserve all logs

2. **Investigation** (within 24 hours)
   - Analyze audit logs for unauthorized access
   - Identify compromised accounts
   - Determine affected data
   - Document timeline of breach
   - Identify root cause

3. **Remediation** (within 72 hours)
   - Fix vulnerability
   - Update security policies
   - Patch systems
   - Rotate credentials
   - Update access controls

4. **Communication** (ongoing)
   - Notify affected users
   - Communicate with stakeholders
   - File incident report
   - Coordinate with legal/compliance
   - Public disclosure if required

---

## COMPLIANCE CHECKLIST

### GDPR Compliance

- [ ] Data processing agreement signed
- [ ] Privacy policy updated
- [ ] User consent for data collection
- [ ] Right to be forgotten implemented
- [ ] Data portability implemented
- [ ] Privacy by design implemented
- [ ] Data breach notification procedure (72 hours)
- [ ] DPO appointed (if applicable)
- [ ] Data Protection Impact Assessment

### SOC 2 Type II

- [ ] Access controls documented
- [ ] Change management procedure
- [ ] Incident response plan
- [ ] Security monitoring in place
- [ ] Audit logs retained for 1+ year
- [ ] Encryption for data in transit/at rest
- [ ] Annual security assessment

---

## SECURITY RESOURCES

### Tools for Testing

- **OWASP ZAP**: Web application security scanner
- **Burp Suite**: Penetration testing tool
- **SQLmap**: SQL injection detection
- **npm audit**: Dependency vulnerability scanner
- **pip safety**: Python dependency scanner
- **SonarQube**: Code quality & security
- **Snyk**: Vulnerability management

### Reading Material

- OWASP Top 10: https://owasp.org/www-project-top-ten/
- OWASP Testing Guide: https://owasp.org/www-project-web-security-testing-guide/
- CWE Top 25: https://cwe.mitre.org/top25/
- Security Headers: https://securityheaders.com/
- JWT Best Practices: https://tools.ietf.org/html/rfc8725

---

Remember: **Security is not a feature, it's a requirement.**
