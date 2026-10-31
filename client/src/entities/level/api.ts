import { apiGet } from "@/shared/api/client";

export type InvestorField = {
  key: string;
  label: string;
  placeholder: string;
};

export type Level = {
  id: "s" | "m" | "l";
  name: string;
  tagline: string;
  price: number;
  duration: string;
  audience: string;
  includes: string[];
  results: string[];
  investorFields?: InvestorField[];
  available?: boolean;
};

export type GetLevelsResponse = {
  levels: Level[];
};

let cache: Level[] | null = null;

/** Уровни S/M/L с кэшем на время жизни страницы. */
export async function getLevels(force = false): Promise<Level[]> {
  if (!force && cache) return cache;
  const data = await apiGet<GetLevelsResponse>("/api/levels");
  cache = data.levels;
  return data.levels;
}

export const getLevel = (levels: Level[], id: string): Level | undefined =>
  levels.find((l) => l.id === id);

/** Порядок уровней для отображения. */
export const LEVEL_ORDER: Level["id"][] = ["s", "m", "l"];
