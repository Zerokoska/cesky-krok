import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { backend } from '../backend';
import type { ContentSource } from '../content/source';
import type { Lesson } from '../content/schema';
import type { DataStore, Profile } from './types';

type View = 'teacher' | 'student';

type AppState = {
  store: DataStore;
  content: ContentSource;
  profile: Profile | null;
  ready: boolean;
  /** Teachers can preview the student view. Students are always 'student'. */
  view: View;
  setView: (v: View) => void;
  isTeacherView: boolean;
  /** Whose progress the screens show: the student for a teacher, yourself otherwise. */
  subjectId: string | null;
  student: Profile | null;
  showTranslations: boolean;
  setShowTranslations: (v: boolean) => void;
  getLesson: (id: string) => Promise<Lesson>;
};

const Ctx = createContext<AppState | null>(null);

const lessonCache = new Map<string, Promise<Lesson>>();

function readPref(key: string, fallback: string) {
  try {
    return localStorage.getItem(key) ?? fallback;
  } catch {
    return fallback;
  }
}

function writePref(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* private mode: ignore */
  }
}

export function AppProvider({ children }: { children: ReactNode }) {
  const { store, content } = backend;
  const [profile, setProfile] = useState<Profile | null>(null);
  const [ready, setReady] = useState(false);
  const [view, setViewState] = useState<View>(() => (readPref('ckzk.view', 'teacher') as View) || 'teacher');
  const [student, setStudent] = useState<Profile | null>(null);
  const [showTranslations, setShowTr] = useState(() => readPref('ckzk.tr', '0') === '1');

  useEffect(() => {
    let alive = true;
    store
      .getSession()
      .then((p) => alive && setProfile(p))
      .catch(() => alive && setProfile(null))
      .finally(() => alive && setReady(true));
    const off = store.onAuthChange((p) => {
      setProfile(p);
      lessonCache.clear();
    });
    return () => {
      alive = false;
      off();
    };
  }, [store]);

  useEffect(() => {
    if (profile?.role !== 'teacher') {
      setStudent(null);
      return;
    }
    store.listStudents().then((s) => setStudent(s[0] ?? null));
  }, [profile, store]);

  const setView = useCallback((v: View) => {
    setViewState(v);
    writePref('ckzk.view', v);
  }, []);

  const setShowTranslations = useCallback((v: boolean) => {
    setShowTr(v);
    writePref('ckzk.tr', v ? '1' : '0');
  }, []);

  const getLesson = useCallback(
    (id: string) => {
      let p = lessonCache.get(id);
      if (!p) {
        p = content.getLesson(id);
        p.catch(() => lessonCache.delete(id));
        lessonCache.set(id, p);
      }
      return p;
    },
    [content],
  );

  const value = useMemo<AppState>(() => {
    const isTeacher = profile?.role === 'teacher';
    const isTeacherView = isTeacher && view === 'teacher';
    return {
      store,
      content,
      profile,
      ready,
      view: isTeacher ? view : 'student',
      setView,
      isTeacherView,
      subjectId: isTeacherView ? (student?.id ?? null) : (profile?.id ?? null),
      student,
      showTranslations,
      setShowTranslations,
      getLesson,
    };
  }, [store, content, profile, ready, view, setView, student, showTranslations, setShowTranslations, getLesson]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useApp(): AppState {
  const v = useContext(Ctx);
  if (!v) throw new Error('useApp outside AppProvider');
  return v;
}
