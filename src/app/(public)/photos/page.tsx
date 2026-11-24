import type { Metadata } from "next";
import { PhotoBoard } from "@/components/photos/PhotoBoard";
import { getPhotoEras } from "@/lib/db/photos";

export const metadata: Metadata = {
  title: "Photos",
  description: "Hearts2Hearts concept photos, teasers and stage shots, grouped by era.",
};

export default async function PhotosPage() {
  return <PhotoBoard eras={await getPhotoEras()} />;
}
