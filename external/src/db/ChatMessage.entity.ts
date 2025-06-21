import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Chat } from './Chat.entity';

@Entity()
export class ChatMessage {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => Chat, (chat) => chat.messages, { onDelete: 'CASCADE' })
  chat!: Chat;

  @Column()
  content!: string;

  @Column()
  createdAt!: Date;

  @Column({ nullable: true })
  updatedAt?: Date;
}
