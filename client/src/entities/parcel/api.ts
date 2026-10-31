import { apiGet } from "@/shared/api/client";

export type Parcel = {
  cadastral: string;
  address: string;
  area: string;
  cadastralValue: string;
  category: string;
  vri: string;
  restrictions: string[];
};

/** Проверка участка по кадастровому номеру (auth). */
export const getParcel = (cadastral: string) =>
  apiGet<{ parcel: Parcel }>("/api/parcels/" + encodeURIComponent(cadastral.trim()));
