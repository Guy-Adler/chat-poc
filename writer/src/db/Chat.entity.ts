import { Column, Entity, ManyToOne, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { ChatMessage } from './ChatMessage.entity';

@Entity()
export class Chat {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  replicationTimestamp!: Date;

  @Column({ default: false })
  isDeleted!: boolean;

  @OneToMany(() => ChatMessage, (message) => message.chat)
  messages!: ChatMessage[];
}
