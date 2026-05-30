import { IsNotEmpty, IsString, IsUUID } from 'class-validator';

export class CreateNotificationDto {
  @IsNotEmpty()
  @IsUUID()
  userId: string;

  @IsNotEmpty()
  @IsString()
  title: string;

  @IsNotEmpty()
  @IsString()
  content: string;

  @IsNotEmpty()
  @IsString()
  type: 'SLA_WARNING' | 'SLA_BREACH' | 'TICKET_ASSIGNED' | 'COMMENT_ADDED' | 'STATUS_CHANGED';

  @IsUUID()
  ticketId?: string;
}
