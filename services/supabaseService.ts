
import { createClient, RealtimeChannel } from '@supabase/supabase-js';
import { Friend } from '../types';

const SUPABASE_URL = 'https://czufzstvqoysyvokodjw.supabase.co';
const SUPABASE_KEY = 'sb_publishable_ORRdgN867xKAD6xmxNPzPQ_vCVu8dy4';

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

let activeChannel: RealtimeChannel | null = null;
let userChannel: RealtimeChannel | null = null;

// Verifica se o erro é de tabela não encontrada
const isMissingTableError = (error: any) => {
  return error?.message?.includes('schema cache') || error?.message?.includes('does not exist');
};

/**
 * Persistência de Perfil Público
 */
export const upsertProfile = async (userId: string, name: string) => {
  try {
    const { error } = await supabase
      .from('profiles')
      .upsert({ 
        id: userId, 
        name: name.toUpperCase(), 
        last_seen: new Date().toISOString() 
      }, { onConflict: 'id' });
    
    if (error) {
      if (isMissingTableError(error)) {
        console.warn("⚠️ Banco de dados não configurado: Tabela 'profiles' ausente.");
        return { error: 'TABLE_MISSING' };
      }
      console.error("❌ Erro ao salvar perfil:", error.message);
    }
    return { success: true };
  } catch (e) {
    return { error: 'CONNECTION_FAILED' };
  }
};

/**
 * Lista todos os perfis registrados
 */
export const fetchAllProfiles = async () => {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, name, last_seen')
      .order('last_seen', { ascending: false })
      .limit(50);
    
    if (error) {
      if (isMissingTableError(error)) throw new Error('TABLE_MISSING');
      throw error;
    }
    return { data: data || [], error: null };
  } catch (e: any) {
    return { data: [], error: e.message === 'TABLE_MISSING' ? 'TABLE_MISSING' : 'FAILED' };
  }
};

/**
 * Busca de Operadores por Nome
 */
export const searchProfiles = async (query: string) => {
  if (!query || query.length < 2) return { data: [], error: null };
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, name')
      .ilike('name', `%${query}%`)
      .limit(10);
    
    if (error) {
      if (isMissingTableError(error)) return { data: [], error: 'TABLE_MISSING' };
      return { data: [], error: error.message };
    }
    return { data: data || [], error: null };
  } catch (e) {
    return { data: [], error: 'FAILED' };
  }
};

/**
 * Gestão de Amizades no Banco
 */
export const addFriendDB = async (userId: string, friendId: string) => {
  try {
    const { error } = await supabase
      .from('friendships')
      .insert({ user_id: userId, friend_id: friendId });
    
    if (error) {
      if (isMissingTableError(error)) return { success: false, error: 'TABLE_MISSING' };
      return { success: false, error: error.message };
    }
    return { success: true, error: null };
  } catch (e) {
    return { success: false, error: 'FAILED' };
  }
};

/**
 * Puxa a lista de amigos reais do banco de dados
 */
export const fetchFriendsList = async (userId: string): Promise<{ data: Friend[], error: string | null }> => {
  try {
    const { data, error } = await supabase
      .from('friendships')
      .select(`
        friend_id,
        profiles:friend_id (id, name)
      `)
      .eq('user_id', userId);

    if (error) {
      if (isMissingTableError(error)) return { data: [], error: 'TABLE_MISSING' };
      return { data: [], error: error.message };
    }

    const friends = (data || []).map((f: any) => ({
      id: String(f.profiles?.id || f.friend_id),
      name: String(f.profiles?.name || "Operador Desconhecido"),
      status: 'online' as 'online'
    }));

    return { data: friends, error: null };
  } catch (e) {
    return { data: [], error: 'FAILED' };
  }
};

export const joinRoomChannel = (
  code: string, 
  onMessage: (event: string, payload: any) => void
): Promise<RealtimeChannel> => {
  return new Promise((resolve, reject) => {
    if (activeChannel) {
      activeChannel.unsubscribe();
    }

    activeChannel = supabase.channel(`room-${code}`, {
      config: { broadcast: { self: true } }
    })
    .on('broadcast', { event: '*' }, ({ event, payload }) => {
      onMessage(event, payload);
    })
    .subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        resolve(activeChannel!);
      }
      if (status === 'CHANNEL_ERROR') {
        reject(new Error("Falha ao sintonizar frequência"));
      }
    });
  });
};

export const joinUserChannel = (
  userId: string,
  onMessage: (event: string, payload: any) => void
): Promise<RealtimeChannel> => {
  return new Promise((resolve) => {
    if (userChannel) userChannel.unsubscribe();

    userChannel = supabase.channel(`user-${userId}`, {
      config: { broadcast: { self: false } }
    })
    .on('broadcast', { event: '*' }, ({ event, payload }) => {
      onMessage(event, payload);
    })
    .subscribe(() => {
      resolve(userChannel!);
    });
  });
};

export const sendPrivateMessage = async (targetUserId: string, event: string, payload: any) => {
  const tempChannel = supabase.channel(`user-${targetUserId}`);
  await tempChannel.subscribe(async (status) => {
    if (status === 'SUBSCRIBED') {
      await tempChannel.send({
        type: 'broadcast',
        event: event,
        payload: payload,
      });
      tempChannel.unsubscribe();
    }
  });
};

export const broadcastEvent = async (code: string, event: string, payload: any) => {
  if (!activeChannel) return;
  return await activeChannel.send({
    type: 'broadcast',
    event: event,
    payload: payload,
  });
};
