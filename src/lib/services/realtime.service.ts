import { supabase, isSupabaseConfigured } from '@/lib/supabase/client';
import { RealtimeChannel } from '@supabase/supabase-js';

type ConnectionStatus = 'connected' | 'connecting' | 'error' | 'disconnected';

export const realtimeService = {
  subscribeToChanges(
    onOrderChange: () => void,
    onSessionChange: () => void,
    onStatusChange?: (status: ConnectionStatus) => void
  ): () => void {
    if (!isSupabaseConfigured || !supabase) {
      if (onStatusChange) onStatusChange('connected');
      return () => {};
    }

    if (onStatusChange) onStatusChange('connecting');

    const channelName = `chile_changes_${Date.now()}`;
    const channel: RealtimeChannel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders' },
        () => {
          onOrderChange();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'table_sessions' },
        () => {
          onSessionChange();
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          if (onStatusChange) onStatusChange('connected');
          // Immediately trigger a refetch on successful subscribe/reconnect
          onOrderChange();
          onSessionChange();
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          if (onStatusChange) onStatusChange('error');
        } else if (status === 'CLOSED') {
          if (onStatusChange) onStatusChange('disconnected');
        } else {
          if (onStatusChange) onStatusChange('connecting');
        }
      });

    // Also listen to window online / focus events to refetch data automatically
    const handleOnline = () => {
      onOrderChange();
      onSessionChange();
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('online', handleOnline);
      window.addEventListener('focus', handleOnline);
    }

    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('focus', handleOnline);
      }
      channel.unsubscribe();
    };
  },
};
