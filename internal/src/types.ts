type PartialExcept<T, K extends keyof T> = Partial<T> & Pick<T, K>;
type PartialField<T, K extends keyof T> = Omit<T, K> & { [P in K]?: T[P] };
type Prettify<T> = { [K in keyof T]: T[K] } & {};

export type KafkaMessage = {
  id: number;
  chatId: number;
  content: string;
  isDeleted?: boolean;
  createdAt?: string;
  updatedAt: string | null;
};

export type MinimumKafkaMessage = Prettify<
  PartialExcept<KafkaMessage, 'id' | 'chatId' | 'updatedAt'>
>;
export type RedisHashMessage = Prettify<PartialField<KafkaMessage, 'updatedAt'>>;
