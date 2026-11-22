import "server-only";
import type { ContentStatus } from "@/lib/db/types";
import { hasDb, query } from "@/lib/neon/db";

export interface SlideRow { id: string; image_id: string; headline: string | null; subline: string | null; sort_order: number; status: ContentStatus }

export async function listSlides(): Promise<SlideRow[]> {
  if (!hasDb()) return [];
  return query<SlideRow>(`select id, image_id, headline, subline, sort_order, status from hero_slides order by sort_order, headline`);
}
