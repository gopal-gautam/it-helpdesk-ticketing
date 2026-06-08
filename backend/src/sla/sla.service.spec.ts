import { SlaService } from './sla.service';

// Business hours config used by the service: Mon-Fri, 09:00 - 17:00 (8h/day).
// All reference dates below are deterministic, real calendar days:
//   2024-06-03 = Monday, 2024-06-07 = Friday,
//   2024-06-08 = Saturday, 2024-06-10 = the following Monday.

describe('SlaService', () => {
  let service: SlaService;
  let prisma: any;

  beforeEach(() => {
    prisma = {
      sLAProfile: { findUnique: jest.fn() },
      ticket: { findUnique: jest.fn(), update: jest.fn(), findMany: jest.fn() },
    };
    service = new SlaService(prisma);
  });

  describe('calculateDeadline', () => {
    it('adds hours within the same business day', () => {
      const start = new Date('2024-06-03T09:00:00'); // Mon 9am
      const deadline = service.calculateDeadline(start, 4);
      expect(deadline.getHours()).toBe(13);
      expect(deadline.getDate()).toBe(3);
    });

    it('rolls a full 8h day over to the next business morning', () => {
      const start = new Date('2024-06-03T09:00:00'); // Mon 9am
      const deadline = service.calculateDeadline(start, 8);
      expect(deadline.getDate()).toBe(4); // Tuesday
      expect(deadline.getHours()).toBe(9);
    });

    it('spreads hours across multiple business days', () => {
      const start = new Date('2024-06-03T09:00:00'); // Mon 9am
      const deadline = service.calculateDeadline(start, 10);
      expect(deadline.getDate()).toBe(4); // Tuesday
      expect(deadline.getHours()).toBe(11); // 8h Mon + 2h Tue
    });

    it('skips the weekend when the clock runs out on Friday', () => {
      const start = new Date('2024-06-07T15:00:00'); // Fri 3pm
      const deadline = service.calculateDeadline(start, 4);
      // 2h consumed Fri (to 17:00) -> next business day skips Sat/Sun -> Mon 9am + 2h
      expect(deadline.getDate()).toBe(10); // Monday
      expect(deadline.getHours()).toBe(11);
    });

    it('jumps forward to business start when starting before 9am', () => {
      const start = new Date('2024-06-03T07:00:00'); // Mon 7am
      const deadline = service.calculateDeadline(start, 1);
      expect(deadline.getHours()).toBe(10); // start counts from 9am
    });

    it('jumps to the next business day when starting after 5pm', () => {
      const start = new Date('2024-06-03T18:00:00'); // Mon 6pm
      const deadline = service.calculateDeadline(start, 1);
      expect(deadline.getDate()).toBe(4); // Tuesday
      expect(deadline.getHours()).toBe(10);
    });

    it('treats a Saturday start as the following Monday', () => {
      const start = new Date('2024-06-08T10:00:00'); // Saturday
      const deadline = service.calculateDeadline(start, 1);
      expect(deadline.getDate()).toBe(10); // Monday
      expect(deadline.getHours()).toBe(10);
    });
  });

  describe('applySlaProfile', () => {
    it('writes computed first-response and resolution deadlines onto the ticket', async () => {
      prisma.sLAProfile.findUnique.mockResolvedValue({
        id: 'sla1',
        firstResponseHours: 4,
        resolutionHours: 8,
      });
      prisma.ticket.findUnique.mockResolvedValue({
        id: 't1',
        createdAt: new Date('2024-06-03T09:00:00'),
      });
      prisma.ticket.update.mockImplementation(({ data }: any) => Promise.resolve(data));

      await service.applySlaProfile('t1', 'sla1');

      const updateArg = prisma.ticket.update.mock.calls[0][0];
      expect(updateArg.where).toEqual({ id: 't1' });
      expect(updateArg.data.slaProfileId).toBe('sla1');
      expect((updateArg.data.firstResponseDueAt as Date).getHours()).toBe(13); // +4h
      expect((updateArg.data.resolutionDueAt as Date).getHours()).toBe(9); // +8h -> next morning
    });

    it('throws when the SLA profile does not exist', async () => {
      prisma.sLAProfile.findUnique.mockResolvedValue(null);
      await expect(service.applySlaProfile('t1', 'missing')).rejects.toThrow('SLA Profile not found');
    });

    it('throws when the ticket does not exist', async () => {
      prisma.sLAProfile.findUnique.mockResolvedValue({ id: 'sla1', firstResponseHours: 1, resolutionHours: 1 });
      prisma.ticket.findUnique.mockResolvedValue(null);
      await expect(service.applySlaProfile('missing', 'sla1')).rejects.toThrow('Ticket not found');
    });
  });
});
