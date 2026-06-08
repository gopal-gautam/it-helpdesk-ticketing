import { TeamsService } from './teams.service';
import { ConflictException, NotFoundException } from '@nestjs/common';

describe('TeamsService', () => {
  let service: TeamsService;
  let prisma: any;

  beforeEach(() => {
    prisma = {
      team: {
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(0),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      user: { update: jest.fn() },
    };
    service = new TeamsService(prisma);
  });

  describe('findAll', () => {
    it('paginates and returns an envelope', async () => {
      prisma.team.findMany.mockResolvedValue([{ id: 't1' }]);
      prisma.team.count.mockResolvedValue(3);
      const result = await service.findAll({ page: 1, limit: 20 });
      expect(result).toMatchObject({ total: 3, totalPages: 1 });
      expect(result.teams).toEqual([{ id: 't1' }]);
    });

    it('searches name and description', async () => {
      await service.findAll({ search: 'support' });
      const where = prisma.team.findMany.mock.calls[0][0].where;
      expect(where.OR).toEqual([
        { name: { contains: 'support', mode: 'insensitive' } },
        { description: { contains: 'support', mode: 'insensitive' } },
      ]);
    });
  });

  describe('create', () => {
    it('rejects a duplicate team name', async () => {
      prisma.team.findUnique.mockResolvedValue({ id: 'existing' });
      await expect(service.create({ name: 'Support' })).rejects.toBeInstanceOf(ConflictException);
      expect(prisma.team.create).not.toHaveBeenCalled();
    });

    it('creates a team with a unique name', async () => {
      prisma.team.findUnique.mockResolvedValue(null);
      prisma.team.create.mockResolvedValue({ id: 't1', name: 'Support' });
      const result = await service.create({ name: 'Support', description: 'd' });
      expect(prisma.team.create.mock.calls[0][0].data).toMatchObject({ name: 'Support' });
      expect(result).toMatchObject({ name: 'Support' });
    });
  });

  describe('update', () => {
    it('throws NotFound when the team is missing', async () => {
      prisma.team.findUnique.mockResolvedValue(null);
      await expect(service.update('missing', { name: 'X' })).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('membership', () => {
    it('addMember sets the user teamId', async () => {
      prisma.team.findUnique.mockResolvedValue({ id: 'team1' });
      prisma.user.update.mockResolvedValue({ id: 'u1' });
      await service.addMember('team1', 'u1');
      expect(prisma.user.update.mock.calls[0][0]).toMatchObject({
        where: { id: 'u1' },
        data: { teamId: 'team1' },
      });
    });

    it('removeMember clears the user teamId scoped to the team', async () => {
      prisma.team.findUnique.mockResolvedValue({ id: 'team1' });
      prisma.user.update.mockResolvedValue({ id: 'u1' });
      await service.removeMember('team1', 'u1');
      expect(prisma.user.update.mock.calls[0][0]).toMatchObject({
        where: { id: 'u1', teamId: 'team1' },
        data: { teamId: null },
      });
    });

    it('addMember validates the team exists first', async () => {
      prisma.team.findUnique.mockResolvedValue(null);
      await expect(service.addMember('missing', 'u1')).rejects.toBeInstanceOf(NotFoundException);
      expect(prisma.user.update).not.toHaveBeenCalled();
    });
  });
});
