# CI/CD Pipeline Configuration for CV Enhancer

This file documents the CI/CD strategy for the CV Enhancer project.

## Pipeline Overview

```
Code Push → Build → Test → Deploy → Monitor
   ↓         ↓       ↓       ↓        ↓
GitHub    Docker  Pytest  Docker  Sentry/
Actions   Build   pytest  Compose  Datadog
```

## GitHub Actions Workflow

### Build & Test Workflow

**File**: `.github/workflows/build-test.yml`

```yaml
name: Build & Test
on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  backend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-python@v4
        with:
          python-version: '3.11'
      - run: pip install -r backend/requirements.txt
      - run: cd backend && pytest
      - run: cd backend && python -m flake8 app --count --select=E9,F63,F7,F82 --show-source --statistics
      
  frontend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: cd frontend && npm ci
      - run: cd frontend && npm run build
      - run: cd frontend && npm test -- --watchAll=false
```

### Deploy Workflow

**File**: `.github/workflows/deploy.yml`

```yaml
name: Deploy
on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: docker/setup-buildx-action@v2
      - uses: docker/login-action@v2
        with:
          registry: ${{ secrets.DOCKER_REGISTRY }}
          username: ${{ secrets.DOCKER_USERNAME }}
          password: ${{ secrets.DOCKER_PASSWORD }}
      
      - uses: docker/build-push-action@v4
        with:
          context: ./backend
          push: true
          tags: ${{ secrets.DOCKER_REGISTRY }}/cv-enhancer-api:latest
      
      - uses: docker/build-push-action@v4
        with:
          context: ./frontend
          push: true
          tags: ${{ secrets.DOCKER_REGISTRY }}/cv-enhancer-web:latest
      
      - name: Deploy to Server
        run: |
          # SSH into server and pull latest images
          # Run docker-compose up
```

## Local Development Pipeline

1. **Lint & Format**
   ```bash
   # Backend
   cd backend
   pylint app/
   black app/
   
   # Frontend
   cd frontend
   npm run lint
   npm run format
   ```

2. **Unit Tests**
   ```bash
   # Backend
   cd backend
   pytest -v
   pytest --cov=app
   
   # Frontend
   cd frontend
   npm test -- --coverage
   ```

3. **Build & Package**
   ```bash
   # Docker images
   docker-compose build
   ```

4. **Integration Tests**
   ```bash
   # Run with docker-compose
   docker-compose up
   # Run integration tests against running containers
   ```

## Deployment Stages

### Development Environment
- Runs on pull requests
- Builds Docker images
- Runs full test suite
- No deployment

### Staging Environment
- Runs on develop branch push
- Deploys to staging server
- Database snapshots from production
- Smoke tests run

### Production Environment
- Runs on main branch push
- Manual approval required
- Zero-downtime deployment
- Health checks and monitoring

## Docker Image Strategy

### Image Names
- Backend: `cv-enhancer-api:latest` (or version tag)
- Frontend: `cv-enhancer-web:latest` (or version tag)
- Database: `postgres:15-alpine` (standard)

### Image Optimization
- Multi-stage builds for smaller size
- Alpine Linux base images
- Layer caching for faster builds
- Security scanning (Trivy)

### Image Registry
- Private Docker Registry (Docker Hub, ECR, or GCR)
- Image signing for security
- Automated vulnerability scanning

## Deployment Methods

### Option 1: Docker Compose (Development/Small Scale)
```bash
docker-compose -f docker-compose.yml up -d
```

### Option 2: Kubernetes (Large Scale)
```bash
kubectl apply -f k8s/
```

### Option 3: AWS ECS + Fargate
- Task definitions for backend and frontend
- Application Load Balancer
- RDS for database
- S3 for file uploads

### Option 4: Digital Ocean App Platform
- Simple deployment from GitHub
- Auto-scaling
- Built-in monitoring

## Health Checks & Monitoring

### Backend Health Endpoint
```bash
GET /health
Response: {"status": "healthy"}
```

### Database Health Check
```python
# In app/main.py
@app.get("/health/db")
def health_db(db: Session = Depends(get_db)):
    try:
        db.execute("SELECT 1")
        return {"status": "healthy"}
    except:
        return {"status": "unhealthy"}, 503
```

### Frontend Health Check
- SPA health check at `/`
- API connectivity test
- Browser console errors monitoring

### Monitoring Stack
- **Logging**: ELK Stack or CloudWatch
- **Metrics**: Prometheus + Grafana
- **Error Tracking**: Sentry
- **APM**: New Relic or DataDog
- **Uptime Monitoring**: Pingdom or UptimeRobot

## Scaling Strategy

### Horizontal Scaling
1. **Load Balancer**: Nginx or AWS ALB
2. **Backend**: Multiple API instances behind load balancer
3. **Frontend**: CDN (CloudFront, Cloudflare)
4. **Database**: Read replicas, connection pooling

### Vertical Scaling
1. Increase container resource limits
2. Upgrade database instance
3. Use caching (Redis)
4. Optimize queries

### Auto-Scaling Rules
- Scale up if CPU > 70%
- Scale up if memory > 80%
- Scale down if CPU < 30% for 5 minutes
- Min replicas: 2, Max replicas: 10

## Security in Pipeline

1. **Secret Management**
   - GitHub Secrets for credentials
   - AWS Secrets Manager for production
   - Vault for secrets rotation

2. **Image Scanning**
   - Trivy for vulnerability scanning
   - Prevent images with critical vulnerabilities

3. **Access Control**
   - Branch protection rules
   - Code review requirements
   - CODEOWNERS file

4. **Audit Logging**
   - All deployments logged
   - Database access logged
   - API calls logged

## Rollback Strategy

### Manual Rollback
```bash
# Revert to previous image version
docker-compose pull
docker-compose up -d
```

### Automated Rollback
- Monitor error rates
- Auto-rollback if error rate > 5%
- Alert team on rollback

## Disaster Recovery

1. **Database Backups**
   - Daily snapshots
   - 30-day retention
   - Test restores monthly

2. **Disaster Recovery Plan**
   - RTO (Recovery Time Objective): 1 hour
   - RPO (Recovery Point Objective): 1 hour
   - Backup region for failover

3. **Infrastructure as Code**
   - Terraform for infrastructure
   - CloudFormation for AWS
   - Quick recreation capability

## Performance Metrics

Track these metrics:
- Deployment frequency
- Lead time for changes
- Mean time to failure (MTBF)
- Mean time to recovery (MTTR)
- Build success rate
- Test coverage

## Documentation

- Keep deployment runbook updated
- Document all manual steps
- Record runbooks in wiki
- Create troubleshooting guides

---

**Pipeline Owner**: DevOps Team
**Last Updated**: February 2026
