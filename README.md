# The CirCle: Real-Time Enterprise Collab Hub

The CirCle is a real-time collaborative project management platform built from the ground up utilizing the MERN stack with high-availability Redis Sentinel caching, Socket.io clustering, parallel Apollo GraphQL endpoints, and strict cryptographic security compliances.

---

## 🛠️ Repository & System Layout

```
├── .github/workflows/       # GitHub Actions CI/CD workflows
├── docs/                    # Technical & Architectural Documentation
│   ├── architecture.md      # C1/C2/C3 C4 architectural breakdown
│   ├── security/            # Simulated security exploit logs & mitigations
│   │   └── pentest_report.md
│   ├── load-test/           # k6 performance spike metrics
│   │   └── load_test_results.md
│   └── adr/                 # Architecture Decision Records
│       ├── adr_001_c4_system_decomposition.md
│       ├── adr_002_field_level_encryption.md
│       ├── adr_003_tamper_evident_logging.md
│       ├── adr_004_redis_sentinel_fail_open.md
│       └── adr_005_html5_drag_and_drop.md
├── server/                  # Node.js + Express API Backend Gateway
│   ├── auth/                # RS256 JWT, Passport OAuth strategies & permission matrix
│   ├── db/                  # Replica set configurations & change stream monitors
│   ├── graphql/             # Apollo schemas, Resolvers, and DataLoader batchers
│   ├── jobs/                # BullMQ email queues, PDF rollouts, webhook workers
│   ├── middleware/          # Security headers, rate limiters, tenant-isolation, transactions
│   ├── models/              # Mongoose schemas with 6-level hierarchy & discriminators
│   ├── routes/              # RESTful API controllers
│   ├── socket/              # Horizontal WS scaling and Yjs CRDT edit document logic
│   └── utils/               # AES-256-GCM crypto, logger, metrics exporters
├── src/                     # React 18 Concurrent UI SPA
│   ├── components/          # Kanban boards, collaborative TipTap editors, custom Gantt charts
│   ├── lib/                 # Zustand store slices, TanStack Query setup, context providers
│   └── pages/               # Lazy-routed dashboard pages & hierarchy navigators
├── tests/                   # Complete Testing Suite
│   ├── load/                # k6 load testing configurations
│   ├── backend.test.ts      # Vitest backend unit test cases
│   └── e2e.spec.ts          # Playwright user interaction tests
├── docker-compose.yml       # Production-grade dev environment stack
└── package.json             # Core dependency manifest
```

---

## 🚀 Rapid Local Bootstrapping

Follow these steps to run the complete enterprise cluster locally.

### 1. Prerequisites
Ensure you have the following tools installed on your system:
* **Node.js 20.x LTS**
* **Docker Desktop** (or Docker Daemon configured with Compose)

### 2. Environment Variables configuration
Clone `.env.example` into a local `.env` file. The repository comes pre-seeded with default keys for local verification:
```bash
cp .env.example .env
```
*Note: Make sure not to expose these variables or push your private JWT key files to public git history.*

### 3. Spin Up Cluster Infrastructure
Bring up the entire local ecosystem in containerized stages (MongoDB 3-Node Replica Set, Redis Sentinel, MinIO, MailHog, and Prometheus monitoring):
```bash
docker compose up -d
```

### 4. Running the Development Server
Install npm packages and boot up the combined React frontend and Express gateway:
```bash
npm install
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) to view The CirCle in your browser.

---

## 🧪 Comprehensive Verification Suite

Execute the following test targets to verify The CirCle's functionality:

### Type-Checking & Linting
Run the compiler check to verify type safety across the TypeScript codebase without exporting files:
```bash
npm run lint
```
*(Runs `tsc --noEmit` internally)*

### Backend Unit Tests
Execute the Vitest suite against permission matrices, soft delete chains, and event replayers:
```bash
npm run test
```

### End-to-End Playwright Tests
Ensure the real-time editor CRDT synchronization, token rotation reuse invalidators, and offline caching sync mechanics work:
```bash
npm run test:e2e
```

### Performance Spike Tests
Simulate high traffic spikes (1000 virtual users) to verify the fail-open rate limiting and cache layers:
```bash
# Verify k6 is installed on your system
k6 run tests/load/spike.js
```

---

## 🔒 Crucial Architectural Highlights
* **6-Level Tenant Gating:** Data boundaries are strictly enforced across Organisation → Workspace → Project → Epic → Story → Task → Sub-task.
* **Polymorphic Work Items:** Tasks are represented using Mongoose discriminators (`Bug`, `Feature`, `Chore`, `Spike`).
* **Cryptographic Data Gating:** Personal user details (PII) are encrypted at the database field level using AES-256-GCM, utilizing deterministically salted blind indexes to resolve queries.
* **Tamper-Evident Audit Logging:** Security audit operations are logged in a cryptographic append-only chain where each document hash references the preceding entry's signature block.
* **Redis Sentinel Fail-Open Resilience:** The system disables connection queuing and limits command retries to ensure that if Redis Sentinel offline state is hit, rate limiters and cache-aside layers fail open safely.
* **Native Drag-and-Drop Board:** Custom HTML5 Kanban board built from scratch with WCAG 2.1 AA keyboard support and viewport virtual scroll rendering.

---

## ☸️ Kubernetes Deployment

The CirCle includes complete Kubernetes manifests ready for local clusters (kind, minikube) or production deployment. The manifests include Deployments, Services, HorizontalPodAutoscalers (HPA), PodDisruptionBudgets (PDB), and NetworkPolicies.

### Deploying to a local cluster (kind/minikube)

1. Start your local cluster:
```bash
# Using kind
kind create cluster --name jition

# OR using minikube
minikube start
```

2. Build and load the Docker images:
```bash
# Build images
docker build -t jition-backend:latest -f Dockerfile.backend .
docker build -t jition-frontend:latest -f Dockerfile.frontend .

# Load into kind
kind load docker-image jition-backend:latest --name jition
kind load docker-image jition-frontend:latest --name jition

# OR load into minikube
minikube image load jition-backend:latest
minikube image load jition-frontend:latest
```

3. Apply the Kubernetes manifests:
```bash
kubectl apply -f k8s/
```

4. Verify the deployment:
```bash
kubectl get pods
kubectl get svc
kubectl get hpa
```

5. Access the application:
```bash
# Forward the frontend port to localhost
kubectl port-forward svc/jition-frontend-service 8080:8080
```
Open [http://localhost:8080](http://localhost:8080) to view the app!

---

## 🔄 CI/CD & Zero-Downtime Deployments

The project uses GitHub Actions for continuous integration, delivery, and database migrations. 

### Branch Protection & Pull Requests
For security and stability, configure the following Branch Protection Rules on the `main` branch via GitHub Settings:
1. **Require pull request reviews before merging**: Set minimum approving reviews to `1`.
2. **Require status checks to pass before merging**: Select the `CI/CD Pipeline` jobs (`lint-and-typecheck`, `unit-test`, `build`, `e2e-test`, `security-scan`).
3. **Require branches to be up to date before merging**.

*Note: Feature branches automatically trigger Ephemeral Preview Environments via the `preview.yml` workflow.*

### Semantic Versioning & Release Please
We use [Conventional Commits](https://www.conventionalcommits.org/) (e.g., `feat: ...`, `fix: ...`) to automate semantic versioning. The `release-please.yml` workflow automatically creates Release PRs that bump the version, compile the `CHANGELOG.md`, and publish GitHub Releases upon merge.

### Zero-Downtime Deploy Strategy & Migrations
Database migrations are executed via `migrate-mongo` prior to rolling out new containers. The zero-downtime strategy works as follows:
1. **Backward Compatible Migrations**: The `migrate:up` script runs sequentially and maintains backward compatibility so old pods don't crash while new pods are spinning up.
2. **Rolling Updates**: Kubernetes performs a rolling update (controlled by `maxSurge` and `maxUnavailable` in Deployments).
3. **Graceful Termination**: Existing connections are drained from the old pods via the readiness/liveness probes while new traffic is routed to the new pods.
4. **Rollback**: If a deployment fails, Kubernetes halts the rollout. The database can be manually or automatically rolled back using `npm run migrate:down`.
