"use client";

import type { Dog, Profile, UserRole, HealthRecord, FeedingSchedule, VaccinationRecord, BreedFilter } from '@/types';
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
  loadDogsWhenNeeded: () => Promise<void>;
  getLikedDogsCount: () => Promise<number>;
  
  // 新增品種篩選功能
  breedFilter: BreedFilter;
  setBreedFilter: (filter: BreedFilter) => void;
  getFilteredDogs: () => Dog[];

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

  // Normalize vaccination records coming from JSON aggregate
  const vaccinationRecordsRaw = (dbViewDog.vaccination_records as unknown) as any[] | null;
  const vaccinationRecords: VaccinationRecord[] = Array.isArray(vaccinationRecordsRaw)
    ? vaccinationRecordsRaw.map((vr: any) => ({
        vaccineName: typeof vr?.vaccine_name === 'string' ? vr.vaccine_name : (typeof vr?.vaccineName === 'string' ? vr.vaccineName : '未指定疫苗'),
        dateAdministered: typeof vr?.date === 'string' ? vr.date : (typeof vr?.dateAdministered === 'string' ? vr.dateAdministered : ''),
        nextDueDate: typeof vr?.next_due_date === 'string' ? vr.next_due_date : (typeof vr?.nextDueDate === 'string' ? vr.nextDueDate : undefined),
      }))
    : [];

  const meaningfulConditions = healthRecordsData?.conditions?.filter(
    c => c && c.trim() && c.trim().toLowerCase() !== 'none' && c.trim() !== '無'
  ) || [];

  // 根據品種名稱推斷動物類型
  const getAnimalType = (breed: string): 'dog' | 'cat' => {
    const catBreeds = ['英國短毛貓', '美國短毛貓', '波斯貓', '暹羅貓', '緬因貓', '布偶貓', '俄羅斯藍貓', '蘇格蘭摺耳貓', '孟加拉貓', '阿比西尼亞貓', 'Persian', 'Siamese', 'Maine Coon', 'British Shorthair', 'Ragdoll', 'Bengal', 'Abyssinian', 'Russian Blue', 'Scottish Fold', 'American Shorthair'];
    const breedLower = breed.toLowerCase();
    return catBreeds.some(catBreed => breedLower.includes(catBreed.toLowerCase()) || catBreed.toLowerCase().includes(breedLower)) ? 'cat' : 'dog';
  };
  
  return {
    id: dbViewDog.id,
    name: dbViewDog.name || '未命名動物',
    breed: dbViewDog.breed || '未知品種',
    age: typeof dbViewDog.age === 'number' ? dbViewDog.age : 0,
    gender: dbViewDog.gender === 'Male' || dbViewDog.gender === 'Female' || dbViewDog.gender === 'Unknown' ? dbViewDog.gender : 'Unknown',
    photos: photos.length > 0 ? photos : ['https://placehold.co/600x400.png?text=' + encodeURIComponent(dbViewDog.name || 'Pet')],
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
    vaccinationRecords,
    animalType: getAnimalType(dbViewDog.breed || ''),
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
  const [isLoadingDogs, setIsLoadingDogs] = useState(false);
  const [dogsLoaded, setDogsLoaded] = useState(false);
  const [likedDogsCountCache, setLikedDogsCountCache] = useState<number | null>(null);

  // 品種篩選狀態
  const [breedFilter, setBreedFilter] = useState<BreedFilter>({
    animalType: 'all',
    selectedBreeds: []
  });

  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [session, setSession] = useState<SupabaseSession | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  const [isLiking, setIsLiking] = useState<Set<string>>(new Set());
  const { toast } = useToast();

  // 篩選狗狗的函數
  const getFilteredDogs = useCallback((): Dog[] => {
    return masterDogList.filter(dog => {
      // 動物類型篩選
      if (breedFilter.animalType !== 'all' && dog.animalType !== breedFilter.animalType) {
        return false;
      }
      
      // 品種篩選
      if (breedFilter.selectedBreeds.length > 0 && !breedFilter.selectedBreeds.includes(dog.breed)) {
        return false;
      }
      
      return true;
    });
  }, [masterDogList, breedFilter]);

  // Load dogs data when needed (for swipe interface)
  const loadDogsWhenNeeded = useCallback(async () => {
    if (dogsLoaded || isLoadingDogs || !user) return;
    
    setIsLoadingDogs(true);
    try {
      await loadInitialDogData(user.id);
      setDogsLoaded(true);
    } catch (error) {
      console.error('Error loading dogs when needed:', error);
    } finally {
      setIsLoadingDogs(false);
    }
  }, [dogsLoaded, isLoadingDogs, user?.id]); // 只依賴 user.id 而不是整個 user 物件

  const resetDogState = useCallback(() => {
    setMasterDogList([]);
    setDogsToSwipe([]);
    setLikedDogs([]);
    setDogsLoaded(false);
    setSeenDogIds(new Set());
    setIsLoadingDogs(true);
    setLikedDogsCountCache(null);
  }, []);

  // Get liked dogs count without loading full dog data
  const getLikedDogsCount = useCallback(async (): Promise<number> => {
    console.log('🔍 [getLikedDogsCount] 開始獲取喜歡的狗狗數量');
    
    if (!user) {
      console.log('❌ [getLikedDogsCount] 用戶未登入，返回 0');
      return 0;
    }
    
    console.log(`👤 [getLikedDogsCount] 用戶ID: ${user.id}`);
    
    // If dogs are already loaded, use cached data
    if (dogsLoaded && likedDogs.length > 0) {
      console.log(`✅ [getLikedDogsCount] 使用已載入的狗狗資料，數量: ${likedDogs.length}`);
      return likedDogs.length;
    }
    
    // Use cached count if available
    if (likedDogsCountCache !== null) {
      console.log(`💾 [getLikedDogsCount] 使用快取資料，數量: ${likedDogsCountCache}`);
      return likedDogsCountCache;
    }
    
    console.log('🌐 [getLikedDogsCount] 開始從資料庫獲取數量');
    
    try {
      const { count, error } = await supabase
        .from('user_dog_likes')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);
      
      if (error) {
        console.error('❌ [getLikedDogsCount] 資料庫查詢錯誤:', error);
        return 0;
      }
      
      const result = count || 0;
      console.log(`✅ [getLikedDogsCount] 成功獲取數量: ${result}`);
      setLikedDogsCountCache(result);
      console.log(`💾 [getLikedDogsCount] 已快取數量: ${result}`);
      return result;
    } catch (error) {
      console.error('💥 [getLikedDogsCount] 未預期錯誤:', error);
      return 0;
    }
  }, [user?.id, dogsLoaded, likedDogsCountCache]); // 只依賴真正會影響結果的變數


  const fetchProfileAndSet = async (user: SupabaseUser | null) => {
    console.log('🔍 [fetchProfileAndSet] 開始獲取個人資料');
    
    if (!user) {
      console.log('❌ [fetchProfileAndSet] 用戶為空，設定 profile 為 null');
      setProfile(null);
      return;
    }

    console.log(`👤 [fetchProfileAndSet] 用戶ID: ${user.id}, Email: ${user.email}`);

    // 先檢查快取
    const cachedProfile = localStorage.getItem('pawsconnect_profile');
    if (cachedProfile) {
      try {
        const profileData = JSON.parse(cachedProfile);
        if (profileData.id === user.id) {
          console.log('💾 [fetchProfileAndSet] 使用快取的 profile 資料:', profileData);
          setProfile(profileData);
          // 在背景更新 profile，但不阻塞 UI
          console.log('🔄 [fetchProfileAndSet] 在背景更新 profile 資料');
          fetchAndUpdateProfile(user);
          return;
        }
      } catch (e) {
        console.log('快取 profile 資料無效');
      }
    }

    // 如果沒有快取，則進行完整載入
    await fetchAndUpdateProfile(user);
  };

  const fetchAndUpdateProfile = async (user: SupabaseUser) => {
    console.log('🌐 [fetchAndUpdateProfile] 開始從資料庫獲取最新 profile');
    
    try {
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single<DbProfile>();

      if (profileError && profileError.code !== 'PGRST116') {
        console.error('❌ [fetchAndUpdateProfile] 讀取個人資料時發生錯誤:', profileError);
        setProfile(null);
      } else if (profileData) {
        console.log('✅ [fetchAndUpdateProfile] 成功獲取 profile 資料:', profileData);
        
        const newProfile = {
          id: profileData.id,
          role: profileData.role as UserRole,
          fullName: profileData.full_name,
          avatarUrl: profileData.avatar_url,
          updatedAt: profileData.updated_at,
        };
        
        console.log('📝 [fetchAndUpdateProfile] 處理後的 profile:', newProfile);
        setProfile(newProfile);
        
        // 更新快取
        localStorage.setItem('pawsconnect_profile', JSON.stringify(newProfile));
        console.log('💾 [fetchAndUpdateProfile] 已更新 localStorage 快取');
      } else {
        console.log('⚠️ [fetchAndUpdateProfile] 未找到 profile 資料，嘗試創建新的 profile');
        
        // 創建新的 profile 記錄
        try {
          console.log('🔨 [fetchAndUpdateProfile] 準備創建 profile，用戶資料:', {
            id: user.id,
            email: user.email,
            user_metadata: user.user_metadata
          });
          
          const profileData = {
            id: user.id,
            role: 'adopter' as const, // 使用正確的 enum 值
            full_name: user.user_metadata?.full_name || user.email?.split('@')[0] || null,
            avatar_url: user.user_metadata?.avatar_url || null,
          };
          
          // 驗證必要欄位
          if (!profileData.id) {
            console.error('❌ [fetchAndUpdateProfile] 缺少用戶 ID');
            setProfile(null);
            return;
          }
          
          if (!['adopter', 'caregiver'].includes(profileData.role)) {
            console.error('❌ [fetchAndUpdateProfile] 無效的角色值:', profileData.role);
            profileData.role = 'adopter' as const; // 使用預設值
          }
          
          console.log('📝 [fetchAndUpdateProfile] 即將插入的資料:', profileData);
          console.log('📝 [fetchAndUpdateProfile] 用戶詳細資訊:', {
            id: user.id,
            email: user.email,
            user_metadata: user.user_metadata,
            email_confirmed_at: user.email_confirmed_at
          });
          
          const { data: newProfileData, error: createError } = await supabase
            .from('profiles')
            .insert(profileData)
            .select()
            .single<DbProfile>();

          if (createError) {
            console.error('❌ [fetchAndUpdateProfile] 創建 profile 失敗:', createError);
            console.error('❌ [fetchAndUpdateProfile] 詳細錯誤資訊:', {
              code: createError.code,
              message: createError.message,
              details: createError.details,
              hint: createError.hint,
              rawError: JSON.stringify(createError)
            });
            console.error('❌ [fetchAndUpdateProfile] 嘗試插入的資料:', profileData);
            
            // 如果是唯一性約束錯誤，嘗試更新現有記錄
            if (createError.code === '23505') {
              console.log('🔄 [fetchAndUpdateProfile] profile 已存在，嘗試更新');
              const { data: updateData, error: updateError } = await supabase
                .from('profiles')
                .update({
                  full_name: profileData.full_name,
                  avatar_url: profileData.avatar_url,
                  updated_at: new Date().toISOString()
                })
                .eq('id', user.id)
                .select()
                .single<DbProfile>();
                
              if (updateError) {
                console.error('❌ [fetchAndUpdateProfile] 更新 profile 也失敗:', updateError);
                console.error('❌ [fetchAndUpdateProfile] 更新錯誤詳情:', {
                  code: updateError.code,
                  message: updateError.message,
                  details: updateError.details,
                  hint: updateError.hint
                });
                setProfile(null);
                return;
              } else if (updateData) {
                console.log('✅ [fetchAndUpdateProfile] 成功更新現有 profile:', updateData);
                const updatedProfile = {
                  id: updateData.id,
                  role: updateData.role as UserRole,
                  fullName: updateData.full_name,
                  avatarUrl: updateData.avatar_url,
                  updatedAt: updateData.updated_at,
                };
                setProfile(updatedProfile);
                localStorage.setItem('pawsconnect_profile', JSON.stringify(updatedProfile));
                return;
              }
            }
            
            // 對於其他類型的錯誤，創建臨時 profile 以避免應用程式卡住
            console.log('🆘 [fetchAndUpdateProfile] 創建臨時 profile 以避免載入卡住');
            const tempProfile = {
              id: user.id,
              role: 'adopter' as UserRole,
              fullName: user.user_metadata?.full_name || user.email?.split('@')[0] || '新用戶',
              avatarUrl: user.user_metadata?.avatar_url || null,
              updatedAt: new Date().toISOString(),
            };
            
            setProfile(tempProfile);
            console.log('⚠️ [fetchAndUpdateProfile] 使用臨時 profile，下次登入將重新嘗試創建');
            return;
          } else if (newProfileData) {
            console.log('✅ [fetchAndUpdateProfile] 成功創建新的 profile:', newProfileData);
            
            const newProfile = {
              id: newProfileData.id,
              role: newProfileData.role as UserRole,
              fullName: newProfileData.full_name,
              avatarUrl: newProfileData.avatar_url,
              updatedAt: newProfileData.updated_at,
            };
            
            setProfile(newProfile);
            localStorage.setItem('pawsconnect_profile', JSON.stringify(newProfile));
            console.log('💾 [fetchAndUpdateProfile] 新 profile 已快取');
          }
        } catch (createErr) {
          console.error('💥 [fetchAndUpdateProfile] 創建 profile 時發生錯誤:', createErr);
          
          // 如果創建失敗，設置一個臨時的 profile
          console.log('🆘 [fetchAndUpdateProfile] 創建臨時 profile 以避免載入卡住');
          const tempProfile = {
            id: user.id,
            role: 'adopter' as UserRole,
            fullName: user.user_metadata?.full_name || user.email?.split('@')[0] || '新用戶',
            avatarUrl: user.user_metadata?.avatar_url || null,
            updatedAt: new Date().toISOString(),
          };
          
          setProfile(tempProfile);
          // 不快取臨時 profile，以便下次重新嘗試創建
          console.log('⚠️ [fetchAndUpdateProfile] 使用臨時 profile，下次登入將重新嘗試創建');
        }
      }
    } catch (e) {
      console.error("💥 [fetchAndUpdateProfile] 處理個人資料時發生未預期的錯誤:", e);
      setProfile(null);
    }
  };

  useEffect(() => {
    const initializeSession = async () => {
      console.log('🚀 [initializeSession] 開始初始化 session');
      
      // 立即設置載入狀態為 false，使用快取資料
      const cachedUser = localStorage.getItem('pawsconnect_user');
      const cachedProfile = localStorage.getItem('pawsconnect_profile');
      const cachedSession = localStorage.getItem('pawsconnect_session');
      
      console.log('💾 [initializeSession] 檢查快取資料:', {
        hasUser: !!cachedUser,
        hasProfile: !!cachedProfile, 
        hasSession: !!cachedSession
      });
      
      if (cachedUser && cachedProfile && cachedSession) {
        try {
          const userData = JSON.parse(cachedUser);
          const profileData = JSON.parse(cachedProfile);
          const sessionData = JSON.parse(cachedSession);
          
          console.log('📦 [initializeSession] 解析快取資料成功:', {
            userId: userData.id,
            userEmail: userData.email,
            profileId: profileData.id,
            sessionExpiresAt: sessionData.expires_at
          });
          
          // 立即設置快取資料，不等待驗證
          setUser(userData);
          setProfile(profileData);
          setSession(sessionData);
          setIsLoadingAuth(false);
          
          // 檢查 session 是否過期
          const expiresAt = new Date(sessionData.expires_at || sessionData.expires_in);
          const now = new Date();
          
          if (expiresAt > now) {
            // Session 未過期，在背景驗證並更新
            supabase.auth.getSession().then(({ data: { session } }) => {
              if (session && session.user.id === userData.id) {
                setSession(session);
                localStorage.setItem('pawsconnect_session', JSON.stringify(session));
                // 背景更新 profile
                fetchAndUpdateProfile(session.user);
              }
            });
            
            return;
          }
        } catch (e) {
          console.log('緩存數據無效，清除並重新驗證');
        }
        
        // 清除無效緩存
        localStorage.removeItem('pawsconnect_user');
        localStorage.removeItem('pawsconnect_profile');
        localStorage.removeItem('pawsconnect_session');
      }
      
      // 執行完整驗證
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
          // 緩存用戶資料和 session
          localStorage.setItem('pawsconnect_user', JSON.stringify(currentUser));
          if (initialSession) {
            localStorage.setItem('pawsconnect_session', JSON.stringify(initialSession));
          }
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

        // 只有在用戶真正改變時才設置載入狀態
        const userChanged = currentUser?.id !== previousUserId;
        
        if (userChanged) {
          setIsLoadingAuth(true);
        }
        
        setSession(newSession);
        setUser(currentUser);
        
        try {
          if (currentUser && userChanged) {
              await fetchProfileAndSet(currentUser);
              // 緩存用戶和 session 資料
              localStorage.setItem('pawsconnect_user', JSON.stringify(currentUser));
              if (newSession) {
                localStorage.setItem('pawsconnect_session', JSON.stringify(newSession));
              }
          } else if (!currentUser) {
              setProfile(null);
              resetDogState();
              // 清除緩存
              localStorage.removeItem('pawsconnect_user');
              localStorage.removeItem('pawsconnect_profile');
              localStorage.removeItem('pawsconnect_session');
          }
        } catch (error) {
          console.error('Error handling auth state change:', error);
        } finally {
          // 只有在用戶變更時才重置載入狀態
          if (userChanged || !currentUser) {
            setIsLoadingAuth(false);
          }
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
    console.log(`🔄 開始載入動物資料 - userId: ${currentUserId}`);
    
    if (!currentUserId) {
        setMasterDogList([]);
        setDogsToSwipe([]);
        setLikedDogs([]);
        setIsLoadingDogs(false);
        return;
    }

    try {
        console.log('📝 查詢已按讚的動物...');
        const likedDogsPromise = supabase
            .from('user_dog_likes')
            .select(`dogs_for_adoption_view(*)`)
            .eq('user_id', currentUserId);

        console.log('📝 查詢所有動物...');
        const allDogsPromise = supabase
            .from('dogs_for_adoption_view')
            .select('*');

        const [likedDogsResult, allDogsResult] = await Promise.all([likedDogsPromise, allDogsPromise]);
        
        console.log('查詢結果:', { 
            likedDogsResult: likedDogsResult.data?.length, 
            allDogsResult: allDogsResult.data?.length 
        });

        const { data: likedDogsData, error: likedDogsError } = likedDogsResult;
        if (likedDogsError) {
            console.error("Error fetching liked dogs from Supabase:", likedDogsError);
            throw likedDogsError;
        }
        const userLikedDbDogs = (likedDogsData || [])
            .map((likeRecord: any) => likeRecord.dogs_for_adoption_view as DbDog | null)
            .filter((dog): dog is DbDog => !!dog);
        const userLikedDogs = userLikedDbDogs.map(mapDbDogToDogType);
        setLikedDogs(userLikedDogs);

        const { data: allDogsData, error: allDogsError } = allDogsResult;
        if (allDogsError) {
            console.error("❌ 查詢所有動物時發生錯誤:", allDogsError);
            throw allDogsError;
        }
        const allDogs = allDogsData.map(mapDbDogToDogType);
        setMasterDogList(allDogs);
        
        console.log(`✅ 載入了 ${allDogs.length} 隻動物到 masterDogList`);
        console.log('動物 IDs:', allDogs.map(d => ({ id: d.id, name: d.name })));

        const likedDogIdsSet = new Set<string>(userLikedDogs.map(d => d.id));
        setSeenDogIds(likedDogIdsSet);
        
        const unseenDogs = allDogs.filter(dog => !likedDogIdsSet.has(dog.id));
        setDogsToSwipe(unseenDogs);
        
        console.log(`📊 統計: 總共${allDogs.length}隻動物，已按讚${userLikedDogs.length}隻，待滑卡${unseenDogs.length}隻`);

    } catch (error) {
        console.error("載入動物資料時發生未處理的錯誤:", error);
        setMasterDogList([]);
        setDogsToSwipe([]);
        setLikedDogs([]);
        toast({
            title: "資料載入失敗",
            description: "無法載入動物資料，請稍後重新整理。",
            variant: "destructive",
        });
    } finally {
        setIsLoadingDogs(false);
    }
}, [toast]);


  // Remove automatic dog loading when user logs in
  // Dogs will be loaded on-demand when needed for swipe interface

  useEffect(() => {
    if (!isLoadingDogs) {
      const dogsForSwiping = masterDogList.filter(dog => !seenDogIds.has(dog.id));
      setDogsToSwipe(dogsForSwiping);
    }
  }, [seenDogIds, masterDogList, isLoadingDogs]);


  const likeDog = async (dogId: string) => {
    console.log(`🐕 開始按讚流程 - dogId: ${dogId}, userId: ${user?.id}`);
    
    if (isLiking.has(dogId)) {
      console.log(`⚠️ 動物 ${dogId} 正在處理中，跳過重複按讚`);
      return;
    }

    if (!user) {
      console.log("❌ 用戶未登入");
      toast({
        variant: "destructive",
        title: "需要登入",
        description: "請先登入才能按讚動物！",
      });
      return;
    }

    const dog = masterDogList.find(d => d.id === dogId);
    if (!dog) {
      console.log(`❌ 找不到動物 ${dogId} 在 masterDogList 中`);
      return;
    }

    console.log(`✅ 找到動物: ${dog.name} (${dogId})`);

    try {
      setIsLiking(prev => new Set(prev).add(dogId));
      passDog(dogId); 

      console.log(`📝 準備插入資料庫: user_id=${user.id}, dog_id=${dogId}`);
      
      const insertData = { 
        user_id: user.id, 
        dog_id: dogId,
        liked_at: new Date().toISOString()
      };
      
      console.log('插入資料:', insertData);

      // 先嘗試檢查是否已經存在該記錄
      const { data: existingLike, error: checkError } = await supabase
        .from('user_dog_likes')
        .select('*')
        .eq('user_id', user.id)
        .eq('dog_id', dogId);

      console.log('🔍 檢查現有按讚記錄:', { existingLike, checkError });

      if (checkError) {
        console.log('⚠️ 檢查現有記錄時發生錯誤:', checkError.message);
      } else if (existingLike && existingLike.length > 0) {
        console.log('✅ 用戶已經按讚過此動物，跳過插入');
        return;
      }

      // 直接嘗試插入資料
      console.log('🚀 嘗試直接插入資料到 user_dog_likes...');
      const { data, error: insertError } = await supabase
        .from('user_dog_likes')
        .insert(insertData)
        .select();
      
      console.log('✅ 資料庫操作完成');
      console.log('插入結果:', { data, error: insertError });
      console.log('插入的資料筆數:', data ? data.length : 0);
      
      // 詳細錯誤資訊
      if (insertError) {
        console.log('🚨 詳細錯誤資訊:');
        console.log('錯誤代碼:', insertError.code);
        console.log('錯誤訊息:', insertError.message);
        console.log('錯誤詳情:', insertError.details);
        console.log('錯誤提示:', insertError.hint);
        
        // 處理不同類型的錯誤
        if (insertError.code === '23505') {
          console.log(`⚠️ 重複按讚 - 用戶 ${user.id} 已經喜歡動物 ${dogId}`);
        } else {
            console.error("❌ 資料庫插入錯誤:", insertError);
            toast({
              variant: "destructive",
              title: "按讚失敗",
              description: `無法儲存您的選擇: ${insertError.message}`,
            });
            setSeenDogIds(prev => {
              const newSet = new Set(prev);
              newSet.delete(dogId);
              return newSet;
            });
            return; 
        }
      } else {
        console.log(`✅ 成功插入資料庫 - 動物 ${dogId} 已被用戶 ${user.id} 按讚`);
      }

      // 更新 React 狀態
      setLikedDogs(prev => {
        const alreadyLiked = prev.some(d => d.id === dogId);
        if (alreadyLiked) {
          console.log(`⚠️ 動物 ${dogId} 已在 likedDogs 中`);
          return prev;
        }
        
        const newLikedDogs = [...prev, dog];
        console.log(`✅ 動物 ${dog.name} 已加入 likedDogs，目前總數: ${newLikedDogs.length}`);
        setLikedDogsCountCache(newLikedDogs.length);
        return newLikedDogs;
      });

      setSeenDogIds(prev => new Set(prev).add(dogId));

      toast({
        title: "加入配對清單！",
        description: `${dog.name} 已加入您的配對清單。`,
      });

    } catch (error) {
      console.error("❌ 按讚動物時發生錯誤:", error);
      toast({
        variant: "destructive",
        title: "按讚失敗",
        description: "無法加入配對清單，請稍後再試。",
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
    setDogsToSwipe(prevDogs => prevDogs.filter(dog => dog.id !== dogId));
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
    
    // 直接註冊，不需要電子郵件驗證
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          role,
          full_name: fullName || email.split('@')[0],
        }
      }
    });

    if (authError) {
      setIsLoadingAuth(false);
      console.error('註冊錯誤:', authError);
      return { user: null, error: authError.message || '註冊失敗。請稍後再試。' };
    }
    
    if (!authData.user) {
      setIsLoadingAuth(false);
      return { user: null, error: '註冊成功，但未取得使用者資訊。' };
    }

    console.log('註冊成功，用戶資料:', authData.user);

    // 等待 session 完全建立
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // 直接建立個人資料，不需要等待電子郵件確認
    try {
      await createUserProfile(authData.user, role, fullName);
      console.log('✅ 個人資料建立成功');
    } catch (error) {
      console.error('❌ 建立個人資料失敗:', error);
      // 不阻止註冊流程，但回傳錯誤資訊
      setIsLoadingAuth(false);
      return { 
        user: authData.user, 
        error: `註冊成功，但建立個人資料時發生錯誤: ${error instanceof Error ? error.message : '未知錯誤'}` 
      };
    }
    
    setIsLoadingAuth(false);
    return { user: authData.user, error: null };
  };

  // 將建立個人資料的邏輯分離成獨立函數
  const createUserProfile = async (user: SupabaseUser, role: UserRole, fullName?: string | null) => {
    try {
      // 等待一小段時間，確保 auth session 完全建立
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // 重新取得當前 session 確保權限正確
      const { data: session } = await supabase.auth.getSession();
      if (!session.session) {
        throw new Error('用戶 session 尚未建立，請稍後重試');
      }
      
      // 首先檢查是否已經存在個人資料
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      
      if (existingProfile) {
        console.log('✅ [createUserProfile] 個人資料已存在，跳過建立');
        return;
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
          return user.email?.split('@')[0] || 'User';
      };
      
      const profileData = {
        id: user.id,
        role,
        full_name: fullName || user.email?.split('@')[0] || 'User',
        avatar_url: `https://placehold.co/100x100.png?text=${encodeURIComponent(getAvatarText())}`,
        updated_at: new Date().toISOString(),
      };
      
      console.log('📝 [createUserProfile] 創建 profile 資料:', profileData);
      console.log('📝 [createUserProfile] 使用 session:', session.session.user.id);
      
      // 嘗試建立個人資料，如果失敗則重試
      let retryCount = 0;
      const maxRetries = 3;
      
      while (retryCount < maxRetries) {
        const { error: profileError } = await supabase.from('profiles').insert(profileData);
        
        if (!profileError) {
          console.log('✅ [createUserProfile] 成功建立個人資料');
          return;
        }
        
        retryCount++;
        console.warn(`⚠️ [createUserProfile] 建立個人資料失敗 (嘗試 ${retryCount}/${maxRetries}):`, profileError);
        
        if (retryCount >= maxRetries) {
          console.error('❌ [createUserProfile] 建立個人資料時發生錯誤:', profileError);
          console.error('❌ [createUserProfile] 詳細錯誤資訊:', {
            code: profileError.code,
            message: profileError.message,
            details: profileError.details,
            hint: profileError.hint,
            rawError: JSON.stringify(profileError)
          });
          throw new Error('建立個人資料失敗: ' + (profileError.message || '未知錯誤'));
        }
        
        // 等待後重試
        await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
      }
    } catch (error: any) {
      console.error('💥 [createUserProfile] 建立個人資料時發生未預期錯誤:', error);
      throw new Error('建立個人資料失敗: ' + (error.message || '未知錯誤'));
    }
  };

  const logout = async (): Promise<{ error: string | null }> => {
    setIsLoadingAuth(true);
    
    // 清除本地緩存
    localStorage.removeItem('pawsconnect_user');
    localStorage.removeItem('pawsconnect_profile');
    localStorage.removeItem('pawsconnect_session');
    
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
      // 確保有當前的 session
      const { data: session } = await supabase.auth.getSession();
      if (!session.session) {
        return { success: false, error: "用戶 session 無效，請重新登入。" };
      }

      const profileUpdateData: Partial<DbProfile> = {
        updated_at: new Date().toISOString(),
      };
      
      if (updates.fullName !== undefined) {
        profileUpdateData.full_name = updates.fullName;
      }
      if (updates.avatarUrl !== undefined) {
        profileUpdateData.avatar_url = updates.avatarUrl;
      }

      console.log('📝 [updateProfile] 更新資料:', profileUpdateData);
      console.log('📝 [updateProfile] 用戶 ID:', user.id);

      // 使用 update 而不是 upsert，更明確地針對用戶的記錄
      const { data, error } = await supabase
        .from('profiles')
        .update(profileUpdateData)
        .eq('id', user.id)
        .select()
        .single<DbProfile>();

      if (error) {
        console.error('❌ [updateProfile] 更新個人資料錯誤:', error);
        throw error;
      }

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
    
    try {
      console.log('🗑️ [deleteAccount] 開始刪除帳號流程...');
      
      // 定義需要清理的資料表（按外鍵依賴順序）
      // 只包含確實存在的資料表
      const tablesToCleanup = [
        { name: 'pets', userField: 'user_id' },                    // 寵物記錄
        { name: 'user_dog_likes', userField: 'user_id' },          // 按讚記錄
        { name: 'profiles', userField: 'id' }                      // 個人資料（使用 id 而非 user_id）
      ];
      
      // 嘗試清理可能存在的其他資料表
      const optionalTables = [
        { name: 'user_fcm_tokens', userField: 'user_id' },         // FCM tokens（可能存在）
        { name: 'health_records', userField: 'user_id' },          // 健康記錄（如果有 user_id）
        { name: 'feeding_records', userField: 'user_id' },         // 餵食記錄（如果有 user_id）
        { name: 'vaccine_records', userField: 'user_id' }          // 疫苗記錄（如果有 user_id）
      ];
      
      // 清理必要的資料表
      for (const table of tablesToCleanup) {
        console.log(`🗑️ [deleteAccount] 正在刪除 ${table.name} 資料...`);
        
        try {
          const { error: tableError } = await supabase
            .from(table.name)
            .delete()
            .eq(table.userField, user.id);
          
          if (tableError) {
            console.error(`❌ [deleteAccount] 刪除 ${table.name} 失敗:`, tableError);
            return { error: `刪除 ${table.name} 失敗: ${tableError.message}` };
          } else {
            console.log(`✅ [deleteAccount] 成功刪除 ${table.name}`);
          }
        } catch (tableErr: any) {
          console.error(`💥 [deleteAccount] 刪除 ${table.name} 時發生錯誤:`, tableErr);
          return { error: `刪除 ${table.name} 時發生錯誤: ${tableErr.message}` };
        }
      }
      
      // 嘗試清理可選的資料表（錯誤不會阻止流程）
      for (const table of optionalTables) {
        console.log(`🔍 [deleteAccount] 嘗試清理 ${table.name} 資料...`);
        
        try {
          const { error: tableError } = await supabase
            .from(table.name)
            .delete()
            .eq(table.userField, user.id);
          
          if (tableError) {
            console.log(`⚠️ [deleteAccount] ${table.name} 清理失敗（可能不存在）:`, tableError.message);
          } else {
            console.log(`✅ [deleteAccount] 成功清理 ${table.name}`);
          }
        } catch (tableErr: any) {
          console.log(`⚠️ [deleteAccount] ${table.name} 不存在或無法存取:`, tableErr.message);
        }
      }
      
      // 最後刪除 auth 用戶
      console.log('🗑️ [deleteAccount] 正在刪除認證帳號...');
      const { error: authError } = await supabase.rpc('delete_user_account');
      
      if (authError) {
        console.error('❌ [deleteAccount] 刪除認證帳號失敗:', authError);
        
        // 如果仍然有外鍵約束錯誤，提供更詳細的錯誤訊息
        if (authError.code === '23503') {
          const referencedTable = authError.details?.match(/table "(\w+)"/)?.[1];
          return { 
            error: `刪除帳號失敗：還有資料在 ${referencedTable || '其他資料表'} 中引用此帳號。請聯繫客服協助處理。` 
          };
        }
        
        return { error: `刪除帳號失敗: ${authError.message}` };
      }
      
      console.log('✅ [deleteAccount] 帳號刪除成功');
      
      // 清除本地資料
      localStorage.removeItem('pawsconnect_user');
      localStorage.removeItem('pawsconnect_profile');
      localStorage.removeItem('pawsconnect_session');
      
      return { error: null };
      
    } catch (error: any) {
      console.error('💥 [deleteAccount] 刪除帳號時發生未預期錯誤:', error);
      return { error: `刪除帳號時發生錯誤: ${error.message || '未知錯誤'}` };
    }
  };

  const sendPasswordResetEmail = async (email: string): Promise<{ error: string | null }> => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `https://7jjl14w0-3000.asse.devtunnels.ms/reset-password`
      });
      if (error) throw error;
      return { error: null };
    } catch (error) {
      console.error("Error sending password reset email:", error);
      return { error: "無法發送密碼重設郵件，請稍後再試。" };
    }
  };

  const updateUserEmail = async (newEmail: string): Promise<{ error: string | null }> => {
    if (!user) {
      return { error: "使用者未登入。" };
    }
    try {
      const { error } = await supabase.auth.updateUser({ email: newEmail });
      if (error) throw error;
      return { error: null };
    } catch (error) {
      console.error("Error updating user email:", error);
      return { error: "無法更新郵件地址，請稍後再試。" };
    }
  };

  const value = {
    dogsToSwipe,
    likedDogs,
    seenDogIds,
    likeDog,
    passDog,
    getDogById,
    isLoadingDogs,
    loadDogsWhenNeeded,
    getLikedDogsCount,

    // 品種篩選功能
    breedFilter,
    setBreedFilter,
    getFilteredDogs,

    user,
    profile,
    session,
    isLoadingAuth,
    isUpdatingProfile,
    login,
    signUp,
    logout,
    updateProfile,
    deleteAccount,
    sendPasswordResetEmail,
    updateUserEmail,
  };

  return <PawsConnectContext.Provider value={value}>{children}</PawsConnectContext.Provider>;
};

export const usePawsConnect = () => {
  const context = React.useContext(PawsConnectContext);
  if (context === undefined) {
    throw new Error('usePawsConnect must be used within a PawsConnectProvider');
  }
  return context;
};




