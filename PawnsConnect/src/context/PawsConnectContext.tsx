
"use client";

import type { Dog, Profile, UserRole, HealthRecord, FeedingSchedule, VaccinationRecord } from '@/types';
import React, { useCallback, useEffect, useState, useRef } from 'react';
import { supabase } from '@/lib/supabaseClient';
import type { User as SupabaseUser, Session as SupabaseSession, PostgrestError, AuthApiError } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase';
import { useToast } from '@/hooks/use-toast';
type DbDog = Database['public']['Views']['dogs_for_adoption_view']['Row'];
type DbProfile = Database['public']['Tables']['profiles']['Row'];


interface PawsConnectContextType {
  dogsToSwipe: Dog[];
  likedDogs: Dog[];
  seenDogIds: Set<string>;
  likeDog: (dogId: string) => Promise<void>;
  passDog: (dogId:string) => void;
  getDogById: (dogId: string) => Dog | undefined;
  isLoadingDogs: boolean;

  user: SupabaseUser | null;
  profile: Profile | null;
  session: SupabaseSession | null;
  isLoadingAuth: boolean;
  isUpdatingProfile: boolean;
  login: (email: string, password: string) => Promise<{ session: SupabaseSession | null; error: string | null }>;
  signUp: (email: string, password: string, role: UserRole, fullName?: string | null) => Promise<{ user: SupabaseUser | null; error: string | null }>;
  logout: () => Promise<{ error: string | null }>;
  updateProfile: (updates: { fullName?: string | null; avatarUrl?: string | null }) => Promise<{ success: boolean; error?: string | null; updatedProfile?: Profile | null }>;
  deleteAccount: () => Promise<{ error: string | null }>;
  sendPasswordResetEmail: (email: string) => Promise<{ error: string | null }>;
  updateUserEmail: (newEmail: string) => Promise<{ error: string | null }>;
}

const PawsConnectContext = React.createContext<PawsConnectContextType | undefined>(undefined);

const mapDbDogToDogType = (dbViewDog: DbDog): Dog => {
  const defaultHealthRecord: HealthRecord = { lastCheckup: '', conditions: [], notes: '未提供記錄' };
  const defaultFeedingSchedule: FeedingSchedule = { foodType: '未指定', timesPerDay: 0, portionSize: '未指定', notes: '未提供記錄' };
  
  const photos = Array.isArray(dbViewDog.photos) ? dbViewDog.photos.filter((p): p is string => typeof p === 'string') : [];
  const personalityTraits = Array.isArray(dbViewDog.personality_traits) ? dbViewDog.personality_traits.filter((p): p is string => typeof p === 'string') : [];
  
  const healthRecordsData = (dbViewDog.health_records as unknown) as HealthRecord | null;
  const feedingScheduleData = (dbViewDog.feeding_schedule as unknown) as FeedingSchedule | null;
  const vaccinationRecordsData = (dbViewDog.vaccination_records ? (Array.isArray(dbViewDog.vaccination_records) ? dbViewDog.vaccination_records : []) : []) as VaccinationRecord[];

  const meaningfulConditions = healthRecordsData?.conditions?.filter(
    c => c && c.trim() && c.trim().toLowerCase() !== 'none' && c.trim() !== '無'
  ) || [];
  
  return {
    id: dbViewDog.id,
    name: dbViewDog.name || '未命名狗狗',
    breed: dbViewDog.breed || '未知品種',
    age: typeof dbViewDog.age === 'number' ? dbViewDog.age : 0,
    gender: dbViewDog.gender === 'Male' || dbViewDog.gender === 'Female' || dbViewDog.gender === 'Unknown' ? dbViewDog.gender : 'Unknown',
    photos: photos.length > 0 ? photos : ['https://placehold.co/600x400.png?text=' + encodeURIComponent(dbViewDog.name || 'Dog')],
    description: dbViewDog.description || '暫無描述。',
    healthRecords: {
      lastCheckup: healthRecordsData?.lastCheckup || defaultHealthRecord.lastCheckup,
      conditions: meaningfulConditions,
      notes: healthRecordsData?.notes || defaultHealthRecord.notes,
    },
    feedingSchedule: {
      foodType: feedingScheduleData?.foodType || defaultFeedingSchedule.foodType,
      timesPerDay: typeof feedingScheduleData?.timesPerDay === 'number' ? feedingScheduleData.timesPerDay : defaultFeedingSchedule.timesPerDay,
      portionSize: feedingScheduleData?.portionSize || defaultFeedingSchedule.portionSize,
      notes: feedingScheduleData?.notes || defaultFeedingSchedule.notes,
    },
    vaccinationRecords: vaccinationRecordsData.map(vr => ({
      vaccineName: vr.vaccineName || '未指定疫苗',
      dateAdministered: vr.dateAdministered || '',
      nextDueDate: vr.nextDueDate || undefined,
    })),
    liveStreamUrl: dbViewDog.live_stream_url || undefined,
    status: dbViewDog.status === 'Available' || dbViewDog.status === 'Pending' || dbViewDog.status === 'Adopted' ? dbViewDog.status : 'Available',
    location: dbViewDog.location || '未知地點',
    personalityTraits: personalityTraits.length > 0 ? personalityTraits : ['個性溫和'],
  };
};


export const PawsConnectProvider = ({ children }: { children: React.ReactNode }) => {
  const [masterDogList, setMasterDogList] = useState<Dog[]>([]);
  const [dogsToSwipe, setDogsToSwipe] = useState<Dog[]>([]);
  const [likedDogs, setLikedDogs] = useState<Dog[]>([]);
  const [seenDogIds, setSeenDogIds] = useState<Set<string>>(new Set());
  const [isLoadingDogs, setIsLoadingDogs] = useState(true);

  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [session, setSession] = useState<SupabaseSession | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  const [isLiking, setIsLiking] = useState<Set<string>>(new Set());
  const { toast } = useToast();

  const resetDogState = useCallback(() => {
    setMasterDogList([]);
    setDogsToSwipe([]);
    setLikedDogs([]);
    setSeenDogIds(new Set());
    setIsLoadingDogs(true);
  }, []);


  const fetchProfileAndSet = async (user: SupabaseUser | null) => {
    if (!user) {
      setProfile(null);
      return;
    }
    try {
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single<DbProfile>();

      if (profileError && profileError.code !== 'PGRST116') {
        console.error('讀取個人資料時發生錯誤:', profileError);
        setProfile(null);
      } else if (profileData) {
        setProfile({
          id: profileData.id,
          role: profileData.role as UserRole,
          fullName: profileData.full_name,
          avatarUrl: profileData.avatar_url,
          updatedAt: profileData.updated_at,
        });
      } else {
        setProfile(null);
      }
    } catch (e) {
      console.error("處理個人資料時發生未預期的錯誤:", e);
      setProfile(null);
    }
  };

  useEffect(() => {
    const initializeSession = async () => {
      setIsLoadingAuth(true);
      try {
        const { data: { session: initialSession }, error } = await supabase.auth.getSession();
        
        if (error) {
           const authError = error as AuthApiError;
           if (!(authError.message === 'Invalid Refresh Token: Refresh Token Not Found' && authError.status === 400)) {
               console.error("Error getting initial session:", error);
           }
        }
        
        const currentUser = initialSession?.user ?? null;
        setSession(initialSession);
        setUser(currentUser);
        
        if (currentUser) {
          await fetchProfileAndSet(currentUser);
        } else {
          setProfile(null);
        }

      } catch (e: any) {
         console.error("Critical error during session initialization:", e);
         setSession(null);
         setUser(null);
         setProfile(null);
      } finally {
        setIsLoadingAuth(false);
      }
    };

    initializeSession();

    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (_event, newSession) => {
        const currentUser = newSession?.user ?? null;
        const previousUserId = user?.id;

        if (currentUser?.id !== previousUserId) {
          setIsLoadingAuth(true);
        }
        
        setSession(newSession);
        setUser(currentUser);
        
        if (currentUser) {
            await fetchProfileAndSet(currentUser);
        } else {
            setProfile(null);
            resetDogState();
        }

        if (currentUser?.id !== previousUserId) {
           setIsLoadingAuth(false);
        }
      }
    );

    return () => {
      authListener.subscription.unsubscribe();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);


 const loadInitialDogData = useCallback(async (currentUserId: string | null) => {
    setIsLoadingDogs(true);
    if (!currentUserId) {
        setMasterDogList([]);
        setDogsToSwipe([]);
        setLikedDogs([]);
        setIsLoadingDogs(false);
        return;
    }

    try {
        const likedDogsPromise = supabase
            .from('user_dog_likes')
            .select(`dogs_for_adoption_view(*)`)
            .eq('user_id', currentUserId);

        const allDogsPromise = supabase
            .from('dogs_for_adoption_view')
            .select('*');

        const [likedDogsResult, allDogsResult] = await Promise.all([likedDogsPromise, allDogsPromise]);

        const { data: likedDogsData, error: likedDogsError } = likedDogsResult;
        if (likedDogsError) {
            console.error("Error fetching liked dogs from Supabase:", likedDogsError);
            throw likedDogsError;
        }
        const userLikedDbDogs = (likedDogsData || [])
            .map(likeRecord => likeRecord.dogs_for_adoption_view)
            .filter((dog): dog is DbDog => dog !== null && typeof dog === 'object');
        const userLikedDogs = userLikedDbDogs.map(mapDbDogToDogType);
        setLikedDogs(userLikedDogs);

        const { data: allDogsData, error: allDogsError } = allDogsResult;
        if (allDogsError) {
            console.error("Error fetching all dogs from Supabase:", allDogsError);
            throw allDogsError;
        }
        const allDogs = allDogsData.map(mapDbDogToDogType);
        setMasterDogList(allDogs);

        const likedDogIdsSet = new Set(userLikedDogs.map(d => d.id));
        setSeenDogIds(likedDogIdsSet);
        
        const unseenDogs = allDogs.filter(dog => !likedDogIdsSet.has(dog.id));
        setDogsToSwipe(unseenDogs);

    } catch (error) {
        console.error("Unhandled error during dog data fetch:", error);
        setMasterDogList([]);
        setDogsToSwipe([]);
        setLikedDogs([]);
        toast({
            title: "資料載入失敗",
            description: "無法載入狗狗資料，請稍後重新整理。",
            variant: "destructive",
        });
    } finally {
        setIsLoadingDogs(false);
    }
}, [toast]);


  useEffect(() => {
    if (!isLoadingAuth && user) {
      loadInitialDogData(user.id);
    } else if (!isLoadingAuth && !user) {
      setIsLoadingDogs(false); 
      resetDogState();
    }
  }, [isLoadingAuth, user, loadInitialDogData, resetDogState]);


  useEffect(() => {
    if (!isLoadingDogs) {
      const dogsForSwiping = masterDogList.filter(dog => !seenDogIds.has(dog.id));
      setDogsToSwipe(dogsForSwiping);
    }
  }, [seenDogIds, masterDogList, isLoadingDogs]);


  const likeDog = async (dogId: string) => {
    if (isLiking.has(dogId)) {
      return;
    }

    if (!user) {
      toast({
        variant: "destructive",
        title: "需要登入",
        description: "請先登入才能按讚狗狗！",
      });
      return;
    }

    const dog = masterDogList.find(d => d.id === dogId);
    if (!dog) return;

    try {
      setIsLiking(prev => new Set(prev).add(dogId));
      passDog(dogId); 

      const { error: insertError } = await supabase
        .from('user_dog_likes')
        .insert({ user_id: user.id, dog_id: dogId });
      
      if (insertError) {
        if (insertError.code !== '23505') { 
            console.error("Error saving like to Supabase:", insertError);
            toast({
              variant: "destructive",
              title: "按讚失敗",
              description: "無法儲存您的選擇。請檢查您的網路連線或稍後再試。",
            });
            setSeenDogIds(prev => {
              const newSet = new Set(prev);
              newSet.delete(dogId);
              return newSet;
            });
            return; 
        }
      }

      setLikedDogs(prevLikedDogs => {
        if (!prevLikedDogs.some(d => d.id === dog.id)) {
          return [...prevLikedDogs, dog];
        }
        return prevLikedDogs;
      });

    } catch (error) {
        console.error("An unexpected error occurred during the like operation:", error);
        toast({
          variant: "destructive",
          title: "發生未預期的錯誤",
          description: "按讚時發生問題，您的操作已被復原。",
        });
    } finally {
      setIsLiking(prev => {
        const newSet = new Set(prev);
        newSet.delete(dogId);
        return newSet;
      });
    }
  };

  const passDog = (dogId: string) => {
    setSeenDogIds(prevSeenDogIds => new Set(prevSeenDogIds).add(dogId));
  };
  
  const getDogById = (dogId: string): Dog | undefined => {
    return masterDogList.find(dog => dog.id === dogId) || likedDogs.find(dog => dog.id === dogId);
  };

  const login = async (email: string, password: string): Promise<{ session: SupabaseSession | null; error: string | null }> => {
    setIsLoadingAuth(true);
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    
    if (error) {
      setIsLoadingAuth(false);
      return { session: null, error: error.message || '登入失敗。請檢查您的帳號密碼。' };
    }
    return { session: data.session, error: null };
  };

  const signUp = async (email: string, password: string, role: UserRole, fullName?: string | null): Promise<{ user: SupabaseUser | null; error: string | null }> => {
    setIsLoadingAuth(true);
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
    });

    if (authError) {
      setIsLoadingAuth(false);
      return { user: null, error: authError.message || '註冊失敗。請稍後再試。' };
    }
    if (!authData.user) {
      setIsLoadingAuth(false);
      return { user: null, error: '註冊成功，但未取得使用者資訊。' };
    }

    const getAvatarText = () => {
        if (fullName) {
            const name = fullName.trim();
            // Check for CJK characters
            const cjkRegex = /[\u4e00-\u9fa5]/;
            if (cjkRegex.test(name)) {
                return name.length > 2 ? name.substring(name.length - 2) : name;
            }
        }
        return email.split('@')[0];
    };
    
    const { error: profileError } = await supabase.from('profiles').insert({
      id: authData.user.id,
      role,
      full_name: fullName || email.split('@')[0],
      avatar_url: `https://placehold.co/100x100.png?text=${encodeURIComponent(getAvatarText())}`,
      updated_at: new Date().toISOString(),
    });

    if (profileError) {
      console.error('建立個人資料時發生錯誤:', profileError);
      return { user: authData.user, error: '註冊成功，但建立個人資料失敗: ' + profileError.message };
    }
    
    return { user: authData.user, error: null };
  };

  const logout = async (): Promise<{ error: string | null }> => {
    setIsLoadingAuth(true);
    const { error } = await supabase.auth.signOut();
    if (error) {
      setIsLoadingAuth(false);
      return { error: error.message || '登出時發生錯誤。' };
    }
    return { error: null };
  };

  const updateProfile = async (updates: { fullName?: string | null; avatarUrl?: string | null }): Promise<{ success: boolean; error?: string | null; updatedProfile?: Profile | null }> => {
    if (!user) {
      return { success: false, error: "使用者未登入。" };
    }
    setIsUpdatingProfile(true);
    try {
      const profileUpsertData: Partial<DbProfile> & { id: string } = {
        id: user.id,
        updated_at: new Date().toISOString(),
        role: profile?.role || 'adopter', // Provide a default role if needed
      };
      if (updates.fullName !== undefined) {
        profileUpsertData.full_name = updates.fullName;
      }
      if (updates.avatarUrl !== undefined) {
        profileUpsertData.avatar_url = updates.avatarUrl;
      }

      const { data, error } = await supabase
        .from('profiles')
        .upsert(profileUpsertData)
        .select()
        .single<DbProfile>();

      if (error) throw error;

      if (data) {
        const newProfile: Profile = {
          id: data.id,
          role: data.role as UserRole,
          fullName: data.full_name,
          avatarUrl: data.avatar_url,
          updatedAt: data.updated_at,
        };
        setProfile(newProfile); 
        return { success: true, updatedProfile: newProfile };
      }
      return { success: false, error: "更新個人資料失敗，未收到回傳資料。" };
    } catch (e: unknown) {
      const error = e as PostgrestError;
      console.error("更新個人資料時發生錯誤:", JSON.stringify(error, null, 2));
      const errorMessage = error.message || "更新個人資料時發生未預期的錯誤。";
      return { success: false, error: errorMessage };
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  const deleteAccount = async (): Promise<{ error: string | null }> => {
    if (!user) {
       toast({ title: "錯誤", description: "使用者未登入。", variant: "destructive" });
       return { error: "User not logged in" };
    }
    const { error } = await supabase.rpc('delete_user_account');
    if (error) {
      console.error('Error deleting account:', error);
      return { error: error.message };
    }
    return { error: null };
  };

  const sendPasswordResetEmail = async (email: string): Promise<{ error: string | null }> => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/`, 
    });
    if (error) {
      console.error('Error sending password reset email:', error);
      return { error: error.message };
    }
    return { error: null };
  };

  const updateUserEmail = async (newEmail: string): Promise<{ error: string | null }> => {
    const { error } = await supabase.auth.updateUser({ email: newEmail });
    if (error) {
      console.error('Error updating user email:', error);
      return { error: error.message };
    }
    return { error: null };
  }


  return (
    <PawsConnectContext.Provider value={{ 
        dogsToSwipe, 
        likedDogs, 
        seenDogIds,
        likeDog, 
        passDog, 
        getDogById,
        isLoadingDogs,
        user,
        session,
        profile,
        isLoadingAuth,
        isUpdatingProfile,
        login,
        signUp,
        logout,
        updateProfile,
        deleteAccount,
        sendPasswordResetEmail,
        updateUserEmail
    }}>
      {children}
    </PawsConnectContext.Provider>
  );
};

export const usePawsConnect = () => {
  const context = React.useContext(PawsConnectContext);
  if (context === undefined) {
    throw new Error('usePawsConnect 必須在 PawsConnectProvider 內使用');
  }
  return context;
};

    
    

    