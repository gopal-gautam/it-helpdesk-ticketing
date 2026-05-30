import { IsNotEmpty, IsString, IsUUID } from 'class-validator';

export class CreateNoteDto {
  @IsNotEmpty()
  @IsString()
  content: string;

  @IsNotEmpty()
  @IsUUID()
  ticketId: string;
}
