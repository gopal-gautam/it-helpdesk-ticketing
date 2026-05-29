# IT Helpdesk Ticketing System

A production-ready web-based IT Helpdesk Ticketing Software that allows employees or customers to submit support requests, enables support agents to manage and resolve tickets, and provides administrators with controls for users, SLAs, categories, permissions, and reporting.

## Features

### Core Functionality
- **Authentication & Authorization**: Secure JWT-based authentication with role-based access control
- **Ticket Management**: Complete ticket lifecycle from creation to resolution
- **SLA Management**: Automatic deadline calculation with business hours support
- **Escalation Engine**: Automatic escalation based on SLA breaches and priority
- **Notifications**: Email and in-app notifications for ticket events
- **File Attachments**: Secure file upload and download with access control
- **Reporting & Analytics**: Dashboards and reports for different user roles
- **Admin Panel**: User, category, and system configuration management
- **Audit Logging**: Complete audit trail of all system changes

### User Roles
- **Requester**: Can create tickets, view own tickets, add comments
- **Agent**: Can view assigned tickets, update status, add comments and internal notes
- **Team Lead**: Can view team tickets, monitor SLA, reassign tickets
- **Admin**: Full system access, user management, configuration

## Technology Stack

- **Frontend**: Next.js 14, React, TypeScript, Tailwind CSS, shadcn/ui
- **Backend**: NestJS, TypeScript
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: JWT with refresh tokens
- **Background Jobs**: BullMQ with Redis
- **File Storage**: Local filesystem (dev) / S3-compatible (prod)
- **Email**: SMTP integration
- **Deployment**: Docker Compose

## Getting Started

### Prerequisites

- Node.js 18+ 
- Docker and Docker Compose
- Git

### Quick Start

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd it-helpdesk-ticketing
   ```

2. **Start infrastructure services**
   ```bash
   docker compose up -d
   ```
   
   This will start:
   - PostgreSQL on port 5432
   - Redis on port 6379
   - MailHog (email testing) on port 8025

3. **Setup environment variables**
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` file if needed (default values work for local development)

4. **Install backend dependencies**
   ```bash
   cd backend
   npm install
   ```

5. **Setup database**
   ```bash
   # Generate Prisma client
   npx prisma generate
   
   # Run migrations
   npx prisma migrate dev
   
   # Seed demo data
   npm run seed
   ```

6. **Start backend server**
   ```bash
   npm run start:dev
   ```
   
   Backend will be available at: http://localhost:3001
   API documentation: http://localhost:3001/api/docs

7. **Install frontend dependencies**
   ```bash
   cd ../frontend
   npm install
   ```

8. **Start frontend**
   ```bash
   npm run dev
   ```
   
   Frontend will be available at: http://localhost:3000

### Demo Accounts

After seeding, you can log in with these demo accounts:

- **Admin**: admin@helpdesk.com / password123
- **Team Lead**: lead@helpdesk.com / password123
- **Agent**: agent@helpdesk.com / password123
- **Requester**: user@helpdesk.com / password123

## API Documentation

API documentation is automatically generated with Swagger/OpenAPI:

- Visit `http://localhost:3001/api/docs` when the backend is running
- All endpoints include request/response schemas and authentication requirements

## Development

### Backend Development

```bash
cd backend
npm run start:dev  # Development with hot reload
npm run build      # Build for production
npm run lint       # Run ESLint
npm run test       # Run tests
```

### Frontend Development

```bash
cd frontend
npm run dev        # Development server
npm run build      # Build for production
npm run lint       # Run ESLint
```

### Database Management

```bash
# Generate Prisma client
npx prisma generate

# Create new migration
npx prisma migrate dev --name <migration-name>

# Open Prisma Studio (GUI)
npx prisma studio

# Reset database (dev only)
npx prisma migrate reset
```

### Email Testing

During development, emails are captured by MailHog:

- Visit http://localhost:8025 to view captured emails
- No actual emails are sent in development mode

## Testing

### Running Tests

```bash
# Backend tests
cd backend
npm test
npm run test:e2e

# Frontend tests
cd frontend
npm test
```

### Test Coverage

The project includes:
- Unit tests for services and utilities
- Integration tests for API endpoints
- E2E tests for critical user flows
- Test coverage reporting

## Configuration

### Environment Variables

Key configuration options in `.env`:

- `DATABASE_URL`: PostgreSQL connection string
- `REDIS_URL`: Redis connection for BullMQ
- `JWT_SECRET`: Secret for JWT signing
- `SMTP_*`: Email configuration
- `FILE_STORAGE_TYPE`: Local or S3 storage
- `SLA_*`: SLA calculation settings

### SLA Configuration

SLA rules can be configured through the admin panel. Default SLA targets:

- **Critical**: 15min response, 4hr resolution
- **High**: 1hr response, 8hr resolution
- **Medium**: 4hr response, 2 day resolution
- **Low**: 8hr response, 3 day resolution

Business hours are configurable (default: Mon-Fri, 9 AM - 5 PM).

## Deployment

### Production Deployment

1. Update environment variables for production
2. Set `NODE_ENV=production`
3. Configure proper SMTP settings
4. Set up S3 or similar for file storage
5. Use process manager (PM2) for Node.js apps
6. Configure reverse proxy (nginx)
7. Enable SSL/TLS
8. Set up monitoring and logging

### Docker Deployment

```bash
# Build and run with Docker Compose
docker compose -f docker-compose.prod.yml up -d

# Or build individual services
docker build -t helpdesk-backend ./backend
docker build -t helpdesk-frontend ./frontend
```

## Architecture

### System Components

```
┌─────────────────────────────────────────────────────────┐
│                  Frontend (Next.js)                     │
│  Pages: Dashboard, Tickets, Admin, Reports               │
└──────────────────────┬──────────────────────────────────┘
                       │ REST API
┌──────────────────────▼──────────────────────────────────┐
│                Backend API (NestJS)                     │
│  Modules: Auth, Tickets, SLA, Reports, Admin, Files    │
└──────────────────────┬──────────────────────────────────┘
                       │ Prisma ORM
┌──────────────────────▼──────────────────────────────────┐
│              PostgreSQL Database                        │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│              Redis (BullMQ Job Queue)                   │
│  Workers: SLA Monitor, Notification, Escalation         │
└─────────────────────────────────────────────────────────┘
```

### Database Schema

The system uses a normalized PostgreSQL schema with:

- **Core tables**: users, roles, tickets, categories
- **Relationship tables**: comments, attachments, audit_logs
- **Configuration tables**: sla_profiles, escalation_rules
- **Reporting tables**: notifications, ticket_metrics

### Background Processing

Three main job workers:

1. **SLA Monitor** - Checks ticket deadlines and triggers escalations
2. **Notification Worker** - Sends emails and updates in-app notifications
3. **Escalation Worker** - Processes escalation rules and actions

## Monitoring

### Health Checks

Endpoints for monitoring:

- `/health` - Basic health check
- `/health/db` - Database connectivity
- `/health/redis` - Redis connectivity

### Metrics

Key metrics tracked:

- Ticket volume and resolution times
- SLA compliance rates
- Agent performance
- System performance (response times, error rates)

## Troubleshooting

### Common Issues

**Database connection failed**
- Ensure PostgreSQL container is running: `docker compose ps`
- Check DATABASE_URL in .env file
- Verify PostgreSQL is accepting connections

**Redis connection failed**
- Ensure Redis container is running
- Check REDIS_URL in .env file

**Email not sending**
- Check SMTP configuration
- Verify MailHog is running for dev environment
- Check `notification_preferences` table for user settings

**File upload fails**
- Ensure upload directory exists and is writable
- Check FILE_UPLOAD_MAX_SIZE limit
- Verify file type is allowed

### Logs

Backend logs:
```bash
cd backend
npm run logs
```

Or view Docker logs:
```bash
docker compose logs -f helpdesk-api
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

### Code Style

- Use TypeScript for type safety
- Follow existing code conventions
- Run ESLint before committing
- Write tests for new features
- Update documentation

## License

[Add license information here]

## Support

For support and questions:
- Create an issue in the repository
- Contact: support@yourcompany.com

## Roadmap

### Phase 2 Features
- Email-to-ticket integration
- Knowledge base integration
- Advanced workflow builder
- Customer satisfaction surveys
- Advanced analytics

### Phase 3 Features
- AI-powered ticket classification
- Auto-assignment based on skills
- Microsoft Teams/Slack integration
- Asset management integration
- Mobile app

---

Built with ❤️ using Next.js, NestJS, and PostgreSQL