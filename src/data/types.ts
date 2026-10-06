import type { ItemResult } from '../lib/grade';

export type Role = 'teacher' | 'student';

export type Profile = { id: string; email: string; role: Role; displayName: string };

export type Attempt = {
  id: string;
  userId: string;
  lessonId: string;
  stepId: string;
  exerciseId: string;
  score: number;
  max: number;
  items: ItemResult[];
  durationSec: number;
  createdAt: string;
};
export type NewAttempt = Omit<Attempt, 'id' | 'userId' | 'createdAt'>;

export type StepProgress = { userId: string; lessonId: string; stepId: string; completedAt: string };

export type VocabProgress = { userId: string; lessonId: string; wordId: string; known: boolean; updatedAt: string };

export type Homework = {
  id: string;
  lessonId: string;
  title: string;
  instructions: string;
  /** Optional link to an in-app exercise: "stepId/exerciseId". */
  exerciseRef: string | null;
  dueDate: string | null;
  createdAt: string;
};
export type NewHomework = Omit<Homework, 'id' | 'createdAt'>;

export type Submission = {
  id: string;
  homeworkId: string;
  studentId: string;
  answerText: string;
  photoPaths: string[];
  status: 'submitted' | 'reviewed';
  teacherComment: string | null;
  grade: string | null;
  submittedAt: string;
  reviewedAt: string | null;
};

export type UserQuery = { userId: string; lessonId?: string };

/** Everything the UI persists goes through this interface. */
export interface DataStore {
  readonly kind: 'local' | 'supabase';

  getSession(): Promise<Profile | null>;
  onAuthChange(cb: (p: Profile | null) => void): () => void;
  signIn(email: string, password: string): Promise<void>;
  signUp(email: string, password: string, displayName: string): Promise<void>;
  signOut(): Promise<void>;
  listStudents(): Promise<Profile[]>;

  saveAttempt(a: NewAttempt): Promise<void>;
  listAttempts(q: UserQuery): Promise<Attempt[]>;

  setStepDone(lessonId: string, stepId: string, done: boolean): Promise<void>;
  listStepProgress(q: UserQuery): Promise<StepProgress[]>;

  setVocab(lessonId: string, wordId: string, known: boolean): Promise<void>;
  listVocab(q: UserQuery): Promise<VocabProgress[]>;

  listHomework(lessonId?: string): Promise<Homework[]>;
  createHomework(h: NewHomework): Promise<void>;
  deleteHomework(id: string): Promise<void>;
  listSubmissions(q: { homeworkId?: string; studentId?: string }): Promise<Submission[]>;
  /** Creates or replaces the current student's submission. `keepPhotos` are existing paths to keep. */
  submitHomework(homeworkId: string, answerText: string, newPhotos: File[], keepPhotos: string[]): Promise<void>;
  reviewSubmission(id: string, review: { teacherComment: string; grade: string }): Promise<void>;
  photoUrl(path: string): Promise<string>;
}
