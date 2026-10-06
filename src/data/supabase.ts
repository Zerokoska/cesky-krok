import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  Attempt,
  DataStore,
  Homework,
  NewAttempt,
  NewHomework,
  Profile,
  StepProgress,
  Submission,
  UserQuery,
  VocabProgress,
} from './types';

type Row = Record<string, any>;

const toProfile = (r: Row): Profile => ({ id: r.id, email: r.email, role: r.role, displayName: r.display_name });

const toAttempt = (r: Row): Attempt => ({
  id: r.id,
  userId: r.user_id,
  lessonId: r.lesson_id,
  stepId: r.step_id,
  exerciseId: r.exercise_id,
  score: r.score,
  max: r.max,
  items: r.items ?? [],
  durationSec: r.duration_sec,
  createdAt: r.created_at,
});

const toHomework = (r: Row): Homework => ({
  id: r.id,
  lessonId: r.lesson_id,
  title: r.title,
  instructions: r.instructions,
  exerciseRef: r.exercise_ref,
  dueDate: r.due_date,
  createdAt: r.created_at,
});

const toSubmission = (r: Row): Submission => ({
  id: r.id,
  homeworkId: r.homework_id,
  studentId: r.student_id,
  answerText: r.answer_text ?? '',
  photoPaths: r.photo_paths ?? [],
  status: r.status,
  teacherComment: r.teacher_comment,
  grade: r.grade,
  submittedAt: r.submitted_at,
  reviewedAt: r.reviewed_at,
});

function check<T>(res: { data: T | null; error: { message: string } | null }): T {
  if (res.error) throw new Error(res.error.message);
  return (res.data ?? []) as T;
}

function friendlyAuthError(message: string): string {
  if (/database error saving new user/i.test(message)) return 'Цей email не має доступу до застосунку.';
  if (/invalid login credentials/i.test(message)) return 'Неправильний email або пароль.';
  if (/already registered/i.test(message)) return 'Цей email уже зареєстровано — увійдіть.';
  if (/password should be at least/i.test(message)) return 'Пароль має бути щонайменше 8 символів.';
  return message;
}

export class SupabaseDataStore implements DataStore {
  readonly kind = 'supabase' as const;
  private profile: Profile | null = null;

  constructor(private sb: SupabaseClient) {}

  private async loadProfile(userId: string): Promise<Profile | null> {
    const { data, error } = await this.sb.from('profiles').select('*').eq('id', userId).maybeSingle();
    if (error) throw new Error(error.message);
    this.profile = data ? toProfile(data) : null;
    return this.profile;
  }

  private async uid(): Promise<string> {
    if (this.profile) return this.profile.id;
    const { data } = await this.sb.auth.getSession();
    if (!data.session) throw new Error('Не виконано вхід');
    return data.session.user.id;
  }

  async getSession() {
    const { data } = await this.sb.auth.getSession();
    if (!data.session) return null;
    return this.loadProfile(data.session.user.id);
  }

  onAuthChange(cb: (p: Profile | null) => void) {
    let emitted: string | null = null;
    const { data } = this.sb.auth.onAuthStateChange((_event, session) => {
      // Supabase advises not to await its own calls inside this callback.
      setTimeout(async () => {
        if (!session) {
          this.profile = null;
          emitted = null;
          cb(null);
          return;
        }
        // Token refreshes re-fire this event; only a different user needs a new profile.
        if (session.user.id === emitted) return;
        try {
          const p = this.profile?.id === session.user.id ? this.profile : await this.loadProfile(session.user.id);
          emitted = session.user.id;
          cb(p);
        } catch (e) {
          // signIn() reports this to the user; here we only avoid an unhandled rejection.
          console.error('Profile load failed', e);
        }
      });
    });
    return () => data.subscription.unsubscribe();
  }

  async signIn(email: string, password: string) {
    const { data, error } = await this.sb.auth.signInWithPassword({ email, password });
    if (error) throw new Error(friendlyAuthError(error.message));
    let profile: Profile | null;
    try {
      profile = await this.loadProfile(data.user.id);
    } catch (e) {
      throw new Error(`Вхід виконано, але профіль не завантажився: ${e instanceof Error ? e.message : e}. Спробуйте ще раз.`);
    }
    if (!profile) throw new Error('Профіль не знайдено. Зверніться до вчителя.');
  }

  async signUp(email: string, password: string, displayName: string) {
    const { data, error } = await this.sb.auth.signUp({
      email,
      password,
      options: { data: { display_name: displayName } },
    });
    if (error) throw new Error(friendlyAuthError(error.message));
    if (!data.session) await this.signIn(email, password);
  }

  async signOut() {
    await this.sb.auth.signOut();
    this.profile = null;
  }

  async listStudents() {
    return check(await this.sb.from('profiles').select('*').eq('role', 'student').order('created_at')).map(toProfile);
  }

  async saveAttempt(a: NewAttempt) {
    check(
      await this.sb.from('attempts').insert({
        lesson_id: a.lessonId,
        step_id: a.stepId,
        exercise_id: a.exerciseId,
        score: a.score,
        max: a.max,
        items: a.items,
        duration_sec: a.durationSec,
      }),
    );
  }

  async listAttempts(q: UserQuery) {
    let query = this.sb.from('attempts').select('*').eq('user_id', q.userId);
    if (q.lessonId) query = query.eq('lesson_id', q.lessonId);
    return check(await query.order('created_at')).map(toAttempt);
  }

  async setStepDone(lessonId: string, stepId: string, done: boolean) {
    const userId = await this.uid();
    if (done) {
      check(
        await this.sb
          .from('step_progress')
          .upsert({ user_id: userId, lesson_id: lessonId, step_id: stepId, completed_at: new Date().toISOString() }),
      );
    } else {
      check(
        await this.sb.from('step_progress').delete().match({ user_id: userId, lesson_id: lessonId, step_id: stepId }),
      );
    }
  }

  async listStepProgress(q: UserQuery): Promise<StepProgress[]> {
    let query = this.sb.from('step_progress').select('*').eq('user_id', q.userId);
    if (q.lessonId) query = query.eq('lesson_id', q.lessonId);
    return check(await query).map((r: Row) => ({
      userId: r.user_id,
      lessonId: r.lesson_id,
      stepId: r.step_id,
      completedAt: r.completed_at,
    }));
  }

  async setVocab(lessonId: string, wordId: string, known: boolean) {
    const userId = await this.uid();
    check(
      await this.sb.from('vocab_progress').upsert({
        user_id: userId,
        lesson_id: lessonId,
        word_id: wordId,
        known,
        updated_at: new Date().toISOString(),
      }),
    );
  }

  async listVocab(q: UserQuery): Promise<VocabProgress[]> {
    let query = this.sb.from('vocab_progress').select('*').eq('user_id', q.userId);
    if (q.lessonId) query = query.eq('lesson_id', q.lessonId);
    return check(await query).map((r: Row) => ({
      userId: r.user_id,
      lessonId: r.lesson_id,
      wordId: r.word_id,
      known: r.known,
      updatedAt: r.updated_at,
    }));
  }

  async listHomework(lessonId?: string) {
    let query = this.sb.from('homework').select('*');
    if (lessonId) query = query.eq('lesson_id', lessonId);
    return check(await query.order('created_at', { ascending: false })).map(toHomework);
  }

  async createHomework(h: NewHomework) {
    check(
      await this.sb.from('homework').insert({
        lesson_id: h.lessonId,
        title: h.title,
        instructions: h.instructions,
        exercise_ref: h.exerciseRef,
        due_date: h.dueDate,
      }),
    );
  }

  async deleteHomework(id: string) {
    const subs = check(await this.sb.from('submissions').select('photo_paths').eq('homework_id', id)) as Row[];
    const photos = subs.flatMap((s) => (s.photo_paths as string[]) ?? []);
    check(await this.sb.from('homework').delete().eq('id', id));
    if (photos.length) await this.sb.storage.from('homework').remove(photos);
  }

  async listSubmissions(q: { homeworkId?: string; studentId?: string }) {
    let query = this.sb.from('submissions').select('*');
    if (q.homeworkId) query = query.eq('homework_id', q.homeworkId);
    if (q.studentId) query = query.eq('student_id', q.studentId);
    return check(await query.order('submitted_at', { ascending: false })).map(toSubmission);
  }

  async submitHomework(homeworkId: string, answerText: string, newPhotos: File[], keepPhotos: string[]) {
    const userId = await this.uid();
    const { data: prev } = await this.sb
      .from('submissions')
      .select('photo_paths')
      .match({ homework_id: homeworkId, student_id: userId })
      .maybeSingle();
    const uploaded: string[] = [];
    const removeFiles = async (paths: string[]) => {
      if (paths.length) await this.sb.storage.from('homework').remove(paths);
    };
    try {
      for (const f of newPhotos) {
        const ext = (f.name.split('.').pop() || 'jpg').toLowerCase();
        const path = `${userId}/${homeworkId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
        const { error } = await this.sb.storage.from('homework').upload(path, f, { contentType: f.type || 'image/jpeg' });
        if (error) throw new Error(`Фото не завантажилось: ${error.message}`);
        uploaded.push(path);
      }
      check(
        await this.sb.from('submissions').upsert(
          {
            homework_id: homeworkId,
            student_id: userId,
            answer_text: answerText,
            photo_paths: [...keepPhotos, ...uploaded],
            status: 'submitted',
          },
          { onConflict: 'homework_id,student_id' },
        ),
      );
    } catch (e) {
      await removeFiles(uploaded);
      throw e;
    }
    // Photos the student removed from the answer.
    await removeFiles(((prev?.photo_paths as string[] | undefined) ?? []).filter((p) => !keepPhotos.includes(p)));
  }

  async reviewSubmission(id: string, review: { teacherComment: string; grade: string }) {
    check(
      await this.sb
        .from('submissions')
        .update({
          teacher_comment: review.teacherComment,
          grade: review.grade,
          status: 'reviewed',
          reviewed_at: new Date().toISOString(),
        })
        .eq('id', id),
    );
  }

  async photoUrl(path: string) {
    const { data, error } = await this.sb.storage.from('homework').createSignedUrl(path, 3600);
    if (error) throw new Error(error.message);
    return data.signedUrl;
  }
}
