
import { createClient, RealtimeChannel } from '@supabase/supabase-js';
import { Friend } from '../types.ts';

const SUPABASE_URL = 'https://czufzstvqoysyvokodjw.supabase.co';
const SUPABASE_KEY = 'sb_publishable_ORRdgN867xKAD6xmxNPzPQ_vCVu8dy4';

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

let activeChannel: RealtimeChannel | null = null;
let userChannel: RealtimeChannel | null = null;

const handleSupabaseError = (error: any) => {
  console.error("Supabase Error Details:", error);
  if (error?.code === 'PGRST204' || error?.code === '42703') {
    return 'SCHEMA_ERROR';
  }
  return error?.message || 'Erro de conexão';
};

export const upsertProfile = async (userId: string, name: string, avatarUrl?: string) => {
  try {
    const { error } = await supabase
      .from('profiles')
      .upsert({ 
        id: userId, 
        name: name.toUpperCase(), 
        avatar_url: avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${userId}`,
        last_seen: new Date().toISOString() 
      }, { onConflict: 'id' });
    
    if (error) throw error;
    return { success: true };
  } catch (e: any) {
    return { error: handleSupabaseError(e) };
  }
};

export const incrementPlayerStats = async (userId: string, score: number, isWin: boolean) => {
  if (userId.startsWith('guest_')) return { success: true };

  try {
    const { data: profile, error: fetchError } = await supabase.from('profiles').select('wins, matches, total_score').eq('id', userId).single();
    
    if (fetchError && (fetchError.code === 'PGRST204' || fetchError.code === '42703')) {
       return { success: true }; 
    }

    if (!profile) return { error: 'Perfil não encontrado' };

    const { error } = await supabase
      .from('profiles')
      .update({
        wins: isWin ? (profile.wins || 0) + 1 : (profile.wins || 0),
        matches: (profile.matches || 0) + 1,
        total_score: (profile.total_score || 0) + score,
        last_seen: new Date().toISOString()
      })
      .eq('id', userId);

    if (error) throw error;
    return { success: true };
  } catch (e) {
    return { error: handleSupabaseError(e) };
  }
};

export const updateProfileData = async (userId: string, data: { name?: string, avatar_url?: string }) => {
  try {
    const payload = {
      id: userId,
      last_seen: new Date().toISOString(),
      ...(data.name && { name: data.name.toUpperCase() }),
      ...(data.avatar_url && { avatar_url: data.avatar_url })
    };

    const { error: dbError } = await supabase
      .from('profiles')
      .upsert(payload, { onConflict: 'id' });
    
    if (dbError) throw dbError;

    const { error: authError } = await supabase.auth.updateUser({
      data: {
        name: data.name?.toUpperCase(),
        avatar_url: data.avatar_url
      }
    });

    return { success: true };
  } catch (e: any) {
    return { error: handleSupabaseError(e) };
  }
};

export const fetchGlobalRanking = async () => {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, name, avatar_url, total_score, wins')
      .order('total_score', { ascending: false })
      .limit(50);
    
    if (error) throw error;
    return { data: data || [], error: null };
  } catch (e: any) {
    const errType = handleSupabaseError(e);
    return { data: [], error: errType === 'SCHEMA_ERROR' ? 'BANCO_DESATUALIZADO' : errType };
  }
};

export const fetchProfile = async (userId: string) => {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    
    if (error) throw error;
    return { data, error: null };
  } catch (e: any) {
    return { data: null, error: handleSupabaseError(e) };
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
      if (status === 'SUBSCRIBED') resolve(activeChannel!);
      if (status === 'CHANNEL_ERROR') reject(new Error("Falha no Realtime"));
    });
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
