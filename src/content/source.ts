import type { SupabaseClient } from '@supabase/supabase-js';
import { lessonIndex, parseLesson, type Lesson, type LessonIndex } from './schema';

/** Where lesson JSON and publisher audio come from. */
export interface ContentSource {
  listLessons(): Promise<LessonIndex>;
  getLesson(id: string): Promise<Lesson>;
  audioUrl(track: string): Promise<string>;
}

/** Dev: files served by the `local-content` Vite plugin. */
export class LocalContentSource implements ContentSource {
  private base = import.meta.env.BASE_URL;

  async listLessons() {
    const res = await fetch(`${this.base}__content/lessons/index.json`);
    if (!res.ok) throw new Error(`Не вдалося завантажити список уроків (${res.status})`);
    return lessonIndex.parse(await res.json());
  }

  async getLesson(id: string) {
    const res = await fetch(`${this.base}__content/lessons/${id}.json`);
    if (!res.ok) throw new Error(`Урок ${id} не знайдено (${res.status})`);
    return parseLesson(await res.json());
  }

  async audioUrl(track: string) {
    return `${this.base}__audio/${track}.mp3`;
  }
}

/** Prod: private Storage buckets `content` and `audio`, readable only when signed in. */
export class SupabaseContentSource implements ContentSource {
  private urls = new Map<string, { url: string; expires: number }>();

  constructor(private sb: SupabaseClient) {}

  private async json(path: string) {
    const { data, error } = await this.sb.storage.from('content').download(path, {}, { cache: 'no-store' });
    if (error) throw new Error(`Не вдалося завантажити ${path}: ${error.message}`);
    return JSON.parse(await data.text());
  }

  async listLessons() {
    return lessonIndex.parse(await this.json('lessons/index.json'));
  }

  async getLesson(id: string) {
    return parseLesson(await this.json(`lessons/${id}.json`));
  }

  async audioUrl(track: string) {
    const hit = this.urls.get(track);
    if (hit && hit.expires > Date.now()) return hit.url;
    const ttl = 6 * 3600;
    const { data, error } = await this.sb.storage.from('audio').createSignedUrl(`${track}.mp3`, ttl);
    if (error) throw new Error(`Аудіо ${track}: ${error.message}`);
    this.urls.set(track, { url: data.signedUrl, expires: Date.now() + (ttl - 600) * 1000 });
    return data.signedUrl;
  }
}
