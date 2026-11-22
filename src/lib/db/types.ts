// Row types mirroring docs/schema-from-spec.sql. Single source for every module.
export type ContentStatus = "draft" | "published" | "archived";
export type UserRole = "admin" | "editor" | "fan";

export interface Profile { id: string; display_name: string | null; avatar_url: string | null; role: UserRole; is_banned: boolean; created_at: string }
export interface Media { id: string; path: string; mime_type: string; width: number | null; height: number | null; alt: string | null; credit: string | null; uploaded_by: string | null; created_at: string }

export interface Member {
  id: string; slug: string; stage_name: string; name_ko: string | null; real_name: string | null; birth_date: string | null;
  position: string[] | null; color_hex: string; bio: string | null; avatar_id: string | null; cover_id: string | null;
  gallery_ids: string[]; sort_order: number; status: ContentStatus; created_at: string; updated_at: string; updated_by: string | null;
}
export interface MemberFact { id: string; member_id: string; label: string; value: string; sort_order: number }

export type AlbumType = "single" | "ep" | "album";
export interface Album {
  id: string; slug: string; title: string; album_type: AlbumType; release_date: string | null; cover_id: string | null;
  description: string | null; spotify_url: string | null; ytmusic_url?: string | null; status: ContentStatus; created_at: string; updated_at: string; updated_by: string | null;
}
export interface Track {
  id: string; album_id: string; track_no: number; title: string; duration_sec: number | null; is_title_track: boolean;
  spotify_url: string | null; youtube_url: string | null;
}
export interface TrackMember { track_id: string; member_id: string }

export interface Post {
  id: string; slug: string; title: string; excerpt: string | null; body_md: string; cover_id: string | null; member_id: string | null;
  source: "human" | "ai"; status: ContentStatus; published_at: string | null; created_at: string; updated_at: string; updated_by: string | null;
}
export interface Tag { id: string; slug: string; name: string }
export interface PostTag { post_id: string; tag_id: string }
export interface AiJob {
  id: string; run_date: string; topic: string | null; prompt: string; model: string; post_id: string | null;
  state: "pending" | "drafted" | "approved" | "rejected" | "failed"; error: string | null; created_at: string;
}

export type EventType = "concert" | "fanmeet" | "broadcast" | "release" | "other";
export interface EventRow {
  id: string; title: string; event_type: EventType; starts_at: string; ends_at: string | null; venue: string | null; city: string | null;
  country: string | null; ticket_url: string | null; poster_id: string | null; is_cancelled: boolean; status: ContentStatus;
  created_at: string; updated_at: string; updated_by: string | null;
}

export interface GameItem { id: string; kind: string; payload: Record<string, unknown>; is_active: boolean; sort_order: number }
export interface GameScore { id: number; user_id: string; season: string; score: number; played_at: string }

export interface CitySpot {
  id: string; name: string; description: string | null; pos_x: number; pos_y: number; pos_z: number; model_id: string | null;
  link_type: "member" | "event" | "post" | "url" | null; link_id: string | null; link_url: string | null; status: ContentStatus;
}

export interface HeroSlide {
  id: string; image_id: string; headline: string | null; subline: string | null; cta_label: string | null; cta_url: string | null;
  show_from: string | null; show_until: string | null; sort_order: number; status: ContentStatus;
}
export interface Page { id: string; slug: string; title: string; body_md: string; status: ContentStatus; updated_at: string; updated_by: string | null }
export interface SiteSetting { key: string; value: unknown; updated_at: string }
export interface ActivityLog { id: number; actor_id: string | null; action: string; entity: string; entity_id: string; diff: unknown; created_at: string }
