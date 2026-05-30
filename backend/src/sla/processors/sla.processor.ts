import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { SlaService } from '../sla.service';
import { NotificationsService } from '../../notifications/notifications.service';
import { PrismaService } from '../../prisma/prisma.service';
import { Logger } from '@nestjs/common';
import { Priority } from '@prisma/client';

@Processor('sla-checker')
export class SlaProcessor extends WorkerHost {
  private readonly logger = new Logger(SlaProcessor.name);

  constructor(
    private slaService: SlaService,
    private notificationsService: NotificationsService,
    private prisma: PrismaService,
  ) {
    super();
  }

  async process(job: Job): Promise<any> {
    if (job.name === 'check-slas') {
      return this.handleSlaCheck(job);
    }
  }

  private async handleSlaCheck(job: Job) {
    this.logger.log('Executing SLA breach check...');

    const { firstResponseBreaches, resolutionBreaches } = await this.slaService.checkSlaBreaches();

    // Process First Response Breaches
    for (const ticket of firstResponseBreaches) {
      await this.processBreach(ticket, 'FIRST_RESPONSE');
    }

    // Process Resolution Breaches
    for (const ticket of resolutionBreaches) {
      await this.processBreach(ticket, 'RESOLUTION');
    }
  }

  private async processBreach(ticket: any, breachType: 'FIRST_RESPONSE' | 'RESOLUTION') {
    this.logger.warn(`${breachType} Breach: Ticket ${ticket.ticketNumber}`);

    // 1. Record the breach
    await this.prisma.sLABreach.create({
      data: {
        ticketId: ticket.id,
        slaProfileId: ticket.slaProfileId!,
        breachType: breachType,
        breachTime: new Date(),
      },
    });

    // 2. Find matching escalation rules
    const rules = await this.prisma.escalationRule.findMany({
      where: {
        isActive: true,
        triggerType: 'SLA_BREACH',
        slaBreachType: breachType,
      },
    });

    if (rules.length === 0) {
      // Fallback: Basic notification if no specific rule exists
      await this.sendBasicSlaNotification(ticket, breachType);
      return;
    }

    // 3. Execute rules
    for (const rule of rules) {
      await this.executeEscalationRule(ticket, rule, breachType);
    }
  }

  private async executeEscalationRule(ticket: any, rule: any, breachType: string) {
    this.logger.log(`Executing rule ${rule.name} for ticket ${ticket.ticketNumber}`);

    let actionTaken = '';
    const notifiedUserIds: string[] = [];

    switch (rule.actionType) {
      case 'NOTIFY':
        actionTaken = 'Notified designated users';
        for (const userId of rule.notifyUserIds) {
          await this.notificationsService.createNotification({
            userId,
            title: `SLA Escalation: ${breachType}`,
            content: `Ticket ${ticket.ticketNumber} (${ticket.subject}) has breached its ${breachType} SLA.`,
            type: 'SLA_BREACH',
            ticketId: ticket.id,
          });
          notifiedUserIds.push(userId);
        }
        break;

      case 'REASSIGN':
        if (rule.reassignToId) {
          await this.prisma.ticket.update({
            where: { id: ticket.id },
            data: { assignedAgentId: rule.reassignToId },
          });
          actionTaken = `Reassigned to agent ${rule.reassignToId}`;
        }
        break;

      case 'INCREASE_PRIORITY':
        const nextPriority = this.getNextPriority(ticket.priority);
        await this.prisma.ticket.update({
          where: { id: ticket.id },
          data: { priority: nextPriority },
        });
        actionTaken = `Increased priority to ${nextPriority}`;
        break;

      default:
        actionTaken = 'No action taken';
    }

    // Log the escalation
    await this.prisma.escalation.create({
      data: {
        ticketId: ticket.id,
        ruleId: rule.id,
        actionTaken,
        notifiedUserIds,
        triggeredAt: new Date(),
      },
    });
  }

  private async sendBasicSlaNotification(ticket: any, breachType: string) {
    let agentId = ticket.assignedAgentId;

    if (!agentId && ticket.teamId) {
      const team = await this.prisma.team.findUnique({
        where: { id: ticket.teamId },
      });
      agentId = team?.leadId ?? null;
    }

    if (agentId) {
      await this.notificationsService.createNotification({
        userId: agentId,
        title: `SLA Warning: ${breachType} Breached`,
        content: `Ticket ${ticket.ticketNumber} (${ticket.subject}) has breached its ${breachType} deadline.`,
        type: 'SLA_BREACH',
        ticketId: ticket.id,
      });
    }
  }

  private getNextPriority(currentPriority: Priority): Priority {
    const priorities = [Priority.LOW, Priority.MEDIUM, Priority.HIGH, Priority.CRITICAL];
    const index = priorities.indexOf(currentPriority);
    if (index === -1) return Priority.MEDIUM;
    if (index === priorities.length - 1) return Priority.CRITICAL;
    return priorities[index + 1];
  }
}
