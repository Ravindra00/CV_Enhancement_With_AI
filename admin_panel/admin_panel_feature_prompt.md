# ADMIN PANEL & USER ACCESS CONTROL - FEATURE DEVELOPMENT PROMPT

You are a full-stack developer tasked with building a comprehensive Admin Panel with user management and role-based access control (RBAC) for [APPLICATION_NAME]. This feature should be production-ready and enterprise-grade.

## PROJECT REQUIREMENTS

### PHASE 1: ARCHITECTURE & DATA MODEL

#### 1.1 Database Schema Design
Create database schema with the following tables:

**Users Table**
```
- user_id (Primary Key, UUID)
- username (UNIQUE, NOT NULL)
- email (UNIQUE, NOT NULL)
- password_hash (bcrypt, NOT NULL)
- first_name, last_name
- profile_image_url
- is_active (BOOLEAN, default: true)
- is_deleted (BOOLEAN, soft delete, default: false)
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)
- last_login (TIMESTAMP, nullable)
- created_by (Foreign Key to users)
- updated_by (Foreign Key to users)
- failed_login_attempts (INT, default: 0)
- locked_until (TIMESTAMP, nullable)
```

**Roles Table**
```
- role_id (Primary Key, UUID)
- role_name (UNIQUE, NOT NULL) - e.g., "Super Admin", "Admin", "Manager", "User"
- description (TEXT)
- display_order (INT)
- is_system_role (BOOLEAN) - indicates if role can be deleted
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)
```

**Permissions Table**
```
- permission_id (Primary Key, UUID)
- permission_key (UNIQUE, NOT NULL) - e.g., "user.create", "user.edit", "user.delete"
- permission_name (VARCHAR)
- description (TEXT)
- module (VARCHAR) - e.g., "Users", "Settings", "Reports"
- action (VARCHAR) - e.g., "create", "read", "update", "delete", "export"
- is_system_permission (BOOLEAN)
- created_at (TIMESTAMP)
```

**Role-Permission Mapping Table (Junction)**
```
- role_permission_id (Primary Key, UUID)
- role_id (Foreign Key)
- permission_id (Foreign Key)
- created_at (TIMESTAMP)
- UNIQUE(role_id, permission_id)
```

**User-Role Mapping Table (Many-to-Many)**
```
- user_role_id (Primary Key, UUID)
- user_id (Foreign Key)
- role_id (Foreign Key)
- assigned_at (TIMESTAMP)
- assigned_by (Foreign Key to users)
- expires_at (TIMESTAMP, nullable - for temporary roles)
- UNIQUE(user_id, role_id)
```

**Audit Log Table**
```
- audit_log_id (Primary Key, UUID)
- user_id (Foreign Key, who performed action)
- action (VARCHAR) - e.g., "user_created", "role_assigned", "permission_modified"
- entity_type (VARCHAR) - e.g., "User", "Role", "Permission"
- entity_id (VARCHAR)
- old_values (JSON) - previous state
- new_values (JSON) - new state
- ip_address (VARCHAR)
- user_agent (VARCHAR)
- status (VARCHAR) - "success", "failed"
- error_message (TEXT, nullable)
- created_at (TIMESTAMP)
- INDEX on (user_id, created_at), (entity_type, entity_id)
```

**Access Control List (ACL) Table** (Optional - for fine-grained control)
```
- acl_id (Primary Key, UUID)
- user_id OR role_id (Foreign Key)
- resource_type (VARCHAR) - e.g., "organization", "project", "report"
- resource_id (UUID)
- permission_level (VARCHAR) - "view", "edit", "admin"
- granted_at (TIMESTAMP)
- granted_by (Foreign Key to users)
- expires_at (TIMESTAMP, nullable)
```

**Session Management Table**
```
- session_id (Primary Key, UUID)
- user_id (Foreign Key)
- token_hash (VARCHAR)
- ip_address (VARCHAR)
- user_agent (VARCHAR)
- created_at (TIMESTAMP)
- expires_at (TIMESTAMP)
- last_activity (TIMESTAMP)
- device_name (VARCHAR, nullable)
- is_active (BOOLEAN, default: true)
```

### PHASE 2: AUTHENTICATION & AUTHORIZATION

#### 2.1 Authentication Implementation
- **Password Security**:
  - Minimum 12 characters, complexity requirements (uppercase, lowercase, number, special char)
  - Bcrypt hashing with salt rounds = 12
  - Password history (prevent reusing last 5 passwords)
  - Password expiration policy (every 90 days)
  - Password reset via secure email token (valid for 24 hours)
  
- **Session Management**:
  - JWT tokens (30-minute expiration for access, 7-day refresh)
  - Secure HTTP-only, SameSite=Strict cookies
  - Session revocation on logout
  - Multi-session support (track multiple concurrent sessions)
  - Session timeout for inactive users (15 minutes)
  
- **Multi-Factor Authentication (MFA)** (Optional but recommended):
  - TOTP (Time-based One-Time Password) via authenticator app
  - Email/SMS verification option
  - Backup codes generation
  
- **Account Security**:
  - Account lockout after 5 failed login attempts (30-minute lock)
  - Rate limiting on login endpoint (5 attempts per IP per minute)
  - IP whitelist/blacklist functionality
  - Login notifications via email
  - Suspicious activity detection

#### 2.2 Authorization & RBAC
- **Role-Based Access Control**:
  - Default roles: Super Admin, Admin, Manager, User
  - Permissions granted via roles, not directly to users
  - Users can have multiple roles
  - Temporary role assignments with expiration
  - Role inheritance model (optional, e.g., Admin includes Manager permissions)
  
- **Permission Levels**:
  - Use granular permission keys: `module.action` (e.g., "users.create", "users.delete")
  - Standard CRUD permissions: create, read, update, delete
  - Custom permissions: export, approve, publish, archive
  
- **Resource-Level ACL** (if needed):
  - Fine-grained control per resource (e.g., Project A vs Project B)
  - Ownership-based permissions (users can manage own resources)
  - Organization/Tenant isolation

### PHASE 3: ADMIN PANEL - BACKEND API ENDPOINTS

#### 3.1 User Management Endpoints
```
GET    /api/admin/users
  - Query params: page, limit, search, role, status (active/inactive/deleted)
  - Response: paginated list with total count
  - Required permission: users.read

POST   /api/admin/users
  - Body: { username, email, first_name, last_name, password, role_ids }
  - Response: created user object
  - Required permission: users.create
  - Validation: unique email, strong password, role existence

GET    /api/admin/users/{user_id}
  - Response: user details + roles + permissions + session history
  - Required permission: users.read

PUT    /api/admin/users/{user_id}
  - Body: { email, first_name, last_name, is_active }
  - Cannot edit password via this endpoint
  - Response: updated user object
  - Required permission: users.update
  - Audit log: track changes

DELETE /api/admin/users/{user_id}
  - Soft delete only (is_deleted = true)
  - Revoke all sessions immediately
  - Response: { success, message }
  - Required permission: users.delete
  - Audit log: log deletion with reason

POST   /api/admin/users/{user_id}/reset-password
  - Generate temporary password or password reset link
  - Send via email
  - Response: { reset_token, expires_in }
  - Required permission: users.update

POST   /api/admin/users/{user_id}/unlock
  - Unlock account after failed login attempts
  - Response: { success }
  - Required permission: users.update

GET    /api/admin/users/{user_id}/sessions
  - List active sessions
  - Response: [{ session_id, device, ip_address, last_activity, created_at }]
  - Required permission: users.read

DELETE /api/admin/users/{user_id}/sessions/{session_id}
  - Revoke specific session
  - Required permission: users.update

POST   /api/admin/users/{user_id}/roles
  - Body: { role_id, expires_at (optional) }
  - Assign role to user
  - Response: { success, user_roles }
  - Required permission: roles.assign

DELETE /api/admin/users/{user_id}/roles/{role_id}
  - Remove role from user
  - Response: { success }
  - Required permission: roles.assign
```

#### 3.2 Role Management Endpoints
```
GET    /api/admin/roles
  - Query params: page, limit, search
  - Response: list of roles with permission count
  - Required permission: roles.read

POST   /api/admin/roles
  - Body: { role_name, description, display_order }
  - Cannot create system roles via API
  - Response: created role object
  - Required permission: roles.create

GET    /api/admin/roles/{role_id}
  - Response: role + associated permissions + users count
  - Required permission: roles.read

PUT    /api/admin/roles/{role_id}
  - Body: { role_name, description, display_order }
  - Cannot modify system roles
  - Response: updated role object
  - Required permission: roles.update

DELETE /api/admin/roles/{role_id}
  - Only if no users assigned to this role
  - Cannot delete system roles
  - Response: { success, message }
  - Required permission: roles.delete

POST   /api/admin/roles/{role_id}/permissions
  - Body: { permission_ids: [id1, id2, ...] }
  - Replace all permissions for role
  - Response: { success, role_permissions }
  - Required permission: roles.update
  - Audit log: record permission changes

GET    /api/admin/roles/{role_id}/users
  - List all users with this role
  - Query params: page, limit
  - Response: paginated user list
  - Required permission: roles.read
```

#### 3.3 Permission Management Endpoints
```
GET    /api/admin/permissions
  - Query params: module, action
  - Response: list of all available permissions grouped by module
  - Required permission: permissions.read

GET    /api/admin/permissions/module-structure
  - Response: hierarchical list of modules with their actions
  - Example: { modules: [{ name: "Users", actions: ["create", "read", "update", "delete"] }] }
  - Required permission: permissions.read
```

#### 3.4 Audit Log Endpoints
```
GET    /api/admin/audit-logs
  - Query params: page, limit, user_id, action, entity_type, date_from, date_to
  - Response: paginated audit log entries
  - Required permission: audit.read

GET    /api/admin/audit-logs/export
  - Query params: format (csv, json, xlsx), filters
  - Response: file download
  - Required permission: audit.export

GET    /api/admin/audit-logs/{entity_type}/{entity_id}
  - Get all changes for specific entity
  - Response: chronological list of changes
  - Required permission: audit.read

GET    /api/admin/activity-report
  - Daily/weekly/monthly activity statistics
  - Query params: period (day/week/month), metric (logins, failed_logins, user_changes)
  - Response: { period, statistics: [...] }
  - Required permission: audit.read
```

#### 3.5 Dashboard & Analytics Endpoints
```
GET    /api/admin/dashboard/stats
  - Response: {
      total_users, 
      active_users, 
      deleted_users,
      roles_count,
      failed_login_attempts_24h,
      new_users_this_month,
      active_sessions_count
    }
  - Required permission: dashboard.view

GET    /api/admin/dashboard/recent-activity
  - Response: last 20 audit log entries
  - Required permission: dashboard.view

GET    /api/admin/dashboard/user-activity-heatmap
  - Response: login activity by hour/day
  - Required permission: dashboard.view
```

### PHASE 4: ADMIN PANEL - FRONTEND INTERFACE

#### 4.1 Dashboard
- **Widgets**:
  - Total users (with growth indicator)
  - Active users (online now)
  - Failed login attempts (last 24h, with alert if abnormal)
  - Roles overview
  - Recent user activity (table)
  - Login attempts graph (last 7 days)
  - User creation trend (graph)

#### 4.2 User Management Page
- **List View**:
  - Sortable, filterable table: username, email, roles, last login, status, actions
  - Bulk actions: assign role, deactivate, delete
  - Search by username/email/phone
  - Filter by: role, status (active/inactive/deleted), date range
  - Pagination with customizable page size
  
- **User Detail View**:
  - User information card (editable)
  - Active sessions list with revoke option
  - Assigned roles (with expiration indicator)
  - User permissions (read-only, inherited from roles)
  - Activity timeline (login history, changes made)
  - Action buttons: edit, reset password, assign roles, deactivate, delete
  
- **Create/Edit User Modal**:
  - Form fields: username, email, first name, last name, password (create only)
  - Password strength indicator
  - Role assignment (multi-select with expiration)
  - Confirmation before save

#### 4.3 Role Management Page
- **List View**:
  - Table: role name, description, users count, permissions count, actions
  - Filter: system roles / custom roles
  - Create role button
  
- **Role Detail/Edit View**:
  - Role name, description, display order
  - Permission picker (grouped by module)
  - Assigned users list
  - Delete button (only if no users)
  - Audit trail showing permission changes

#### 4.4 Permissions Reference
- **Module-based View**:
  - Grouped display: Users module, Settings module, etc.
  - Each module shows available permissions
  - Search functionality
  - Used in role assignment interface

#### 4.5 Audit Log Viewer
- **Table with**:
  - Timestamp, user (who performed action), action, entity type, entity, old value → new value
  - Expandable rows showing full JSON diff
  - Filters: date range, action type, user, entity type
  - Export button (CSV, JSON, Excel)
  - Search in changes

#### 4.6 Security & Settings
- **Login Security Settings** (for Super Admin):
  - Session timeout duration
  - Failed login attempt threshold
  - Lockout duration
  - Password policy settings
  - IP whitelist/blacklist
  
- **MFA Management** (if implemented):
  - Enable/disable MFA requirement
  - View users with MFA enabled
  - Force MFA for admin users

### PHASE 5: SECURITY REQUIREMENTS

#### 5.1 API Security
- **Authentication**:
  - All endpoints require JWT token in Authorization header
  - Token refresh before expiration
  - Blacklist tokens on logout
  
- **Authorization**:
  - Permission check on every endpoint
  - Middleware to verify permissions
  - Deny by default (explicitly grant permissions)
  
- **Input Validation**:
  - Sanitize all inputs (prevent SQL injection, XSS)
  - Validate email format, username format, password strength
  - Max length limits on text fields
  - Type validation for all request bodies
  
- **Rate Limiting**:
  - Login endpoint: 5 attempts per IP per 15 minutes
  - API endpoints: 100 requests per user per minute
  - Return 429 (Too Many Requests) when exceeded
  
- **CORS**:
  - Whitelist allowed origins
  - Restrict to POST, GET, PUT, DELETE
  - No wildcard allowed
  
- **HTTPS Only**:
  - Redirect HTTP to HTTPS
  - HSTS header enabled
  - Secure flag on cookies

#### 5.2 Data Protection
- **Encryption**:
  - Password hashing with Bcrypt (salt rounds 12)
  - Encrypt sensitive fields in audit logs
  - TLS 1.2+ for all data in transit
  
- **Audit Logging**:
  - Log all user management actions
  - Log all role/permission changes
  - Log all login attempts (success and failure)
  - Log IP address and user agent
  - Cannot be modified or deleted
  
- **Soft Deletes**:
  - Never hard delete user accounts
  - Mark as deleted, keep audit trail
  - Cannot reassign deleted users' roles

#### 5.3 Admin-Specific Security
- **Super Admin Protection**:
  - Require MFA for Super Admin accounts
  - Require current password to make changes
  - Log all Super Admin actions in detail
  
- **Role-Based Restrictions**:
  - Admins cannot grant themselves higher permissions
  - Admins cannot modify other Super Admin accounts
  - Admins cannot delete system roles

### PHASE 6: ERROR HANDLING & VALIDATION

#### 6.1 API Response Format
```json
{
  "success": true/false,
  "message": "descriptive message",
  "data": { /* response payload */ },
  "errors": [
    { "field": "email", "message": "Email already exists" }
  ],
  "timestamp": "2024-01-15T10:30:00Z",
  "request_id": "uuid"
}
```

#### 6.2 HTTP Status Codes
- 200 OK - Successful request
- 201 Created - Resource created
- 204 No Content - Successful deletion
- 400 Bad Request - Validation error
- 401 Unauthorized - Missing/invalid token
- 403 Forbidden - Insufficient permissions
- 404 Not Found - Resource not found
- 409 Conflict - Duplicate resource (email exists)
- 422 Unprocessable Entity - Validation error
- 429 Too Many Requests - Rate limit exceeded
- 500 Internal Server Error - Unexpected error

#### 6.3 Validation Rules
- **Username**: 3-30 chars, alphanumeric + underscore, unique
- **Email**: valid format, unique, lowercase stored
- **Password**: min 12 chars, must contain uppercase, lowercase, number, special character
- **Role Name**: 2-50 chars, unique
- **User must have at least one role**

### PHASE 7: TESTING & DEPLOYMENT

#### 7.1 Unit Tests
- Permission checking logic
- Role assignment/removal
- Password hashing and validation
- Token generation and validation
- Audit log creation

#### 7.2 Integration Tests
- User creation workflow (with role assignment)
- Role permission updates and user effect
- Session management
- Login attempts and account lockout
- Audit log verification

#### 7.3 Security Tests
- SQL injection attempts
- XSS injection attempts
- CSRF attacks
- Unauthorized access attempts
- Rate limiting effectiveness
- Session hijacking prevention

#### 7.4 Performance Tests
- Admin dashboard load with 10k+ users
- Role assignment to 1000+ users
- Audit log query performance (large dataset)
- Concurrent session handling

### PHASE 8: DELIVERABLES

Provide the following:

1. **Database Migration Scripts**
   - Schema creation SQL
   - Initial seed data (default roles, permissions)
   - Migration up/down scripts

2. **Backend Code**
   - REST API endpoints (all listed above)
   - Database models/ORM
   - Authentication middleware
   - Authorization middleware
   - Validation schemas
   - Error handling
   - Unit tests
   - Integration tests

3. **Frontend Code**
   - All dashboard pages (React/Vue/Angular)
   - Components (forms, tables, modals)
   - API client code
   - Authentication handling
   - Role-based UI rendering
   - Responsive design (mobile, tablet, desktop)
   - Unit tests

4. **Documentation**
   - API documentation (OpenAPI/Swagger spec)
   - Database schema diagram (ERD)
   - Architecture diagram
   - Deployment guide
   - Configuration guide
   - User manual for admin panel
   - Security best practices guide

5. **Configuration Files**
   - Environment variables template (.env.example)
   - Docker setup (Dockerfile, docker-compose.yml)
   - CI/CD pipeline configuration

### PHASE 9: OPTIONAL ENHANCEMENTS

- **Department/Team Management**: Organize users into teams
- **Approval Workflows**: Require approval for certain actions
- **User Impersonation**: Super Admin can impersonate users (with logging)
- **Two-Way Sync**: Sync with LDAP/Active Directory
- **IP-Based Access Control**: Restrict admin panel access by IP
- **Device Management**: Track and manage trusted devices
- **Mobile App**: Companion mobile app for user management on-the-go
- **API Key Management**: Generate API keys for service accounts
- **Webhooks**: Trigger webhooks on user/role changes

---

## IMPLEMENTATION NOTES

**Technology Stack** (specify your choice):
- Backend: [Node.js/Python/C#/.NET/Java]
- Database: [PostgreSQL/MySQL/MongoDB/SQL Server]
- Frontend: [React/Vue/Angular]
- Authentication: [JWT/OAuth2/OpenID Connect]

**Security Standards**:
- OWASP Top 10 compliance
- CWE (Common Weakness Enumeration) best practices
- Follow language-specific security guidelines

**Performance Targets**:
- User list load: < 500ms for 10,000 users
- Role assignment: < 200ms
- Audit log query: < 1s for 1-year dataset

**Code Quality**:
- 80%+ test coverage
- Linting and code formatting enforced
- No hardcoded secrets
- No console.log/print statements in production code

---

## OUTPUT CHECKLIST

Ensure all of the following are completed:

- [ ] Database schema created and migrated
- [ ] All API endpoints implemented and documented
- [ ] Authentication & authorization working
- [ ] Admin dashboard displaying correctly
- [ ] User CRUD operations tested
- [ ] Role assignment tested
- [ ] Audit logging working
- [ ] Error handling for all scenarios
- [ ] Input validation on all forms
- [ ] Rate limiting implemented
- [ ] Tests written and passing (80%+ coverage)
- [ ] Documentation complete
- [ ] Security review passed
- [ ] Performance benchmarks met
- [ ] Deployment guide provided
- [ ] Backup/recovery procedures documented
