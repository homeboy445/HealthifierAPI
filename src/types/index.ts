export interface User {
  name: string;
  email: string;
  passwordHash: string;
  uniqueUserId: string;
}

export interface Contexts {
  uniqueUserId: string;
  contextId: string;
  contextData: string;
  additionalData?: string;
}

export interface FindConfig {
  email?: string;
  uniqueUserId?: string;
  contextId?: string;
}

export interface ChatObject {
  a: string;
  b: string;
  ta: string;
  tb: string;
  uniqueUserId: string;
}

export interface MedicineObject {
  name: string;
  dosage: string;
  time: { hr: number; mn: number };
  usage: string;
  uniqueUserId: string;
}

export interface HealthQuestionaire {
  q: string;
  a: string;
}
