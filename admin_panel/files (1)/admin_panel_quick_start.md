# ADMIN PANEL - QUICK START TEMPLATES

## Tech Stack Examples & Getting Started

Use this document alongside the main admin panel prompt. Choose your stack and use the examples below to accelerate implementation.

---

## 1. PYTHON + FASTAPI + PostgreSQL + React

### Backend Structure
```
backend/
├── app/
│   ├── __init__.py
│   ├── main.py                 # FastAPI app
│   ├── config.py               # Settings & env vars
│   ├── database.py             # SQLAlchemy setup
│   ├── security.py             # JWT, bcrypt, permissions
│   ├── models/                 # ORM models
│   │   ├── user.py
│   │   ├── role.py
│   │   ├── permission.py
│   │   └── audit_log.py
│   ├── schemas/                # Pydantic schemas
│   │   ├── user.py
│   │   ├── role.py
│   │   └── permission.py
│   ├── api/
│   │   ├── __init__.py
│   │   ├── routes/
│   │   │   ├── auth.py         # Login, token refresh
│   │   │   ├── users.py        # User CRUD
│   │   │   ├── roles.py        # Role CRUD
│   │   │   ├── permissions.py  # Permission endpoints
│   │   │   └── audit.py        # Audit log endpoints
│   │   └── dependencies.py     # Auth middleware
│   └── utils/
│       ├── validators.py
│       ├── email.py
│       └── helpers.py
├── migrations/                 # Alembic migrations
├── tests/
│   ├── test_auth.py
│   ├── test_users.py
│   ├── test_roles.py
│   └── conftest.py
├── requirements.txt
├── docker-compose.yml
└── .env.example
```

### Key Dependencies
```
fastapi==0.104.0
sqlalchemy==2.0.0
psycopg2-binary==2.9.0
pydantic==2.0.0
python-jose[cryptography]==3.3.0
passlib[bcrypt]==1.7.4
pydantic-settings==2.0.0
alembic==1.12.0
python-multipart==0.0.6
pytest==7.4.0
pytest-asyncio==0.21.0
```

### Example: User Model (SQLAlchemy)
```python
# app/models/user.py
from sqlalchemy import Column, String, Boolean, DateTime, ForeignKey, Table, Integer
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import UUID
from datetime import datetime
import uuid
from app.database import Base
from app.security import hash_password

user_roles = Table(
    'user_roles',
    Base.metadata,
    Column('user_id', UUID(as_uuid=True), ForeignKey('users.user_id')),
    Column('role_id', UUID(as_uuid=True), ForeignKey('roles.role_id')),
    Column('assigned_at', DateTime, default=datetime.utcnow),
    Column('assigned_by', UUID(as_uuid=True), ForeignKey('users.user_id')),
    Column('expires_at', DateTime, nullable=True)
)

class User(Base):
    __tablename__ = 'users'
    
    user_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    username = Column(String(255), unique=True, nullable=False, index=True)
    email = Column(String(255), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    first_name = Column(String(255), nullable=True)
    last_name = Column(String(255), nullable=True)
    profile_image_url = Column(String(500), nullable=True)
    is_active = Column(Boolean, default=True, index=True)
    is_deleted = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    last_login = Column(DateTime, nullable=True)
    created_by = Column(UUID(as_uuid=True), ForeignKey('users.user_id'), nullable=True)
    updated_by = Column(UUID(as_uuid=True), ForeignKey('users.user_id'), nullable=True)
    failed_login_attempts = Column(Integer, default=0)
    locked_until = Column(DateTime, nullable=True)
    
    # Relationships
    roles = relationship(
        'Role',
        secondary=user_roles,
        back_populates='users',
        lazy='selectin'
    )
    sessions = relationship('Session', back_populates='user', cascade='all, delete-orphan')
    audit_logs = relationship('AuditLog', back_populates='user')
    
    def set_password(self, password: str):
        self.password_hash = hash_password(password)
    
    def verify_password(self, password: str) -> bool:
        from passlib.context import CryptContext
        pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
        return pwd_context.verify(password, self.password_hash)
    
    def has_permission(self, permission_key: str) -> bool:
        """Check if user has permission through any of their roles"""
        for role in self.roles:
            for permission in role.permissions:
                if permission.permission_key == permission_key:
                    return True
        return False
    
    def get_permissions(self) -> set:
        """Get all permissions from all roles"""
        permissions = set()
        for role in self.roles:
            for permission in role.permissions:
                permissions.add(permission.permission_key)
        return permissions
```

### Example: Authentication Endpoint
```python
# app/api/routes/auth.py
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from app.schemas.user import LoginRequest, LoginResponse
from app.models.user import User
from app.database import get_db
from app.security import create_access_token, create_refresh_token, verify_password

router = APIRouter(prefix="/api/auth", tags=["auth"])

@router.post("/login", response_model=LoginResponse)
async def login(
    credentials: LoginRequest,
    db: Session = Depends(get_db)
):
    """User login endpoint"""
    # Find user by username or email
    user = db.query(User).filter(
        (User.username == credentials.username) | 
        (User.email == credentials.username)
    ).first()
    
    if not user:
        # Log failed attempt
        log_failed_login(db, credentials.username, "user_not_found")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials"
        )
    
    # Check if account is locked
    if user.locked_until and user.locked_until > datetime.utcnow():
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is locked. Try again later."
        )
    
    # Verify password
    if not user.verify_password(credentials.password):
        user.failed_login_attempts += 1
        
        # Lock account after 5 failed attempts
        if user.failed_login_attempts >= 5:
            user.locked_until = datetime.utcnow() + timedelta(minutes=30)
            log_account_locked(db, user.user_id)
        
        db.add(user)
        db.commit()
        log_failed_login(db, user.username, "invalid_password")
        
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials"
        )
    
    # Check if user is active
    if not user.is_active or user.is_deleted:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is inactive"
        )
    
    # Reset failed attempts and update last login
    user.failed_login_attempts = 0
    user.locked_until = None
    user.last_login = datetime.utcnow()
    db.add(user)
    db.commit()
    
    # Create tokens
    access_token = create_access_token(
        data={"sub": str(user.user_id), "username": user.username}
    )
    refresh_token = create_refresh_token(
        data={"sub": str(user.user_id)}
    )
    
    return LoginResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        user_id=user.user_id,
        username=user.username,
        email=user.email
    )

def log_failed_login(db: Session, username: str, reason: str):
    """Log failed login attempt"""
    # Implement audit logging
    pass

def log_account_locked(db: Session, user_id: uuid.UUID):
    """Log account lockout"""
    pass
```

---

## 2. NODE.JS + EXPRESS + PostgreSQL + React

### Backend Structure
```
backend/
├── src/
│   ├── index.js                # Express app entry
│   ├── config/
│   │   ├── database.js         # PostgreSQL connection
│   │   ├── env.js              # Environment variables
│   │   └── constants.js        # App constants
│   ├── models/                 # Sequelize ORM models
│   │   ├── User.js
│   │   ├── Role.js
│   │   ├── Permission.js
│   │   └── AuditLog.js
│   ├── routes/
│   │   ├── auth.js             # Auth routes
│   │   ├── users.js            # User CRUD routes
│   │   ├── roles.js            # Role CRUD routes
│   │   ├── permissions.js      # Permission routes
│   │   └── audit.js            # Audit log routes
│   ├── controllers/
│   │   ├── authController.js
│   │   ├── userController.js
│   │   ├── roleController.js
│   │   └── auditController.js
│   ├── middleware/
│   │   ├── auth.js             # JWT verification
│   │   ├── authorize.js        # Permission check
│   │   ├── errorHandler.js
│   │   └── validators.js
│   ├── services/
│   │   ├── userService.js
│   │   ├── roleService.js
│   │   ├── authService.js
│   │   └── auditService.js
│   └── utils/
│       ├── jwt.js
│       ├── password.js
│       ├── logger.js
│       └── validators.js
├── migrations/                 # Sequelize migrations
├── seeders/                    # Database seeds
├── tests/
├── .env.example
├── package.json
└── docker-compose.yml
```

### Key Dependencies
```json
{
  "dependencies": {
    "express": "^4.18.0",
    "sequelize": "^6.35.0",
    "pg": "^8.11.0",
    "jsonwebtoken": "^9.1.0",
    "bcryptjs": "^2.4.3",
    "express-validator": "^7.0.0",
    "dotenv": "^16.3.0",
    "cors": "^2.8.5",
    "helmet": "^7.1.0",
    "morgan": "^1.10.0",
    "joi": "^17.11.0"
  },
  "devDependencies": {
    "jest": "^29.7.0",
    "supertest": "^6.3.0",
    "nodemon": "^3.0.0"
  }
}
```

### Example: Express App Setup
```javascript
// src/index.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const db = require('./config/database');

const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const roleRoutes = require('./routes/roles');
const permissionRoutes = require('./routes/permissions');
const auditRoutes = require('./routes/audit');

const { errorHandler } = require('./middleware/errorHandler');

const app = express();

// Middleware
app.use(helmet());
app.use(cors());
app.use(morgan('combined'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/admin/users', userRoutes);
app.use('/api/admin/roles', roleRoutes);
app.use('/api/admin/permissions', permissionRoutes);
app.use('/api/admin/audit-logs', auditRoutes);

// Error handling
app.use(errorHandler);

// Database sync and start server
const PORT = process.env.PORT || 3000;

db.sync().then(() => {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}).catch(err => {
  console.error('Database connection error:', err);
  process.exit(1);
});

module.exports = app;
```

### Example: User Controller
```javascript
// src/controllers/userController.js
const { User, Role, AuditLog } = require('../models');
const userService = require('../services/userService');
const auditService = require('../services/auditService');
const { AppError } = require('../utils/errors');

exports.getAllUsers = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, search, role, status } = req.query;
    
    const users = await userService.getUsers({
      page: parseInt(page),
      limit: parseInt(limit),
      search,
      role,
      status
    });
    
    res.json({
      success: true,
      data: users.data,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: users.total,
        pages: Math.ceil(users.total / limit)
      }
    });
  } catch (error) {
    next(error);
  }
};

exports.getUserById = async (req, res, next) => {
  try {
    const { userId } = req.params;
    
    const user = await User.findByPk(userId, {
      include: [
        {
          model: Role,
          attributes: ['role_id', 'role_name', 'description'],
          through: { attributes: ['assigned_at', 'expires_at'] }
        }
      ]
    });
    
    if (!user) {
      throw new AppError('User not found', 404);
    }
    
    // Get user permissions from roles
    const permissions = await userService.getUserPermissions(userId);
    
    res.json({
      success: true,
      data: {
        ...user.toJSON(),
        permissions
      }
    });
  } catch (error) {
    next(error);
  }
};

exports.createUser = async (req, res, next) => {
  try {
    const { username, email, password, first_name, last_name, role_ids } = req.body;
    
    // Check if user exists
    const existingUser = await User.findOne({
      where: { [Op.or]: [{ username }, { email }] }
    });
    
    if (existingUser) {
      throw new AppError('Username or email already exists', 409);
    }
    
    // Create user
    const user = await User.create({
      username,
      email,
      password_hash: await hashPassword(password),
      first_name,
      last_name,
      created_by: req.user.id
    });
    
    // Assign roles
    if (role_ids && role_ids.length > 0) {
      await user.setRoles(role_ids, {
        through: {
          assigned_by: req.user.id,
          assigned_at: new Date()
        }
      });
    }
    
    // Audit log
    await auditService.log({
      user_id: req.user.id,
      action: 'user_created',
      entity_type: 'User',
      entity_id: user.user_id,
      new_values: user.toJSON(),
      ip_address: req.ip,
      user_agent: req.headers['user-agent']
    });
    
    res.status(201).json({
      success: true,
      message: 'User created successfully',
      data: user
    });
  } catch (error) {
    next(error);
  }
};

exports.updateUser = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const { email, first_name, last_name, is_active } = req.body;
    
    const user = await User.findByPk(userId);
    if (!user) {
      throw new AppError('User not found', 404);
    }
    
    const oldValues = user.toJSON();
    
    await user.update({
      email,
      first_name,
      last_name,
      is_active,
      updated_by: req.user.id
    });
    
    // Audit log
    await auditService.log({
      user_id: req.user.id,
      action: 'user_updated',
      entity_type: 'User',
      entity_id: user.user_id,
      old_values: oldValues,
      new_values: user.toJSON(),
      ip_address: req.ip,
      user_agent: req.headers['user-agent']
    });
    
    res.json({
      success: true,
      message: 'User updated successfully',
      data: user
    });
  } catch (error) {
    next(error);
  }
};

exports.deleteUser = async (req, res, next) => {
  try {
    const { userId } = req.params;
    
    const user = await User.findByPk(userId);
    if (!user) {
      throw new AppError('User not found', 404);
    }
    
    // Soft delete
    await user.update({
      is_deleted: true,
      updated_by: req.user.id
    });
    
    // Revoke all sessions
    await Session.destroy({ where: { user_id: userId } });
    
    // Audit log
    await auditService.log({
      user_id: req.user.id,
      action: 'user_deleted',
      entity_type: 'User',
      entity_id: user.user_id,
      old_values: user.toJSON(),
      ip_address: req.ip,
      user_agent: req.headers['user-agent']
    });
    
    res.json({
      success: true,
      message: 'User deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};
```

---

## 3. REACT FRONTEND - Key Components

### Component Structure
```
src/
├── components/
│   ├── admin/
│   │   ├── Dashboard.jsx
│   │   ├── UserManagement/
│   │   │   ├── UserList.jsx
│   │   │   ├── UserDetail.jsx
│   │   │   ├── UserForm.jsx
│   │   │   └── UserRoleAssignment.jsx
│   │   ├── RoleManagement/
│   │   │   ├── RoleList.jsx
│   │   │   ├── RoleDetail.jsx
│   │   │   ├── RoleForm.jsx
│   │   │   └── PermissionPicker.jsx
│   │   ├── AuditLog/
│   │   │   ├── AuditLogViewer.jsx
│   │   │   └── AuditLogFilters.jsx
│   │   └── SecuritySettings.jsx
│   ├── common/
│   │   ├── Table.jsx
│   │   ├── Modal.jsx
│   │   ├── Form.jsx
│   │   ├── ConfirmDialog.jsx
│   │   └── Pagination.jsx
│   ├── auth/
│   │   ├── Login.jsx
│   │   ├── PrivateRoute.jsx
│   │   └── PermissionGate.jsx
│   └── layout/
│       ├── AdminLayout.jsx
│       ├── Sidebar.jsx
│       └── Header.jsx
├── services/
│   ├── api.js
│   ├── authService.js
│   ├── userService.js
│   ├── roleService.js
│   └── auditService.js
├── hooks/
│   ├── useAuth.js
│   ├── useUser.js
│   ├── useRole.js
│   └── useAudit.js
├── context/
│   ├── AuthContext.jsx
│   └── PermissionContext.jsx
├── utils/
│   ├── validators.js
│   ├── formatters.js
│   └── constants.js
└── styles/
    └── admin.css
```

### Example: User List Component (React)
```jsx
// src/components/admin/UserManagement/UserList.jsx
import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../hooks/useAuth';
import userService from '../../../services/userService';
import Table from '../../common/Table';
import Modal from '../../common/Modal';
import UserForm from './UserForm';
import UserRoleAssignment from './UserRoleAssignment';
import './UserManagement.css';

const UserList = () => {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0
  });
  const [filters, setFilters] = useState({
    search: '',
    role: '',
    status: 'active'
  });
  const [selectedUser, setSelectedUser] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState('view'); // view, edit, create, roles

  useEffect(() => {
    fetchUsers();
  }, [pagination.page, filters]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await userService.getUsers({
        page: pagination.page,
        limit: pagination.limit,
        ...filters
      });
      setUsers(response.data);
      setPagination(prev => ({
        ...prev,
        total: response.pagination.total
      }));
    } catch (error) {
      console.error('Failed to fetch users:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = () => {
    setSelectedUser(null);
    setModalMode('create');
    setShowModal(true);
  };

  const handleEditUser = (user) => {
    setSelectedUser(user);
    setModalMode('edit');
    setShowModal(true);
  };

  const handleAssignRoles = (user) => {
    setSelectedUser(user);
    setModalMode('roles');
    setShowModal(true);
  };

  const handleViewUser = (user) => {
    setSelectedUser(user);
    setModalMode('view');
    setShowModal(true);
  };

  const handleDeleteUser = async (userId) => {
    if (window.confirm('Are you sure you want to delete this user?')) {
      try {
        await userService.deleteUser(userId);
        setUsers(users.filter(u => u.user_id !== userId));
      } catch (error) {
        console.error('Failed to delete user:', error);
      }
    }
  };

  const handleSaveUser = async (userData) => {
    try {
      if (modalMode === 'create') {
        const newUser = await userService.createUser(userData);
        setUsers([...users, newUser]);
      } else if (modalMode === 'edit') {
        const updatedUser = await userService.updateUser(selectedUser.user_id, userData);
        setUsers(users.map(u => u.user_id === updatedUser.user_id ? updatedUser : u));
      }
      setShowModal(false);
    } catch (error) {
      console.error('Failed to save user:', error);
    }
  };

  const columns = [
    {
      key: 'username',
      label: 'Username',
      sortable: true,
      render: (value, row) => (
        <button onClick={() => handleViewUser(row)} className="link-btn">
          {value}
        </button>
      )
    },
    {
      key: 'email',
      label: 'Email',
      sortable: true
    },
    {
      key: 'roles',
      label: 'Roles',
      render: (value) => value.map(r => r.role_name).join(', ')
    },
    {
      key: 'is_active',
      label: 'Status',
      render: (value) => (
        <span className={`badge ${value ? 'active' : 'inactive'}`}>
          {value ? 'Active' : 'Inactive'}
        </span>
      )
    },
    {
      key: 'last_login',
      label: 'Last Login',
      render: (value) => value ? new Date(value).toLocaleString() : 'Never'
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (_, row) => (
        <div className="action-buttons">
          <button onClick={() => handleEditUser(row)} className="btn-sm">Edit</button>
          <button onClick={() => handleAssignRoles(row)} className="btn-sm">Roles</button>
          {currentUser.id !== row.user_id && (
            <button onClick={() => handleDeleteUser(row.user_id)} className="btn-sm btn-danger">
              Delete
            </button>
          )}
        </div>
      )
    }
  ];

  return (
    <div className="user-management">
      <div className="header">
        <h1>User Management</h1>
        <button onClick={handleCreateUser} className="btn btn-primary">
          + Create User
        </button>
      </div>

      <div className="filters">
        <input
          type="text"
          placeholder="Search users..."
          value={filters.search}
          onChange={(e) => setFilters({...filters, search: e.target.value})}
        />
        <select
          value={filters.status}
          onChange={(e) => setFilters({...filters, status: e.target.value})}
        >
          <option value="">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
          <option value="deleted">Deleted</option>
        </select>
      </div>

      <Table
        columns={columns}
        data={users}
        loading={loading}
        pagination={pagination}
        onPageChange={(page) => setPagination({...pagination, page})}
      />

      <Modal isOpen={showModal} onClose={() => setShowModal(false)}>
        {modalMode === 'create' && (
          <UserForm onSave={handleSaveUser} onCancel={() => setShowModal(false)} />
        )}
        {modalMode === 'edit' && (
          <UserForm
            user={selectedUser}
            onSave={handleSaveUser}
            onCancel={() => setShowModal(false)}
          />
        )}
        {modalMode === 'roles' && (
          <UserRoleAssignment
            user={selectedUser}
            onSave={(roles) => {
              setUsers(users.map(u =>
                u.user_id === selectedUser.user_id
                  ? {...u, roles}
                  : u
              ));
              setShowModal(false);
            }}
            onCancel={() => setShowModal(false)}
          />
        )}
        {modalMode === 'view' && (
          <div className="user-detail-view">
            <h2>{selectedUser?.username}</h2>
            <p>Email: {selectedUser?.email}</p>
            <p>Name: {selectedUser?.first_name} {selectedUser?.last_name}</p>
            <p>Status: {selectedUser?.is_active ? 'Active' : 'Inactive'}</p>
            <p>Roles: {selectedUser?.roles.map(r => r.role_name).join(', ')}</p>
            <button onClick={() => handleEditUser(selectedUser)} className="btn">
              Edit User
            </button>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default UserList;
```

---

## 4. DATABASE MIGRATION EXAMPLES

### PostgreSQL (Alembic for Python)
```python
# migrations/versions/001_create_users_table.py
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID
import uuid

def upgrade():
    op.create_table(
        'users',
        sa.Column('user_id', UUID(as_uuid=True), primary_key=True, default=uuid.uuid4),
        sa.Column('username', sa.String(255), unique=True, nullable=False),
        sa.Column('email', sa.String(255), unique=True, nullable=False),
        sa.Column('password_hash', sa.String(255), nullable=False),
        sa.Column('first_name', sa.String(255), nullable=True),
        sa.Column('last_name', sa.String(255), nullable=True),
        sa.Column('is_active', sa.Boolean, default=True),
        sa.Column('is_deleted', sa.Boolean, default=False),
        sa.Column('created_at', sa.DateTime, default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime, default=sa.func.now(), onupdate=sa.func.now()),
        sa.Column('last_login', sa.DateTime, nullable=True),
        sa.Column('failed_login_attempts', sa.Integer, default=0),
        sa.Column('locked_until', sa.DateTime, nullable=True),
    )
    op.create_index('ix_users_username', 'users', ['username'])
    op.create_index('ix_users_email', 'users', ['email'])
    op.create_index('ix_users_is_active', 'users', ['is_active'])

def downgrade():
    op.drop_table('users')
```

### PostgreSQL (Sequelize for Node.js)
```javascript
// migrations/20240115000001-create-users.js
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('users', {
      user_id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      username: {
        type: Sequelize.STRING(255),
        unique: true,
        allowNull: false
      },
      email: {
        type: Sequelize.STRING(255),
        unique: true,
        allowNull: false
      },
      password_hash: {
        type: Sequelize.STRING(255),
        allowNull: false
      },
      first_name: {
        type: Sequelize.STRING(255)
      },
      last_name: {
        type: Sequelize.STRING(255)
      },
      is_active: {
        type: Sequelize.BOOLEAN,
        defaultValue: true
      },
      is_deleted: {
        type: Sequelize.BOOLEAN,
        defaultValue: false
      },
      created_at: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW
      },
      updated_at: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW
      },
      last_login: {
        type: Sequelize.DATE
      },
      failed_login_attempts: {
        type: Sequelize.INTEGER,
        defaultValue: 0
      },
      locked_until: {
        type: Sequelize.DATE
      }
    });

    await queryInterface.addIndex('users', ['username']);
    await queryInterface.addIndex('users', ['email']);
    await queryInterface.addIndex('users', ['is_active']);
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable('users');
  }
};
```

---

## 5. DOCKER SETUP

```dockerfile
# Dockerfile - Backend
FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

ENV PYTHONUNBUFFERED=1

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

```yaml
# docker-compose.yml
version: '3.8'

services:
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_USER: ${DB_USER}
      POSTGRES_PASSWORD: ${DB_PASSWORD}
      POSTGRES_DB: ${DB_NAME}
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${DB_USER}"]
      interval: 10s
      timeout: 5s
      retries: 5

  backend:
    build: ./backend
    ports:
      - "8000:8000"
    environment:
      DATABASE_URL: postgresql://${DB_USER}:${DB_PASSWORD}@postgres:5432/${DB_NAME}
      SECRET_KEY: ${SECRET_KEY}
      JWT_ALGORITHM: HS256
    depends_on:
      postgres:
        condition: service_healthy
    volumes:
      - ./backend:/app

  frontend:
    build: ./frontend
    ports:
      - "3000:3000"
    environment:
      REACT_APP_API_URL: http://localhost:8000
    depends_on:
      - backend

volumes:
  postgres_data:
```

---

## Implementation Roadmap

1. **Week 1**: Database schema & migrations
2. **Week 2**: Authentication & authorization system
3. **Week 3**: User management API endpoints
4. **Week 4**: Role & permission management
5. **Week 5**: Audit logging system
6. **Week 6**: Frontend - Dashboard & User List
7. **Week 7**: Frontend - Role Management
8. **Week 8**: Testing, security review, deployment

---

Use these templates as starting points and customize based on your specific requirements!
