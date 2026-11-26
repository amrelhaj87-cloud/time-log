import { useCallback, useEffect, useState } from 'react';
import type { User } from 'firebase/auth';
import { db, doc, onSnapshot, setDoc } from '../services/firebase';
import type { TagCode, TodoItem } from '../types';
import { sessionUpdate, withEstimate } from '../utils/focusTasks';

const LOCAL_KEY = 'time_log_todo_inbox';

function loadLocalInbox(): TodoItem[] {
  try {
    const local = localStorage.getItem(LOCAL_KEY);
    return local ? JSON.parse(local) : [];
  } catch {
    return [];
  }
}

/**
 * Brain Dump / Todo Inbox (extracted from App.tsx): the list, its live
 * Firestore sync, and add / toggle / delete / mark-as-promoted.
 * Saved to localStorage on every change and, when signed in, to
 * artifacts/time-log-app/users/{uid}/inbox/todos.
 */
export function useTodoInbox({
  currentUser,
  lang,
  setSaveStatus
}: {
  currentUser: User | null;
  lang: 'ar' | 'en';
  setSaveStatus: (s: string) => void;
}) {
  const [todoInbox, setTodoInbox] = useState<TodoItem[]>(loadLocalInbox);

  // Real-time sync from Firestore while signed in
  useEffect(() => {
    if (!db || !currentUser) return;
    try {
      const docRef = doc(db, 'artifacts', 'time-log-app', 'users', currentUser.uid, 'inbox', 'todos');
      const unsubscribe = onSnapshot(
        docRef,
        (snapshot) => {
          if (!snapshot.exists()) return;
          const data = snapshot.data();
          if (data && Array.isArray(data.items)) {
            setTodoInbox(data.items);
            localStorage.setItem(LOCAL_KEY, JSON.stringify(data.items));
          }
        },
        (err) => console.warn('Error syncing todo inbox from Firestore:', err)
      );
      return () => unsubscribe();
    } catch (err) {
      console.warn('Failed to attach todo inbox listener:', err);
    }
  }, [currentUser]);

  const saveTodoInbox = useCallback(
    (items: TodoItem[]) => {
      setTodoInbox(items);
      localStorage.setItem(LOCAL_KEY, JSON.stringify(items));
      if (db && currentUser) {
        const docRef = doc(db, 'artifacts', 'time-log-app', 'users', currentUser.uid, 'inbox', 'todos');
        setDoc(docRef, { items, updatedAt: new Date().toISOString() }).catch((err) =>
          console.warn('Failed to sync todo inbox to Firestore:', err)
        );
      }
    },
    [currentUser]
  );

  const handleAddTodo = (text: string, tag: TagCode, estimateMins?: number) => {
    const newItem = withEstimate<TodoItem>(
      {
        id: `todo_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        text,
        tag,
        done: false,
        createdAt: Date.now()
      },
      estimateMins
    );
    saveTodoInbox([newItem, ...todoInbox]);
    setSaveStatus(lang === 'ar' ? '✨ تمت إضافة الفكرة للصندوق' : '✨ Added to Brain Dump Inbox');
    setTimeout(() => setSaveStatus(''), 2500);
  };

  const handleToggleTodo = (id: string) => {
    saveTodoInbox(
      todoInbox.map((item) => {
        if (item.id !== id) return item;
        const nextDone = !item.done;
        return {
          ...item,
          done: nextDone,
          promotedTo: nextDone ? item.promotedTo : undefined,
          promotedQuad: nextDone ? item.promotedQuad : undefined
        };
      })
    );
  };

  const handleDeleteTodo = (id: string) => {
    saveTodoInbox(todoInbox.filter((item) => item.id !== id));
  };

  /** Marks a todo as done and records where it was promoted to. */
  const markTodoPromoted = (id: string, to: 'golden' | 'quad', quadKey?: 'q1' | 'q2' | 'q3' | 'q4') => {
    saveTodoInbox(
      todoInbox.map((item) =>
        item.id === id
          ? {
              ...item,
              done: true,
              promotedTo: to,
              ...(to === 'quad' ? { promotedQuad: quadKey } : {}),
              promotedAt: Date.now()
            }
          : item
      )
    );
  };

  /** Sets (or clears) a todo's time estimate (#48). */
  const setTodoEstimate = (id: string, mins: number | undefined) => {
    saveTodoInbox(todoInbox.map((item) => (item.id === id ? withEstimate(item, mins) : item)));
  };

  /**
   * Credits a finished Pomodoro session to a todo (#48): adds the minutes and,
   * when the user says it's finished, strikes it through (done, not deleted).
   * Returns false when the todo no longer exists.
   */
  const creditTodoSession = (id: string, minutes: number, finished: boolean): boolean => {
    if (!todoInbox.some((item) => item.id === id)) return false;
    const update = sessionUpdate<TodoItem>(minutes, finished);
    saveTodoInbox(todoInbox.map((item) => (item.id === id ? update(item) : item)));
    return true;
  };

  return {
    todoInbox,
    saveTodoInbox,
    handleAddTodo,
    handleToggleTodo,
    handleDeleteTodo,
    markTodoPromoted,
    setTodoEstimate,
    creditTodoSession
  };
}
