
# Hearts2Hearts Fan Site — Module, System Design & CMS Database
 · 
## 1. ภาพรวมระบบ
ระบบเป็น Next.js app เดียว แบ่ง 2 ฝั่ง: เว็บแฟนไซต์สาธารณะ (/) กับ CMS หลังบ้าน (/admin) ใช้ Supabase เป็น database, auth, storage และ Vercel เป็น hosting เนื้อหาทุกหน้าดึงจาก CMS ไม่ hardcode
 | 
Layer | 
เลือกใช้ | 
หน้าที่
 | 
Frontend | 
Next.js 15 (App Router), TypeScript, Tailwind, Framer Motion, R3F | 
หน้าเว็บ + หน้า admin
 | 
Rendering | 
ISR + revalidateTag | 
หน้า public เป็น static, CMS กด publish แล้ว revalidate ทันที
 | 
Database | 
Supabase Postgres + RLS | 
เก็บข้อมูลทั้งหมด
 | 
Auth | 
Supabase Auth (email / Google) | 
login ของ admin/editor และแฟนที่เล่นเกม
 | 
Storage | 
Supabase Storage (bucket media) | 
รูป, ไฟล์ 3D, cover เพลง
 | 
AI | 
Vercel Cron → API route → LLM | 
สร้าง draft บล็อกรายวัน
 | 
Hosting | 
Vercel | 
deploy + cron
Roles
 | 
Role | 
ทำอะไรได้
 | 
admin | 
ทุกอย่าง รวมจัดการผู้ใช้และ settings
 | 
editor | 
สร้าง/แก้/publish เนื้อหา, อนุมัติบล็อก AI
 | 
fan | 
login เพื่อเล่นเกม, ส่งคะแนน, กดถูกใจ
 | 
anon | 
อ่านเนื้อหาที่ publish แล้วเท่านั้น
## 2. Module Map
แบ่งเป็น 10 module ตามโดเมนข้อมูล แต่ละ module มีทั้งฝั่ง public (อ่าน) และฝั่ง CMS (เขียน) ใช้ตารางของตัวเอง
 | 
Module | 
ตารางหลัก | 
หน้า public ที่ใช้ | 
หน้า CMS
 | 
Auth & Users | 
profiles | 
Game (login) | 
Users
 | 
Media Library | 
media | 
ทุกหน้า | 
Media
 | 
Members | 
members, member_facts | 
Home, Members, Member Detail, About | 
Members
 | 
Music | 
albums, tracks, track_members | 
Home, Music, Member Detail | 
Albums, Tracks
 | 
Blog | 
posts, post_tags, tags, ai_jobs | 
Home, Blog | 
Posts, AI Queue
 | 
Schedule | 
events | 
Home, Schedule | 
Events
 | 
Game | 
game_items, game_scores | 
Game | 
Game Content
 | 
Mini City | 
city_spots | 
Mini City | 
City Spots
 | 
Pages & Home | 
hero_slides, pages, site_settings | 
Home, About, Footer | 
Home Builder, Pages, Settings
 | 
Audit | 
activity_log | 
— | 
Activity Log
โครง folder
## 3. System Design รายหน้า (Public)
ทุกหน้าเป็น Server Component ดึงข้อมูลผ่าน lib/db/* แคชด้วย cache tag ของ module นั้น เมื่อ CMS publish จะเรียก revalidateTag ให้หน้าที่เกี่ยวข้องอัปเดตทันที ส่วนที่ต้อง interactive (เกม, player, 3D) แยกเป็น Client Component
 | 
หน้า | 
Route | 
Data ที่ดึง | 
Components หลัก | 
Render / Cache tag
 | 
Home | 
/ | 
hero_slides (active), members, albums ล่าสุด 1 + tracks, posts ล่าสุด 3, events ถัดไป 3 | 
HeroBanner, ImageCarousel, TiltCard, MemberGrid, MusicWidget, BlogCards, EventStrip | 
ISR · home, members, music, posts, events
 | 
Members | 
/members | 
members ที่ is_published เรียงตาม sort_order | 
MemberCard grid, filter ตาม position | 
ISR · members
 | 
Member Detail | 
/members/[slug] | 
members by slug, member_facts, tracks ที่ member ร่วม (ผ่าน track_members), posts ที่ tag member | 
ProfileHero (accent = members.color_hex), FactList, Gallery, MemberTracks | 
ISR + generateStaticParams · member:{slug}
 | 
Music | 
/music | 
albums + tracks ทั้งหมด เรียงวันที่ออก | 
Spotify-style board, AlbumGrid, TrackList, MiniPlayer (client, ใช้ embed URL) | 
ISR · music
 | 
Blog list | 
/blog | 
posts status=published, paginate 12, filter tag | 
BlogCard, TagFilter, Pagination | 
ISR · posts
 | 
Blog post | 
/blog/[slug] | 
post by slug + tags + related 3 | 
ArticleBody (MDX/markdown), AI badge ถ้า source='ai' | 
ISR · post:{slug}
 | 
Game | 
/game | 
game_items (active), top 10 game_scores | 
GameCanvas (client), Leaderboard, LoginGate | 
Static shell + client fetch leaderboard · game
 | 
Schedule | 
/schedule | 
events เรียงวันที่, แยก upcoming / past | 
Calendar/List toggle, EventCard, CountdownBadge | 
ISR · events
 | 
Mini City | 
/city | 
city_spots + media (model URL) | 
R3F Canvas (client, dynamic import ssr:false), SpotTooltip | 
ISR · city
 | 
About | 
/about | 
pages slug=about, members ย่อ, site_settings | 
RichText, Timeline, SocialLinks | 
ISR · pages
 | 
Shared | 
ทุกหน้า | 
site_settings (nav, footer, social) | 
Navbar, Footer | 
settings
Flow ที่ต้องมี API ของตัวเอง

ส่งคะแนนเกม POST /api/game/score → ตรวจ session fan → ตรวจคะแนนไม่เกินเพดานต่อรอบ (กันโกงขั้นพื้นฐาน) → insert game_scores → คืน rank

Revalidate POST /api/revalidate เรียกจาก CMS หลัง save พร้อม tag (ตรวจ role editor ขึ้นไป)

AI Blog GET /api/cron/ai-blog เรียกโดย Vercel Cron วันละครั้ง (ดูข้อ 6)
## 4. CMS Admin รายหน้า
ทุกหน้า CMS ใช้แพทเทิร์นเดียวกัน: List (ตาราง + ค้นหา + filter status) → Form (create/edit) → ปุ่ม Save draft / Publish ที่ยิง revalidate ให้หน้า public ทุกครั้งที่ publish
 | 
หน้า CMS | 
Route | 
ฟังก์ชัน | 
Role
 | 
Dashboard | 
/admin | 
นับ draft รอ publish, AI draft รออนุมัติ, event 7 วันข้างหน้า, activity ล่าสุด | 
editor+
 | 
Members | 
/admin/members | 
CRUD สมาชิก, ลากเรียงลำดับ, เลือกสีประจำตัว, จัดการ facts แบบ key-value, แกลเลอรีจาก Media | 
editor+
 | 
Albums | 
/admin/music | 
CRUD อัลบั้ม, cover, วันที่ออก, ประเภท (single/EP/album) | 
editor+
 | 
Tracks | 
/admin/music/[albumId] | 
เพิ่มเพลงในอัลบั้ม, ลากเรียง track no., ใส่ Spotify/YouTube URL, ติ๊ก member ที่ร่วมร้อง | 
editor+
 | 
Posts | 
/admin/posts | 
Markdown editor + preview, cover, tag, ผูก member, ตั้งเวลา publish (published_at) | 
editor+
 | 
AI Queue | 
/admin/ai-queue | 
ดู draft ที่ AI สร้าง, แก้, Approve → publish หรือ Reject, ดู log การรันแต่ละวัน | 
editor+
 | 
Events | 
/admin/events | 
CRUD งาน/คอนเสิร์ต, วันเวลา + timezone, สถานที่, ลิงก์ตั๋ว, สถานะ (scheduled/cancelled) | 
editor+
 | 
Game Content | 
/admin/game | 
จัดการไอเทม/คำถามในเกม, เปิด-ปิด, ล้าง leaderboard รายฤดู | 
editor+
 | 
City Spots | 
/admin/city | 
วางจุดใน Mini City (ตำแหน่ง x,y,z), ผูกกับ member/event/post, อัปโหลด model .glb | 
editor+
 | 
Home Builder | 
/admin/home | 
จัดการ hero slides (รูป, ข้อความ, CTA, ช่วงเวลาแสดง), เรียงลำดับ | 
editor+
 | 
Pages | 
/admin/pages | 
แก้หน้า static เช่น About ด้วย markdown | 
editor+
 | 
Media | 
/admin/media | 
อัปโหลด, ใส่ alt text, credit ที่มารูป, ดูว่าไฟล์ถูกใช้ที่ไหน | 
editor+
 | 
Users | 
/admin/users | 
ดูผู้ใช้, เปลี่ยน role, แบน fan | 
admin
 | 
Settings | 
/admin/settings | 
ชื่อเว็บ, social links, nav, footer, prompt ของ AI blog | 
admin
 | 
Activity Log | 
/admin/activity | 
ใครแก้อะไรเมื่อไร | 
admin
หน้า admin ป้องกัน 2 ชั้น: middleware.ts เช็ก session + role ก่อนเข้า /admin/* และ RLS ใน database เป็นด่านสุดท้ายเผื่อ UI หลุด
## 5. Database Schema
มี 19 ตารางใน Postgres ทุกตารางเนื้อหามี status (draft / published / archived), created_at, updated_at, updated_by เพื่อให้ CMS ทำ draft/publish และ audit ได้แบบเดียวกันหมด
ความสัมพันธ์หลัก

members 1—N member_facts

albums 1—N tracks; tracks N—N members ผ่าน track_members

posts N—N tags ผ่าน post_tags; posts N—1 members (optional, member_id)

ai_jobs 1—1 posts (draft ที่ AI สร้าง)

game_scores N—1 profiles; city_spots ชี้ไป member/event/post ได้ (polymorphic link_type + link_id)

ทุกคอลัมน์รูป/ไฟล์ชี้ไป media.id
DDL (Supabase / Postgres)= 0),
  played_at timestamptz not null default now()
);
create index on game_scores (season, score desc);

-- Mini City
create table city_spots (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  pos_x real not null, pos_y real not null, pos_z real not null,
  model_id uuid references media,      -- .glb
  link_type text check (link_type in ('member','event','post','url')),
  link_id uuid,
  link_url text,
  status content_status not null default 'draft'
);

-- Pages & Home
create table hero_slides (
  id uuid primary key default gen_random_uuid(),
  image_id uuid not null references media,
  headline text,
  subline text,
  cta_label text,
  cta_url text,
  show_from timestamptz,
  show_until timestamptz,
  sort_order int not null default 0,
  status content_status not null default 'draft'
);

create table pages (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,           -- about, privacy ...
  title text not null,
  body_md text not null default '',
  status content_status not null default 'draft',
  updated_at timestamptz not null default now(),
  updated_by uuid references profiles
);

create table site_settings (
  key text primary key,                -- site_name, social_links, nav, footer, ai_prompt
  value jsonb not null,
  updated_at timestamptz not null default now()
);

-- Audit
create table activity_log (
  id bigint generated always as identity primary key,
  actor_id uuid references profiles,
  action text not null,                -- create, update, publish, delete
  entity text not null,                -- ชื่อตาราง
  entity_id text not null,
  diff jsonb,
  created_at timestamptz not null default now()
);]]>
ใช้ trigger ตัวเดียว set_updated_at() ผูกทุกตารางที่มี updated_at และ trigger log_activity() บนตารางเนื้อหาเพื่อเขียน activity_log อัตโนมัติ
## 6. Permissions, AI Blog Pipeline และลำดับการสร้าง
RLS (Row Level Security)
 | 
ตาราง | 
anon / fan อ่าน | 
fan เขียน | 
editor | 
admin
 | 
ตารางเนื้อหา (members, albums, posts, events, city_spots, hero_slides, pages) | 
เฉพาะ status='published' (posts ต้อง published_at <= now() ด้วย) | 
ไม่ได้ | 
CRUD ทั้งหมด | 
CRUD ทั้งหมด
 | 
ตารางลูก (member_facts, tracks, track_members, post_tags) | 
ตามสถานะของแม่ | 
ไม่ได้ | 
CRUD | 
CRUD
 | 
game_scores | 
อ่านได้ทั้งหมด | 
insert ผ่าน API เท่านั้น (service role) | 
delete | 
delete
 | 
profiles | 
อ่าน display_name | 
แก้ของตัวเอง ยกเว้น role | 
อ่าน | 
แก้ role
 | 
ai_jobs, activity_log, site_settings (key ai_prompt) | 
ไม่ได้ | 
ไม่ได้ | 
อ่าน | 
ทั้งหมด
เช็ก role ใน policy ด้วย function is_editor() ที่อ่าน profiles.role ของ auth.uid() (ประกาศเป็น security definer)
AI Daily Blog pipeline

Vercel Cron เรียก /api/cron/ai-blog ทุกวัน 09:00 (เวลาไทย) พร้อม CRON_SECRET

Insert ai_jobs ด้วย run_date = today ถ้าซ้ำ = วันนี้รันแล้ว หยุด

ดึง context: event ถัดไป, เพลงล่าสุด, prompt จาก site_settings.ai_prompt

เรียก LLM สร้าง title + body markdown → insert posts (source='ai', status='draft') → ai_jobs.state='drafted'

Editor เปิด AI Queue แก้ข้อเท็จจริงแล้ว Approve → status='published' + revalidate posts

Error ใดๆ → state='failed' + เก็บ error ให้เห็นในหน้า AI Queue
AI ไม่ publish เองเด็ดขาด เพราะข้อมูลศิลปินจริงผิดพลาดได้ ต้องมีคนตรวจก่อนทุกครั้ง
ลำดับการสร้าง

Supabase: enum, ตาราง, trigger, RLS + seed site_settings

Auth + middleware /admin + layout CMS + Media Library (ทุก module พึ่งตัวนี้)

Members (CMS + public 2 หน้า) เพื่อพิสูจน์แพทเทิร์น List/Form/Publish/Revalidate

Music, Schedule, Pages ใช้แพทเทิร์นเดิม

Home Builder + หน้า Home รวมทุก module

Blog + AI Queue + cron

Game + leaderboard API

Mini City (หนักสุด ทำท้าย)
คำถามที่ยังเปิดอยู่:

Mini Game เป็นเกมแบบไหน (quiz, จับคู่การ์ด, rhythm) เพราะกำหนดโครง game_items.payload

ต้องรองรับ 2 ภาษา (TH/EN) ไหม ถ้าใช่ ต้องเพิ่มตาราง translation หรือคอลัมน์ jsonb ต่อภาษาตั้งแต่ต้น