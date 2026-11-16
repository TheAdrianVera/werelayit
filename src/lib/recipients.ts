export type DetailField = {
  label: string;
  value: string;
  href?: string;
};

export type DetailRecipient = {
  name: string;
  phone: string;
  address: string;
  bagCount: string;
  /** Column A route group (A, B, AB, BA, etc.) */
  group: string;
  fields: DetailField[];
};
