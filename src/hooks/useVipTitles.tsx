import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { defaultVipTitle } from "@/lib/database";

type TitlesMap = Record<number, string>;

let cache: TitlesMap | null = null;
const listeners = new Set<(m: TitlesMap) => void>();

const fetchTitles = async () => {
  const { data } = await supabase.from("vip_settings").select("vip_level, title");
  const map: TitlesMap = {};
  (data || []).forEach((r: any) => {
    map[r.vip_level] = (r.title && String(r.title).trim()) || defaultVipTitle(r.vip_level);
  });
  cache = map;
  listeners.forEach((l) => l(map));
};

export const useVipTitles = () => {
  const [titles, setTitles] = useState<TitlesMap>(cache || {});

  useEffect(() => {
    listeners.add(setTitles);
    if (!cache) fetchTitles();
    return () => {
      listeners.delete(setTitles);
    };
  }, []);

  const titleFor = (level: number) => titles[level] || defaultVipTitle(level);
  return { titles, titleFor };
};
