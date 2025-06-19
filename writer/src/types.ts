type PartialExcept<T, K extends keyof T> = Partial<T> & Pick<T, K>;
type PartialField<T, K extends keyof T> = Omit<T, K> & { [P in K]?: T[P] };
type Prettify<T> = { [K in keyof T]: T[K] } & {};

export type CreateKafkaMessage = {
  id: number;
  chatId: number;
  content: string;
  createdAt: string;
};

export type UpdateKafkaMessage = {
  id: number;
  chatId: number;
  content: string;
  updatedAt: string;
};

export type DeleteKafkaMessage = {
  id: number;
  chatId: number;
  isDeleted: true;
};

export type KafkaMessage = CreateKafkaMessage | UpdateKafkaMessage | DeleteKafkaMessage;
