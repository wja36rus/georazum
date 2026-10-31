import { apiGet } from "@/shared/api/client";

export type Offer = {
  version: string;
  updatedAt: string;
  title: string;
  text: string[];
};

export const getOffer = () => apiGet<{ offer: Offer }>("/api/offer");
