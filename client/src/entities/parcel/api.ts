import { apiGet, apiPost } from "@/shared/api/client";

export type Parcel = {
  cadastral: string;
  address: string;
  area: string;
  /** Площадь в м² (для суммарного расчёта; в мок-режиме заполнена). */
  areaSqm?: number;
  cadastralValue: string;
  category: string;
  vri: string;
  restrictions: string[];
};

/** Взаимное расположение пары участков (п. 2.4 User Journey). */
export type MutualPair = {
  a: string;
  b: string;
  adjacent: boolean;
  distance: string;
};

export type MutualInfo = {
  parcels: Parcel[];
  /** Суммарная площадь выбранной совокупности, «N м²». */
  totalArea: string;
  count: number;
  /** Все пары соприкасаются границами. */
  allAdjacent: boolean;
  pairs: MutualPair[];
};

/** Проверка участка по кадастровому номеру (auth). */
export const getParcel = (cadastral: string) =>
  apiGet<{ parcel: Parcel }>(
    "/api/parcels/" + encodeURIComponent(cadastral.trim()),
  );

/** Проверка взаимного расположения нескольких участков (auth). */
export const getMutualInfo = (cadastrals: string[]) =>
  apiPost<MutualInfo>("/api/parcels/mutual", { cadastrals });
