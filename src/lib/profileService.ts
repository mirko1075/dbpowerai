import { supabase } from './supabase';

export interface UserProfile {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  company: string | null;
  role: string | null;
  preferences: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface UpdateProfileData {
  full_name?: string;
  avatar_url?: string;
  bio?: string;
  company?: string;
  role?: string;
  preferences?: Record<string, any>;
}

export async function getProfile(userId: string): Promise<UserProfile | null> {
  try {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (error) {
      console.error('Error fetching profile:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Error in getProfile:', error);
    return null;
  }
}

export async function createProfile(
  userId: string,
  email: string,
  additionalData?: Partial<UpdateProfileData>
): Promise<UserProfile | null> {
  try {
    const { data, error } = await supabase
      .from('user_profiles')
      .insert({
        id: userId,
        email,
        full_name: additionalData?.full_name || null,
        avatar_url: additionalData?.avatar_url || null,
        bio: additionalData?.bio || null,
        company: additionalData?.company || null,
        role: additionalData?.role || null,
        preferences: additionalData?.preferences || {},
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating profile:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Error in createProfile:', error);
    return null;
  }
}

export async function updateProfile(
  userId: string,
  updates: UpdateProfileData
): Promise<UserProfile | null> {
  try {
    const { data, error } = await supabase
      .from('user_profiles')
      .update(updates)
      .eq('id', userId)
      .select()
      .single();

    if (error) {
      console.error('Error updating profile:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Error in updateProfile:', error);
    return null;
  }
}

export async function ensureProfileExists(userId: string): Promise<UserProfile | null> {
  try {
    let profile = await getProfile(userId);

    if (profile) {
      return profile;
    }

    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return null;
    }

    const email = user.email || '';
    const fullName = user.user_metadata?.full_name || null;
    const avatarUrl = user.user_metadata?.avatar_url || null;

    profile = await createProfile(userId, email, {
      full_name: fullName,
      avatar_url: avatarUrl,
    });

    return profile;
  } catch (error) {
    console.error('Error in ensureProfileExists:', error);
    return null;
  }
}

export async function syncAuthMetadata(userId: string): Promise<void> {
  try {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return;
    }

    const updates: UpdateProfileData = {};

    if (user.user_metadata?.full_name) {
      updates.full_name = user.user_metadata.full_name;
    }

    if (user.user_metadata?.avatar_url) {
      updates.avatar_url = user.user_metadata.avatar_url;
    }

    if (Object.keys(updates).length > 0) {
      await updateProfile(userId, updates);
    }
  } catch (error) {
    console.error('Error in syncAuthMetadata:', error);
  }
}

export async function getProfileStats(userId: string): Promise<{
  totalQueries: number;
  memberSince: string;
}> {
  try {
    const { count } = await supabase
      .from('queries')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);

    const profile = await getProfile(userId);

    return {
      totalQueries: count || 0,
      memberSince: profile?.created_at || new Date().toISOString(),
    };
  } catch (error) {
    console.error('Error in getProfileStats:', error);
    return {
      totalQueries: 0,
      memberSince: new Date().toISOString(),
    };
  }
}
