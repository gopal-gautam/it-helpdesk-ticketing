import { CategoriesService } from './categories.service';
import { NotFoundException } from '@nestjs/common';

describe('CategoriesService', () => {
  let service: CategoriesService;
  let prisma: any;

  beforeEach(() => {
    prisma = {
      category: {
        findMany: jest.fn().mockResolvedValue([]),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
    };
    service = new CategoriesService(prisma);
  });

  describe('findAll', () => {
    it('returns only active categories by default', async () => {
      await service.findAll();
      expect(prisma.category.findMany.mock.calls[0][0].where).toEqual({ isActive: true });
    });

    it('returns all categories when includeInactive is true', async () => {
      await service.findAll(true);
      expect(prisma.category.findMany.mock.calls[0][0].where).toEqual({});
    });
  });

  describe('findOne', () => {
    it('throws NotFound when missing', async () => {
      prisma.category.findUnique.mockResolvedValue(null);
      await expect(service.findOne('missing')).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('create', () => {
    it('creates a category as active', async () => {
      prisma.category.create.mockResolvedValue({ id: 'c1' });
      await service.create({ name: 'Hardware' });
      expect(prisma.category.create.mock.calls[0][0].data).toMatchObject({ name: 'Hardware', isActive: true });
    });
  });

  describe('remove', () => {
    it('soft-deletes by setting isActive false rather than deleting', async () => {
      prisma.category.findUnique.mockResolvedValue({ id: 'c1' });
      prisma.category.update.mockResolvedValue({ id: 'c1', isActive: false });
      await service.remove('c1');
      expect(prisma.category.update.mock.calls[0][0]).toMatchObject({
        where: { id: 'c1' },
        data: { isActive: false },
      });
    });

    it('throws NotFound when removing a missing category', async () => {
      prisma.category.findUnique.mockResolvedValue(null);
      await expect(service.remove('missing')).rejects.toBeInstanceOf(NotFoundException);
      expect(prisma.category.update).not.toHaveBeenCalled();
    });
  });
});
