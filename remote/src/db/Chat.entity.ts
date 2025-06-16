import { Entity, ManyToOne, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { ChatMessage } from './ChatMessage.entity';

@Entity()
export class Chat {
  @PrimaryGeneratedColumn()
  id!: number;

  @OneToMany(() => ChatMessage, (message) => message.chat)
  messages!: ChatMessage[];
}
