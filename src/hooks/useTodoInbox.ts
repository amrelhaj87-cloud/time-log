import { useCallback, useEffect, useState } from 'react';
import type { User } from 'firebase/auth';
import { db, doc, onSnapshot, setDoc } from '../services/firebase';
import type { TagCode, TodoItem } from '../types';

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

  const handleAddTodo = (text: string, tag: TagCode) => {
    const newItem: TodoItem = {
      id: `todo_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      text,
      tag,
      done: false,
      createdAt: Date.now()
    };
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

  return { todoInbox, saveTodoInbox, handleAddTodo, handleToggleTodo, handleDeleteTodo, markTodoPromoted };
}
