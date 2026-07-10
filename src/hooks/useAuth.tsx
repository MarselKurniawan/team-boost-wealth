import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Profile {
  id: string;
  user_id: string;
  name: string;
  email: string;
  phone: string | null;
  balance: number;
  total_income: number;
  total_recharge: number;
  total_withdraw: number;
  team_income: number;
  rabat_income: number;
  vip_level: number;
  referral_code: string | null;
  referred_by: string | null;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  isAdmin: boolean;
  loading: boolean;
  signUp: (phone: string, password: string, name?: string, referralCode?: string, email?: string) => Promise<{ error: Error | null; userId?: string }>;
  signIn: (identifier: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchProfile = async (userId: string) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      console.error('Error fetching profile:', error);
      return null;
    }
    return data;
  };

  const checkAdminRole = async (userId: string) => {
    const { data, error } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .eq('role', 'admin')
      .maybeSingle();

    if (error) {
      console.error('Error checking admin role:', error);
      return false;
    }
    return !!data;
  };

  const refreshProfile = async () => {
    if (user) {
      const profileData = await fetchProfile(user.id);
      setProfile(profileData);
      const adminStatus = await checkAdminRole(user.id);
      setIsAdmin(adminStatus);
    }
  };

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        // Defer profile fetch with setTimeout to prevent deadlock
        if (session?.user) {
          setTimeout(async () => {
            const profileData = await fetchProfile(session.user.id);
            setProfile(profileData);
            const adminStatus = await checkAdminRole(session.user.id);
            setIsAdmin(adminStatus);
            setLoading(false);
          }, 0);
        } else {
          setProfile(null);
          setIsAdmin(false);
          setLoading(false);
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        fetchProfile(session.user.id).then(profileData => {
          setProfile(profileData);
          checkAdminRole(session.user.id).then(adminStatus => {
            setIsAdmin(adminStatus);
            setLoading(false);
          });
        });
      } else {
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (phone: string, password: string, name?: string, referralCode?: string, email?: string) => {
    const redirectUrl = `${window.location.origin}/`;
    // Generate dummy email from phone if no email provided
    const authEmail = email && email.trim() ? email : `${phone.replace(/[^0-9]/g, '')}@wa.investpro.id`;
    
    const { data: signUpData, error } = await supabase.auth.signUp({
      email: authEmail,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          name: name || phone,
          phone: phone,
          referred_by: referralCode || '',
        }
      }
    });

    if (error) {
      return { error };
    }

    const newUserId = signUpData.user?.id;

    // Update profile with phone and referral code
    setTimeout(async () => {
      const { data: { user: newUser } } = await supabase.auth.getUser();
      if (newUser) {
        const updates: Record<string, string> = { phone };
        if (referralCode) updates.referred_by = referralCode;
        await supabase
          .from('profiles')
          .update(updates)
          .eq('user_id', newUser.id);
      }
    }, 1000);

    return { error: null, userId: newUserId };
  };

  const signIn = async (identifier: string, password: string) => {
    const isPhone = /^[0-9+]/.test(identifier) && !identifier.includes('@');
    
    if (isPhone) {
      // Use edge function to login by phone (bypasses RLS for profile lookup)
      const { data, error: fnError } = await supabase.functions.invoke('login-by-phone', {
        body: { phone: identifier, password },
      });

      if (fnError || !data?.success) {
        return { error: new Error(data?.error || fnError?.message || 'Login gagal') };
      }

      // Set the session from the edge function response
      if (data.session) {
        const { error: setError } = await supabase.auth.setSession({
          access_token: data.session.access_token,
          refresh_token: data.session.refresh_token,
        });
        if (setError) return { error: setError };
      }

      return { error: null };
    }
    
    // Direct email login
    const { error } = await supabase.auth.signInWithPassword({
      email: identifier,
      password,
    });
    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setProfile(null);
    setIsAdmin(false);
  };

  return (
    <AuthContext.Provider value={{
      user,
      session,
      profile,
      isAdmin,
      loading,
      signUp,
      signIn,
      signOut,
      refreshProfile,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

// Custom hook to access auth context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
