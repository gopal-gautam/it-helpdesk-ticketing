import { PrismaClient, Priority, Role, TicketStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import * as dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Create roles
  const roles = await Promise.all([
    prisma.role.create({
      data: {
        name: 'admin',
        description: 'System administrator with full permissions',
        permissions: ['*'],
      },
    }),
    prisma.role.create({
      data: {
        name: 'agent',
        description: 'Support agent who handles tickets',
        permissions: [
          'ticket:view',
          'ticket:view:assigned',
          'ticket:update',
          'ticket:comment',
          'ticket:add-note',
          'ticket:resolve',
          'ticket:close',
        ],
      },
    }),
    prisma.role.create({
      data: {
        name: 'team_lead',
        description: 'Team lead who manages agents and monitors team performance',
        permissions: [
          'ticket:view',
          'ticket:view:team',
          'ticket:assign',
          'ticket:reassign',
          'ticket:escalate',
          'team:view',
          'user:view',
          'report:view',
        ],
      },
    }),
    prisma.role.create({
      data: {
        name: 'requester',
        description: 'Regular user who can submit tickets',
        permissions: [
          'ticket:create',
          'ticket:view:own',
          'ticket:comment:own',
        ],
      },
    }),
  ]);

  console.log('✅ Created roles:', roles.map(r => r.name).join(', '));

  // Create teams
  const team1 = await prisma.team.create({
    data: {
      name: 'Technical Support',
      description: 'Handles technical issues and system problems',
    },
  });

  const team2 = await prisma.team.create({
    data: {
      name: 'Customer Service',
      description: 'Handles general customer inquiries and requests',
    },
  });

  console.log('✅ Created teams:', team1.name, team2.name);

  // Create demo users
  const hashedPassword = await bcrypt.hash('password123', 10);

  // Admin user
  const admin = await prisma.user.create({
    data: {
      email: 'admin@helpdesk.com',
      passwordHash: hashedPassword,
      firstName: 'System',
      lastName: 'Administrator',
      roleId: roles.find(r => r.name === 'admin')!.id,
    },
  });

  // Team Lead
  const teamLead = await prisma.user.create({
    data: {
      email: 'lead@helpdesk.com',
      passwordHash: hashedPassword,
      firstName: 'Team',
      lastName: 'Lead',
      roleId: roles.find(r => r.name === 'team_lead')!.id,
      teamId: team1.id,
    },
  });

  // Update team with lead
  await prisma.team.update({
    where: { id: team1.id },
    data: { leadId: teamLead.id },
  });

  // Agent
  const agent = await prisma.user.create({
    data: {
      email: 'agent@helpdesk.com',
      passwordHash: hashedPassword,
      firstName: 'Support',
      lastName: 'Agent',
      roleId: roles.find(r => r.name === 'agent')!.id,
      teamId: team1.id,
    },
  });

  // Regular user (requester)
  const user1 = await prisma.user.create({
    data: {
      email: 'user@helpdesk.com',
      passwordHash: hashedPassword,
      firstName: 'Regular',
      lastName: 'User',
      roleId: roles.find(r => r.name === 'requester')!.id,
    },
  });

  const user2 = await prisma.user.create({
    data: {
      email: 'john.doe@example.com',
      passwordHash: hashedPassword,
      firstName: 'John',
      lastName: 'Doe',
      roleId: roles.find(r => r.name === 'requester')!.id,
    },
  });

  console.log('✅ Created users: admin, lead, agent, user, john.doe');

  // Create categories
  const hardwareCategory = await prisma.category.create({
    data: {
      name: 'Hardware',
      description: 'Issues related to physical hardware',
    },
  });

  const softwareCategory = await prisma.category.create({
    data: {
      name: 'Software',
      description: 'Issues related to software applications',
    },
  });

  const networkCategory = await prisma.category.create({
    data: {
      name: 'Network',
      description: 'Issues related to networking and connectivity',
    },
  });

  console.log('✅ Created categories: Hardware, Software, Network');

  // Create subcategories under Hardware
  await prisma.category.create({
    data: {
      name: 'Laptop',
      description: 'Laptop-related issues',
      parentId: hardwareCategory.id,
    },
  });

  await prisma.category.create({
    data: {
      name: 'Printer',
      description: 'Printer-related issues',
      parentId: hardwareCategory.id,
    },
  });

  // Create subcategories under Software
  await prisma.category.create({
    data: {
      name: 'Microsoft Office',
      description: 'Microsoft Office suite issues',
      parentId: softwareCategory.id,
    },
  });

  await prisma.category.create({
    data: {
      name: 'CRM System',
      description: 'Customer Relationship Management system issues',
      parentId: softwareCategory.id,
    },
  });

  console.log('✅ Created subcategories');

  // Create SLA profiles
  const slaProfiles = await Promise.all([
    prisma.sLAProfile.create({
      data: {
        name: 'Low Priority SLA',
        priority: Priority.LOW,
        firstResponseHours: 8,
        resolutionHours: 72, // 3 business days
      },
    }),
    prisma.sLAProfile.create({
      data: {
        name: 'Medium Priority SLA',
        priority: Priority.MEDIUM,
        firstResponseHours: 4,
        resolutionHours: 48, // 2 business days
      },
    }),
    prisma.sLAProfile.create({
      data: {
        name: 'High Priority SLA',
        priority: Priority.HIGH,
        firstResponseHours: 1,
        resolutionHours: 8, // 1 business day
      },
    }),
    prisma.sLAProfile.create({
      data: {
        name: 'Critical Priority SLA',
        priority: Priority.CRITICAL,
        firstResponseHours: 0.25, // 15 minutes
        resolutionHours: 4, // 4 hours
      },
    }),
  ]);

  console.log('✅ Created SLA profiles for all priorities');

  // Create some sample tickets
  const tickets = await Promise.all([
    prisma.ticket.create({
      data: {
        ticketNumber: 'HD-2026-000001',
        subject: "Laptop won't turn on",
        description: "My laptop suddenly stopped working and won't turn on when I press the power button. I've tried plugging it in but still no response.",
        requesterId: user1.id,
        assignedAgentId: agent.id,
        teamId: team1.id,
        categoryId: hardwareCategory.id,
        priority: Priority.HIGH,
        status: TicketStatus.IN_PROGRESS,
        slaProfileId: slaProfiles.find(s => s.priority === Priority.HIGH)!.id,
      },
    }),
    prisma.ticket.create({
      data: {
        ticketNumber: 'HD-2026-000002',
        subject: "Microsoft Excel keeps crashing",
        description: "Every time I try to open a large spreadsheet, Excel crashes. This is preventing me from completing my monthly report.",
        requesterId: user2.id,
        assignedAgentId: agent.id,
        teamId: team1.id,
        categoryId: softwareCategory.id,
        priority: Priority.MEDIUM,
        status: TicketStatus.OPEN,
        slaProfileId: slaProfiles.find(s => s.priority === Priority.MEDIUM)!.id,
      },
    }),
    prisma.ticket.create({
      data: {
        ticketNumber: 'HD-2026-000003',
        subject: 'Printer not connecting to network',
        description: 'The office printer has lost network connectivity and no one can print to it. This is affecting multiple users.',
        requesterId: user1.id,
        teamId: team1.id,
        categoryId: hardwareCategory.id,
        priority: Priority.MEDIUM,
        status: TicketStatus.NEW,
      },
    }),
  ]);

  console.log('✅ Created sample tickets:', tickets.map(t => t.ticketNumber).join(', '));

  // Create some comments
  await prisma.comment.create({
    data: {
      content: 'I\'ve tried holding the power button for 30 seconds and also connecting to different power outlets, but nothing happens.',
      ticketId: tickets[0].id,
      authorId: user1.id,
    },
  });

  await prisma.comment.create({
    data: {
      content: 'Thanks for the additional details. I\'ve scheduled an in-person inspection for tomorrow morning.',
      ticketId: tickets[0].id,
      authorId: agent.id,
    },
  });

  await prisma.internalNote.create({
    data: {
      content: 'Suspected hardware failure - likely motherboard or power supply issue. May need replacement.',
      ticketId: tickets[0].id,
      authorId: agent.id,
    },
  });

  console.log('✅ Created comments and internal notes');

  console.log('\n🎉 Database seeding completed successfully!');
  console.log('\n📋 Demo Accounts:');
  console.log('   - admin@helpdesk.com / password123 (Admin)');
  console.log('   - lead@helpdesk.com / password123 (Team Lead)');
  console.log('   - agent@helpdesk.com / password123 (Agent)');
  console.log('   - user@helpdesk.com / password123 (Requester)');
  console.log('   - john.doe@example.com / password123 (Requester)');
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error('❌ Seeding error:', e);
    await prisma.$disconnect();
    process.exit(1);
  });