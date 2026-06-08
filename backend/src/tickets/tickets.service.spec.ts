import { TicketsService } from './tickets.service';
import { TicketStatus, TicketSource } from '@prisma/client';

describe('TicketsService', () => {
  let service: TicketsService;
  let prisma: any;
  let auditLog: any;

  beforeEach(() => {
    prisma = {
      ticket: {
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(0),
        create: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      ticketHistory: {
        create: jest.fn().mockResolvedValue(undefined),
      },
    };
    auditLog = { log: jest.fn().mockResolvedValue(undefined) };
    const mailer = { sendMail: jest.fn().mockResolvedValue(true) };
    service = new TicketsService(prisma, auditLog, mailer as any);
  });

  const lastFindManyArg = () => prisma.ticket.findMany.mock.calls[0][0];

  describe('findAll RBAC scoping', () => {
    it('restricts a REQUESTER to their own tickets', async () => {
      await service.findAll({ userId: 'u1', role: 'REQUESTER' });
      expect(lastFindManyArg().where).toEqual({ requesterId: 'u1' });
    });

    it('shows an AGENT tickets they own or requested', async () => {
      await service.findAll({ userId: 'a1', role: 'AGENT' });
      expect(lastFindManyArg().where).toEqual({
        OR: [{ assignedAgentId: 'a1' }, { requesterId: 'a1' }],
      });
    });

    it('does not scope an ADMIN', async () => {
      await service.findAll({ userId: 'admin', role: 'ADMIN' });
      expect(lastFindManyArg().where).toEqual({});
    });
  });

  describe('findAll filters', () => {
    it('applies status, priority and category filters', async () => {
      await service.findAll({
        role: 'ADMIN',
        status: TicketStatus.OPEN,
        priority: 'HIGH' as any,
        categoryId: 'c1',
      });
      const where = lastFindManyArg().where;
      expect(where.status).toBe(TicketStatus.OPEN);
      expect(where.priority).toBe('HIGH');
      expect(where.categoryId).toBe('c1');
    });

    it('builds a search OR clause for an unscoped admin', async () => {
      await service.findAll({ role: 'ADMIN', search: 'printer' });
      const where = lastFindManyArg().where;
      expect(where.OR).toEqual([
        { subject: { contains: 'printer', mode: 'insensitive' } },
        { description: { contains: 'printer', mode: 'insensitive' } },
        { ticketNumber: { contains: 'printer', mode: 'insensitive' } },
      ]);
    });

    it('merges search with RBAC OR using AND so scoping is not lost', async () => {
      await service.findAll({ userId: 'a1', role: 'AGENT', search: 'vpn' });
      const where = lastFindManyArg().where;
      expect(where.AND).toHaveLength(2);
      expect(where.AND[0]).toEqual({
        OR: [{ assignedAgentId: 'a1' }, { requesterId: 'a1' }],
      });
      expect(where.AND[1].OR).toHaveLength(3);
    });
  });

  describe('findAll pagination', () => {
    it('computes skip/take and returns a paginated envelope', async () => {
      prisma.ticket.findMany.mockResolvedValue([{ id: 't1' }]);
      prisma.ticket.count.mockResolvedValue(42);

      const result = await service.findAll({ role: 'ADMIN', page: 3, limit: 10 });

      const arg = lastFindManyArg();
      expect(arg.skip).toBe(20); // (3 - 1) * 10
      expect(arg.take).toBe(10);
      expect(result).toMatchObject({ total: 42, page: 3, limit: 10, totalPages: 5 });
      expect(result.tickets).toEqual([{ id: 't1' }]);
    });

    it('defaults to page 1 / limit 20', async () => {
      await service.findAll({ role: 'ADMIN' });
      const arg = lastFindManyArg();
      expect(arg.skip).toBe(0);
      expect(arg.take).toBe(20);
    });
  });

  describe('createTicket', () => {
    it('creates with a generated number, NEW status, PORTAL source and audits it', async () => {
      prisma.ticket.count.mockResolvedValue(0); // for number generation
      prisma.ticket.create.mockResolvedValue({ id: 't1' });

      await service.createTicket(
        { subject: 's', description: 'd', categoryId: 'c1', priority: 'LOW' as any, requesterId: 'u1' },
        'u1',
      );

      const data = prisma.ticket.create.mock.calls[0][0].data;
      expect(data.status).toBe(TicketStatus.NEW);
      expect(data.source).toBe(TicketSource.PORTAL);
      expect(data.ticketNumber).toMatch(/^HD-\d{4}-000001$/);
      expect(auditLog.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'TICKET_CREATED', entityType: 'TICKET' }),
      );
    });
  });

  describe('resolveTicket', () => {
    it('sets RESOLVED status with a resolvedAt timestamp', async () => {
      prisma.ticket.findUnique.mockResolvedValue({ id: 't1', status: 'OPEN' });
      prisma.ticket.update.mockResolvedValue({ id: 't1', status: 'RESOLVED' });

      await service.resolveTicket('t1', 'agent1');

      const data = prisma.ticket.update.mock.calls[0][0].data;
      expect(data.status).toBe(TicketStatus.RESOLVED);
      expect(data.resolvedAt).toBeInstanceOf(Date);
      expect(auditLog.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'TICKET_RESOLVED' }),
      );
    });
  });

  describe('assignTicket', () => {
    it('assigns the agent and auto-opens the ticket', async () => {
      prisma.ticket.findUnique.mockResolvedValue({ id: 't1', status: 'NEW' });
      prisma.ticket.update.mockResolvedValue({ id: 't1' });

      await service.assignTicket('t1', 'agent1', 'admin1', 'team1');

      const data = prisma.ticket.update.mock.calls[0][0].data;
      expect(data.assignedAgentId).toBe('agent1');
      expect(data.teamId).toBe('team1');
      expect(data.status).toBe(TicketStatus.OPEN);
    });
  });
});
