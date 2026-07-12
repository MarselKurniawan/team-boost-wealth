import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { defaultVipTitle } from "@/lib/database";

type TitlesMap = Record<number, string>;

let cache: TitlesMap | null = null;
let levelsCache: number[] | null = null;
const listeners = new Set<(m: TitlesMap, l: number[]) => void>();

const fetchTitles = async () => {
  const { data } = await supabase
    .from("vip_settings")
    .select("vip_level, title")
    .order("vip_level", { ascending: true });
  const map: TitlesMap = {};
  const levels: number[] = [];
  (data || []).forEach((r: any) => {
    map[r.vip_level] = (r.title && String(r.title).trim()) || defaultVipTitle(r.vip_level);
    levels.push(r.vip_level);
  });
  cache = map;
  levelsCache = levels;
  listeners.forEach((l) => l(map, levels));
};

export const refreshVipTitles = () => fetchTitles();

export const useVipTitles = () => {
  const [titles, setTitles] = useState<TitlesMap>(cache || {});
  const [levels, setLevels] = useState<number[]>(levelsCache || []);

  useEffect(() => {
    const cb = (m: TitlesMap, l: number[]) => { setTitles(m); setLevels(l); };
    listeners.add(cb);
    if (!cache) fetchTitles();
    return () => {
      listeners.delete(cb);
    };
  }, []);

  const titleFor = (level: number) => titles[level] || defaultVipTitle(level);
  return { titles, titleFor, levels };
};
