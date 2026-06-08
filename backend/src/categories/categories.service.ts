import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CategoriesService {
  constructor(private prisma: PrismaService) {}

  async findAll(includeInactive = false) {
    return this.prisma.category.findMany({
      where: includeInactive ? {} : { isActive: true },
      include: { subcategories: true, _count: { select: { tickets: true } } },
    });
  }

  async findOne(id: string) {
    const cat = await this.prisma.category.findUnique({
      where: { id },
      include: { subcategories: true, parent: true, _count: { select: { tickets: true } } },
    });
    if (!cat) throw new NotFoundException('Category not found');
    return cat;
  }

  async create(dto: { name: string; description?: string; parentId?: string }) {
    return this.prisma.category.create({ data: { ...dto, isActive: true } });
  }

  async update(id: string, dto: { name?: string; description?: string; isActive?: boolean; parentId?: string }) {
    await this.findOne(id);
    return this.prisma.category.update({ where: { id }, data: dto });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.category.update({ where: { id }, data: { isActive: false } });
  }
}
