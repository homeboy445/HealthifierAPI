import { Request } from "express";

export interface ExtendedRequest extends Request {
  userData: User;
}

export interface User {
  name: string;
  email: string;
  passwordHash: string;
  uniqueUserId: string;
  refreshToken?: string;
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
  a: string; // Client
  b: string; // AI
  ta: string;
  tb: string;
  uniqueUserId: string;
}

export interface ChatData {
  message: string;
  ts: string;
  sender: "user" | "ai";
}

export interface MedicineObject {
  name: string;
  dosage: string;
  time: { day: string, hour: string };
  usage: string;
  uniqueUserId: string;
}

export interface PlanObject {
  planType: "meal" | "workout";
  mainPlan: string;
  uniqueUserId: string;
  generalisedPlan?: boolean;
}

export interface HealthQuestionaire {
  q: string;
  a: string;
}

export type GenericObject = { [props: string]: any };
