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

    let { error } = await admin.storage
      .from(BUCKET_NAME)
      .upload(filePath, fileBuffer, {
        contentType,
        upsert: true,
      });

    if (error && (error.message?.toLowerCase().includes('not found') || error.message?.toLowerCase().includes('bucket'))) {
      try {
        console.warn('[storageService] Bucket "attendance" missing, attempting auto-creation...');
        await admin.storage.createBucket(BUCKET_NAME, {
          public: false,
          fileSizeLimit: 10485760,
        });

        const retry = await admin.storage
          .from(BUCKET_NAME)
          .upload(filePath, fileBuffer, {
            contentType,
            upsert: true,
          });
        error = retry.error;
      } catch (bucketErr) {
        console.warn('[storageService] Bucket auto-creation warning:', bucketErr);
      }
    }

    if (error) {
      console.warn('[storageService.uploadAttendancePhoto] Upload warning:', error.message);
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
