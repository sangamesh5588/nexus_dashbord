'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../lib/supabase';
import type { Platform } from '../types/post';

type FormState = {
  caption: string;
  imageUrl: string;
  scheduledAt: string;
  platforms: Platform[];
};

const initialState: FormState = {
  caption: '',
  imageUrl: '',
  scheduledAt: '',
  platforms: ['instagram', 'linkedin'],
};

export function SubmitPostForm() {
  const [form, setForm] = useState<FormState>(initialState);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  function togglePlatform(platform: Platform) {
    setForm((current) => {
      const platforms = current.platforms.includes(platform)
        ? current.platforms.filter((item) => item !== platform)
        : [...current.platforms, platform];

      return { ...current, platforms };
    });
  }

  async function uploadImage() {
    if (!imageFile) {
      return form.imageUrl.trim() || undefined;
    }

    const { data: sessionData } = await supabase.auth.getSession();
    const userId = sessionData.session?.user.id;

    if (!userId) {
      throw new Error('Sign in again before uploading media.');
    }

    const extension = imageFile.name.split('.').pop()?.toLowerCase() || 'jpg';
    const path = `${userId}/${crypto.randomUUID()}.${extension}`;
    const { error: uploadError } = await supabase.storage.from('post-images').upload(path, imageFile, {
      cacheControl: '3600',
      contentType: imageFile.type,
      upsert: false,
    });

    if (uploadError) {
      throw new Error(uploadError.message);
    }

    const { data } = supabase.storage.from('post-images').getPublicUrl(path);
    return data.publicUrl;
  }

  async function submitPost(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage(null);

    if (!form.caption.trim()) {
      setError('Add a caption before submitting.');
      return;
    }

    if (form.platforms.length === 0) {
      setError('Choose at least one platform.');
      return;
    }

    setIsSubmitting(true);

    try {
      const imageUrl = await uploadImage();
      const response = await fetch('/api/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          caption: form.caption.trim(),
          imageUrl,
          scheduledAt: form.scheduledAt || undefined,
          platforms: form.platforms,
        }),
      });

      const payload = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(payload.error || 'Unable to submit post.');
      }

      setForm(initialState);
      setImageFile(null);
      setMessage('Post saved. Scheduled content will stay queued, unscheduled content is sent now.');
      router.refresh();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Unable to submit post.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="form-panel form-grid" onSubmit={submitPost}>
      {message ? <div className="status-message">{message}</div> : null}
      {error ? <div className="status-message status-error">{error}</div> : null}

      <div className="field">
        <label htmlFor="caption">Caption</label>
        <textarea
          id="caption"
          value={form.caption}
          onChange={(event) => setForm((current) => ({ ...current, caption: event.target.value }))}
          placeholder="Write the post caption..."
          required
        />
      </div>

      <div className="field">
        <label htmlFor="image-file">Upload image</label>
        <input
          accept="image/png,image/jpeg,image/webp"
          id="image-file"
          type="file"
          onChange={(event) => setImageFile(event.target.files?.[0] || null)}
        />
      </div>

      <div className="field">
        <label htmlFor="image-url">Or paste image URL</label>
        <input
          id="image-url"
          type="url"
          value={form.imageUrl}
          onChange={(event) => setForm((current) => ({ ...current, imageUrl: event.target.value }))}
          placeholder="https://example.com/image.jpg"
        />
      </div>

      <fieldset className="form-grid">
        <legend className="fieldset-label">Platforms</legend>
        <div className="checkbox-grid">
          <label className="check-card">
            <input
              checked={form.platforms.includes('instagram')}
              type="checkbox"
              onChange={() => togglePlatform('instagram')}
            />
            Instagram
          </label>
          <label className="check-card">
            <input
              checked={form.platforms.includes('linkedin')}
              type="checkbox"
              onChange={() => togglePlatform('linkedin')}
            />
            LinkedIn
          </label>
        </div>
      </fieldset>

      <div className="field">
        <label htmlFor="scheduled-at">Scheduling date</label>
        <input
          id="scheduled-at"
          type="datetime-local"
          value={form.scheduledAt}
          onChange={(event) => setForm((current) => ({ ...current, scheduledAt: event.target.value }))}
        />
      </div>

      <button className="button" disabled={isSubmitting} type="submit">
        {isSubmitting ? 'Submitting...' : 'Submit post'}
      </button>
    </form>
  );
}
