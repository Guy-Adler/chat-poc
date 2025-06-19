import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Chat } from './Chat.entity';

@Entity()
export class ChatMessage {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => Chat, (chat) => chat.messages, { onDelete: 'CASCADE' })
  chat!: Chat;

  @Column()
  content!: string;

  @Column()
  createdAt!: Date;

  @Column()
  replicationTimestamp!: Date;

  @Column({ default: false })
  isDeleted!: boolean;

  @Column({ nullable: true })
  updatedAt?: Date;
}
