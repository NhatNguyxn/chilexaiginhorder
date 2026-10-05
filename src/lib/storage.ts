import { getAdminClient } from '@/lib/supabase/admin';
import { supabase as clientSupabase, isSupabaseConfigured } from '@/lib/supabase/client';

const BUCKET_NAME = 'attendance';

export const storageService = {
  /**
   * Upload an attendance photo to the private attendance storage bucket.
   */
  async uploadAttendancePhoto(
    fileBuffer: Buffer | Uint8Array,
    filePath: string,
    contentType: string = 'image/jpeg'
  ): Promise<string> {
    const admin = getAdminClient() || clientSupabase;
    if (!isSupabaseConfigured || !admin) {
      // In-memory/demo preview mode
      return `local://${filePath}`;
    }

    const { error } = await admin.storage
      .from(BUCKET_NAME)
      .upload(filePath, fileBuffer, {
        contentType,
        upsert: true,
      });

    if (error) {
      console.error('[storageService.uploadAttendancePhoto] Upload error:', error.message);
      // Fallback: return file path so DB can still record it
    }

    return filePath;
  },

  /**
   * Generate a short-lived signed URL for viewing private attendance photos.
   */
  async getSignedUrl(filePath: string, expiresIn: number = 3600): Promise<string> {
    if (!filePath) return '/logo.png';
    if (filePath.startsWith('http://') || filePath.startsWith('https://') || filePath.startsWith('data:')) {
      return filePath;
    }

    const admin = getAdminClient() || clientSupabase;
    if (!isSupabaseConfigured || !admin) {
      return '/logo.png';
    }

    try {
      const { data, error } = await admin.storage
        .from(BUCKET_NAME)
        .createSignedUrl(filePath, expiresIn);

      if (error || !data?.signedUrl) {
        return '/logo.png';
      }
      return data.signedUrl;
    } catch {
      return '/logo.png';
    }
  },
};
