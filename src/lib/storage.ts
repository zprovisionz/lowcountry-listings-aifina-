// src/lib/storage.ts
// Helpers for uploading property photos to Supabase Storage
// Bucket: property-photos (public, created in migration 003)

import { supabase } from './supabase';

export interface UploadResult {
  publicUrl: string;
  path: string;
}

/**
 * Upload a single photo File to Supabase Storage under the user's folder.
 * Returns the public URL for use in OpenAI Vision and in the DB.
 */
export async function uploadPropertyPhoto(
  userId: string,
  file: File,
  generationId: string,
): Promise<UploadResult> {
  const ext  = file.name.split('.').pop()?.toLowerCase() ?? 'jpg';
  const name = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const path = `${userId}/${generationId}/${name}`;

  const { error } = await supabase.storage
    .from('property-photos')
    .upload(path, file, {
      contentType:  file.type,
      cacheControl: '31536000',
      upsert:       false,
    });

  if (error) throw new Error(`Photo upload failed: ${error.message}`);

  const { data: { publicUrl } } = supabase.storage
    .from('property-photos')
    .getPublicUrl(path);

  return { publicUrl, path };
}

/**
 * Upload multiple photos in parallel (max 10).
 * Returns an array of public URLs in the same order as the input files.
 */
export async function uploadPropertyPhotos(
  userId: string,
  files: File[],
  generationId: string,
): Promise<string[]> {
  const results = await Promise.allSettled(
    files.slice(0, 10).map(f => uploadPropertyPhoto(userId, f, generationId))
  );

  const urls: string[] = [];
  for (const result of results) {
    if (result.status === 'fulfilled') {
      urls.push(result.value.publicUrl);
    } else {
      console.warn('Photo upload failed:', result.reason);
      // Continue — partial upload is acceptable; Vision will analyze what it gets
    }
  }

  return urls;
}

/**
 * Delete a photo from Supabase Storage by its path.
 */
export async function deletePropertyPhoto(path: string): Promise<void> {
  await supabase.storage.from('property-photos').remove([path]);
}
