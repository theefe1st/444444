import { useState, useEffect } from 'react';
import { User as SupabaseUser } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { User } from '../types';

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Получаем текущую сессию
    const getSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setUser({
          id: session.user.id,
          email: session.user.email || '',
          name: session.user.user_metadata?.name || session.user.email || '',
          role: 'analyst'
        });
      }
      setIsLoading(false);
    };

    getSession();

    // Слушаем изменения аутентификации
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session?.user) {
          setUser({
            id: session.user.id,
            email: session.user.email || '',
            name: session.user.user_metadata?.name || session.user.email || '',
            role: 'analyst'
          });
        } else {
          setUser(null);
        }
        setIsLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) {
        console.error('Ошибка входа:', error.message);
        return false;
      }

      if (data.user) {
        setUser({
          id: data.user.id,
          email: data.user.email || '',
          name: data.user.user_metadata?.name || data.user.email || '',
          role: 'analyst'
        });
        return true;
      }

      return false;
    } catch (error) {
      console.error('Ошибка при входе:', error);
      return false;
    }
  };

  const register = async (email: string, password: string, name: string): Promise<boolean> => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name: name
          }
        }
      });

      if (error) {
        console.error('Ошибка регистрации:', error.message);
        return false;
      }

      if (data.user) {
        // Если пользователь создан, но нужно подтвердить email
        if (!data.session) {
          console.log('Пользователь зарегистрирован, но требуется подтверждение email');
          // В данном случае мы автоматически входим в систему
          // В продакшене здесь должно быть подтверждение email
        }
        
        setUser({
          id: data.user.id,
          email: data.user.email || '',
          name: name,
          role: 'analyst'
        });
        return true;
      }

      return false;
    } catch (error) {
      console.error('Ошибка при регистрации:', error);
      return false;
    }
  };

  const logout = async () => {
    try {
      await supabase.auth.signOut();
      setUser(null);
    } catch (error) {
      console.error('Ошибка при выходе:', error);
    }
  };

  return {
    user,
    isLoading,
    login,
    register,
    logout
  };
};