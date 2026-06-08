import { UsersService } from './users.service';
import { ConflictException, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';

describe('UsersService', () => {
  let service: UsersService;
  let prisma: any;

  beforeEach(() => {
    prisma = {
      user: {
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(0),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      role: { findMany: jest.fn() },
    };
    service = new UsersService(prisma);
  });

  describe('findAll', () => {
    it('builds a case-insensitive search across name and email', async () => {
      await service.findAll({ search: 'ann' });
      const where = prisma.user.findMany.mock.calls[0][0].where;
      expect(where.OR).toEqual([
        { firstName: { contains: 'ann', mode: 'insensitive' } },
        { lastName: { contains: 'ann', mode: 'insensitive' } },
        { email: { contains: 'ann', mode: 'insensitive' } },
      ]);
    });

    it('filters by role name', async () => {
      await service.findAll({ role: 'AGENT' });
      expect(prisma.user.findMany.mock.calls[0][0].where.role).toEqual({ name: 'AGENT' });
    });

    it('paginates and returns an envelope', async () => {
      prisma.user.findMany.mockResolvedValue([{ id: 'u1' }]);
      prisma.user.count.mockResolvedValue(25);
      const result = await service.findAll({ page: 2, limit: 10 });
      const arg = prisma.user.findMany.mock.calls[0][0];
      expect(arg.skip).toBe(10);
      expect(arg.take).toBe(10);
      expect(result).toMatchObject({ total: 25, page: 2, limit: 10, totalPages: 3 });
    });

    it('never selects the password hash', async () => {
      await service.findAll({});
      const select = prisma.user.findMany.mock.calls[0][0].select;
      expect(select).not.toHaveProperty('passwordHash');
      expect(select.email).toBe(true);
    });
  });

  describe('create', () => {
    it('rejects a duplicate email', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'existing' });
      await expect(
        service.create({ email: 'dup@x.com', password: 'p', firstName: 'A', lastName: 'B' }),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(prisma.user.create).not.toHaveBeenCalled();
    });

    it('hashes the password and stores passwordHash (never the plaintext)', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.user.create.mockResolvedValue({ id: 'u1' });

      await service.create({ email: 'new@x.com', password: 'secret123', firstName: 'A', lastName: 'B' });

      const data = prisma.user.create.mock.calls[0][0].data;
      expect(data.password).toBeUndefined();
      expect(data.passwordHash).toBeDefined();
      expect(data.passwordHash).not.toBe('secret123');
      await expect(bcrypt.compare('secret123', data.passwordHash)).resolves.toBe(true);
    });
  });

  describe('findOne', () => {
    it('throws NotFound when the user is missing', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      await expect(service.findOne('missing')).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('update', () => {
    it('checks existence before updating', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      await expect(service.update('missing', { firstName: 'X' })).rejects.toBeInstanceOf(NotFoundException);
      expect(prisma.user.update).not.toHaveBeenCalled();
    });

    it('updates an existing user', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'u1' });
      prisma.user.update.mockResolvedValue({ id: 'u1', firstName: 'X' });
      const result = await service.update('u1', { firstName: 'X' });
      expect(prisma.user.update.mock.calls[0][0].data).toEqual({ firstName: 'X' });
      expect(result).toMatchObject({ firstName: 'X' });
    });
  });
});
