type PartialExcept<T, K extends keyof T> = Partial<T> & Pick<T, K>;
type PartialField<T, K extends keyof T> = Omit<T, K> & { [P in K]?: T[P] };
type Prettify<T> = { [K in keyof T]: T[K] } & {};

export type CreateKafkaMessage = {
  id: string;
  chatId: string;
  content: string;
  createdAt: string;
};

export type UpdateKafkaMessage = {
  id: string;
  chatId: string;
  content: string;
  updatedAt: string;
};

export type DeleteKafkaMessage = {
  id: string;
  chatId: string;
  isDeleted: true;
};

export type KafkaMessage = CreateKafkaMessage | UpdateKafkaMessage | DeleteKafkaMessage;

export type MinimumKafkaMessage = {
  id: string;
  chatId: string;
  content?: string | undefined;
  isDeleted?: boolean | undefined;
  createdAt?: string | undefined;
  updatedAt: string | null;
};

export type RedisHashMessage = {
  id: string;
  chatId: string;
  content: string;
  isDeleted?: boolean | undefined;
  createdAt?: string | undefined;
  updatedAt?: string | null | undefined;
};
