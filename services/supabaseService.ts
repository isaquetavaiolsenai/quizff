
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://czufzstvqoysyvokodjw.supabase.co';
const SUPABASE_KEY = 'sb_publishable_ORRdgN867xKAD6xmxNPzPQ_vCVu8dy4';

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Auth
export const signUp = async (email: string, pass: string, name: string) => {
  const { data, error } = await supabase.auth.signUp({
    email,
    password: pass,
    options: { 
      data: { display_name: name.toUpperCase() },
      emailRedirectTo: window.location.origin // Redireciona para o site atual, não para localhost
    }
  });
  if (error) throw error;
  return data;
};

export const signIn = async (email: string, pass: string) => {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password: pass });
  if (error) throw error;
  return data;
};

// Rooms & Players
export const createRoom = async (code: string, name: string, userId: string) => {
  // Criar sala
  const { error: roomError } = await supabase.from('rooms').insert([{ id: code, status: 'Lobby' }]);
  if (roomError) throw roomError;

  // Criar jogador host
  const { data, error } = await supabase.from('players').insert([{
    id: userId, 
    room_id: code, 
    name, 
    is_host: true, 
    hp: 100, 
    score: 0, 
    rank: 'Bronze I'
  }]).select().single();
  
  if (error) throw error;
  return data;
};

export const joinRoom = async (code: string, name: string, userId: string) => {
  const { data, error } = await supabase.from('players').insert([{
    id: userId, 
    room_id: code, 
    name, 
    is_host: false, 
    hp: 100, 
    score: 0, 
    rank: 'Bronze I'
  }]).select().single();
  
  if (error) throw error;
  return data;
};

export const subscribeRoom = (code: string, onPlayers: (p: any[]) => void, onGameState: (s: any) => void) => {
  const channel = supabase.channel(`room-${code}`)
    .on('postgres_changes', { 
      event: '*', 
      schema: 'public', 
      table: 'players', 
      filter: `room_id=eq.${code}` 
    }, async () => {
      const { data } = await supabase.from('players').select('*').eq('room_id', code);
      if (data) onPlayers(data);
    })
    .on('broadcast', { event: 'update' }, ({ payload }) => {
      onGameState(payload);
    })
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
};

export const broadcastState = async (code: string, state: any) => {
  await supabase.channel(`room-${code}`).send({
    type: 'broadcast',
    event: 'update',
    payload: state,
  });
};
