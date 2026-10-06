import type {
  Attempt,
  DataStore,
  Homework,
  NewAttempt,
  NewHomework,
  Profile,
  Role,
  StepProgress,
  Submission,
  UserQuery,
  VocabProgress,
} from './types';

/**
 * Dev/demo store kept in localStorage. No passwords: the login page offers
 * a role picker instead. Lets the whole UI run without Supabase.
 */
const PROFILES: Record<Role, Profile> = {
  teacher: { id: 'local-teacher', email: 'teacher@local', role: 'teacher', displayName: 'Vasyl' },
  student: { id: 'local-student', email: 'student@local', role: 'student', displayName: 'Учениця' },
};

const KEY = 'ckzk.local.v1';

type DB = {
  session: Role | null;
  attempts: Attempt[];
  steps: StepProgress[];
  vocab: VocabProgress[];
  homework: Homework[];
  submissions: Submission[];
  photos: Record<string, string>;
};

const empty = (): DB => ({ session: null, attempts: [], steps: [], vocab: [], homework: [], submissions: [], photos: {} });

const uid = () => Math.random().toString(36).slice(2) + Date.now().toString(36);
const now = () => new Date().toISOString();

const readFile = (f: File) =>
  new Promise<string>((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(r.error);
    r.readAsDataURL(f);
  });

export class LocalDataStore implements DataStore {
  readonly kind = 'local' as const;
  private listeners = new Set<(p: Profile | null) => void>();

  private load(): DB {
    try {
      return { ...empty(), ...JSON.parse(localStorage.getItem(KEY) ?? '{}') };
    } catch {
      return empty();
    }
  }

  private save(db: DB) {
    localStorage.setItem(KEY, JSON.stringify(db));
  }

  private update(fn: (db: DB) => void) {
    const db = this.load();
    fn(db);
    this.save(db);
  }

  private me(): Profile {
    const role = this.load().session;
    if (!role) throw new Error('Не виконано вхід');
    return PROFILES[role];
  }

  async getSession() {
    const role = this.load().session;
    return role ? PROFILES[role] : null;
  }

  onAuthChange(cb: (p: Profile | null) => void) {
    this.listeners.add(cb);
    return () => this.listeners.delete(cb);
  }

  private emit() {
    const role = this.load().session;
    this.listeners.forEach((l) => l(role ? PROFILES[role] : null));
  }

  /** Dev-only login. */
  async loginAs(role: Role) {
    this.update((db) => (db.session = role));
    this.emit();
  }

  async signIn() {
    throw new Error('У локальному режимі оберіть роль.');
  }

  async signUp() {
    throw new Error('У локальному режимі оберіть роль.');
  }

  async signOut() {
    this.update((db) => (db.session = null));
    this.emit();
  }

  async listStudents() {
    return [PROFILES.student];
  }

  async saveAttempt(a: NewAttempt) {
    const me = this.me();
    this.update((db) => db.attempts.push({ ...a, id: uid(), userId: me.id, createdAt: now() }));
  }

  async listAttempts(q: UserQuery) {
    return this.load().attempts.filter((a) => a.userId === q.userId && (!q.lessonId || a.lessonId === q.lessonId));
  }

  async setStepDone(lessonId: string, stepId: string, done: boolean) {
    const me = this.me();
    this.update((db) => {
      db.steps = db.steps.filter((s) => !(s.userId === me.id && s.lessonId === lessonId && s.stepId === stepId));
      if (done) db.steps.push({ userId: me.id, lessonId, stepId, completedAt: now() });
    });
  }

  async listStepProgress(q: UserQuery) {
    return this.load().steps.filter((s) => s.userId === q.userId && (!q.lessonId || s.lessonId === q.lessonId));
  }

  async setVocab(lessonId: string, wordId: string, known: boolean) {
    const me = this.me();
    this.update((db) => {
      db.vocab = db.vocab.filter((v) => !(v.userId === me.id && v.wordId === wordId));
      db.vocab.push({ userId: me.id, lessonId, wordId, known, updatedAt: now() });
    });
  }

  async listVocab(q: UserQuery) {
    return this.load().vocab.filter((v) => v.userId === q.userId && (!q.lessonId || v.lessonId === q.lessonId));
  }

  async listHomework(lessonId?: string) {
    return this.load()
      .homework.filter((h) => !lessonId || h.lessonId === lessonId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async createHomework(h: NewHomework) {
    this.update((db) => db.homework.push({ ...h, id: uid(), createdAt: now() }));
  }

  async deleteHomework(id: string) {
    this.update((db) => {
      db.homework = db.homework.filter((h) => h.id !== id);
      db.submissions = db.submissions.filter((s) => s.homeworkId !== id);
    });
  }

  async listSubmissions(q: { homeworkId?: string; studentId?: string }) {
    return this.load().submissions.filter(
      (s) => (!q.homeworkId || s.homeworkId === q.homeworkId) && (!q.studentId || s.studentId === q.studentId),
    );
  }

  async submitHomework(homeworkId: string, answerText: string, newPhotos: File[], keepPhotos: string[]) {
    const me = this.me();
    const added: Record<string, string> = {};
    for (const f of newPhotos) added[`${me.id}/${homeworkId}/${uid()}`] = await readFile(f);
    this.update((db) => {
      Object.assign(db.photos, added);
      const prev = db.submissions.find((s) => s.homeworkId === homeworkId && s.studentId === me.id);
      const row: Submission = {
        id: prev?.id ?? uid(),
        homeworkId,
        studentId: me.id,
        answerText,
        photoPaths: [...keepPhotos, ...Object.keys(added)],
        status: 'submitted',
        teacherComment: prev?.teacherComment ?? null,
        grade: prev?.grade ?? null,
        submittedAt: now(),
        reviewedAt: prev?.reviewedAt ?? null,
      };
      db.submissions = db.submissions.filter((s) => s.id !== row.id).concat(row);
    });
  }

  async reviewSubmission(id: string, review: { teacherComment: string; grade: string }) {
    this.update((db) => {
      const s = db.submissions.find((x) => x.id === id);
      if (s) Object.assign(s, review, { status: 'reviewed', reviewedAt: now() });
    });
  }

  async photoUrl(path: string) {
    return this.load().photos[path] ?? '';
  }
}
