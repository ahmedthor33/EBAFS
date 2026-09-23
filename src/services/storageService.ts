import { supabase, isSupabaseConfigured } from '../lib/supabase';

export interface UploadResult {
  url: string;
  path: string;
  error?: string;
}

export const storageService = {
  bucketName: 'product-images',

  validateFile(file: File): { valid: boolean; error?: string } {
    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/gif'];
    const maxSize = 5 * 1024 * 1024; // 5MB

    if (!validTypes.includes(file.type)) {
      return {
        valid: false,
        error: `Invalid file format "${file.type}". Please upload JPEG, PNG, WebP, or AVIF.`,
      };
    }

    if (file.size > maxSize) {
      return {
        valid: false,
        error: `File size exceeds 5MB limit (${(file.size / (1024 * 1024)).toFixed(1)}MB).`,
      };
    }

    return { valid: true };
  },

  async uploadProductImage(file: File, folder = 'products'): Promise<UploadResult> {
    const validation = this.validateFile(file);
    if (!validation.valid) {
      return { url: '', path: '', error: validation.error };
    }

    const readFileAsDataUrl = (): Promise<string> => {
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve((reader.result as string) || '');
        reader.onerror = () => resolve('');
        reader.readAsDataURL(file);
      });
    };

    if (!isSupabaseConfigured()) {
      const dataUrl = await readFileAsDataUrl();
      return {
        url: dataUrl,
        path: `local/${file.name}`,
      };
    }

    try {
      const ext = file.name.split('.').pop() || 'jpg';
      const cleanFileName = file.name
        .replace(/[^a-zA-Z0-9.-]/g, '_')
        .toLowerCase();
      const filePath = `${folder}/${Date.now()}_${Math.random().toString(36).substring(2, 8)}_${cleanFileName}`;

      const { data, error } = await supabase.storage
        .from(this.bucketName)
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true,
        });

      if (error) {
        throw error;
      }

      const { data: publicUrlData } = supabase.storage
        .from(this.bucketName)
        .getPublicUrl(data.path);

      return {
        url: publicUrlData.publicUrl,
        path: data.path,
      };
    } catch (err: any) {
      console.warn('Supabase storage upload notice (falling back to local data URL):', err?.message || err);
      // Fallback: Read as Base64 Data URL so the user is never blocked by network, CORS, or storage RLS errors
      try {
        const dataUrl = await readFileAsDataUrl();
        if (dataUrl) {
          return {
            url: dataUrl,
            path: `local/${file.name}`,
          };
        }
      } catch (readErr) {
        console.error('File read fallback error:', readErr);
      }

      return {
        url: '',
        path: '',
        error: err?.message || 'Image upload failed. Ensure bucket "product-images" exists in Supabase Storage.',
      };
    }
  },

  async deleteProductImage(pathOrUrl: string): Promise<boolean> {
    if (!isSupabaseConfigured()) return true;

    try {
      // Extract path from full URL if needed
      let path = pathOrUrl;
      if (pathOrUrl.includes(this.bucketName)) {
        const parts = pathOrUrl.split(`${this.bucketName}/`);
        if (parts.length > 1) {
          path = parts[1];
        }
      }

      const { error } = await supabase.storage.from(this.bucketName).remove([path]);
      if (error) throw error;
      return true;
    } catch (err) {
      console.warn('Delete image warning:', err);
      return false;
    }
  },
};
