import { Controller, Get, Post, Patch, Delete, Param, Body, Query, UseGuards } from '@nestjs/common';
import { TeamsService, CreateTeamDto, UpdateTeamDto } from './teams.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('teams')
@UseGuards(JwtAuthGuard, RolesGuard)
export class TeamsController {
  constructor(private readonly teamsService: TeamsService) {}

  @Get()
  @Roles('ADMIN', 'TEAM_LEAD', 'AGENT')
  findAll(@Query() query: any) {
    return this.teamsService.findAll({
      search: query.search,
      page: query.page ? parseInt(query.page) : 1,
      limit: query.limit ? parseInt(query.limit) : 20,
    });
  }

  @Get(':id')
  @Roles('ADMIN', 'TEAM_LEAD', 'AGENT')
  findOne(@Param('id') id: string) {
    return this.teamsService.findOne(id);
  }

  @Post()
  @Roles('ADMIN')
  create(@Body() dto: CreateTeamDto) {
    return this.teamsService.create(dto);
  }

  @Patch(':id')
  @Roles('ADMIN')
  update(@Param('id') id: string, @Body() dto: UpdateTeamDto) {
    return this.teamsService.update(id, dto);
  }

  @Post(':id/members/:userId')
  @Roles('ADMIN')
  addMember(@Param('id') id: string, @Param('userId') userId: string) {
    return this.teamsService.addMember(id, userId);
  }

  @Delete(':id/members/:userId')
  @Roles('ADMIN')
  removeMember(@Param('id') id: string, @Param('userId') userId: string) {
    return this.teamsService.removeMember(id, userId);
  }
}
