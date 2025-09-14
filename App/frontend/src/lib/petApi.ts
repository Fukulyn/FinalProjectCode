// 寵物資料管理的輔助函數
import { supabase } from '../lib/supabase';
import { PetData } from '../types';

// 確保用戶有profile記錄
const ensureUserProfile = async (userId: string) => {
  try {
    // 檢查是否已存在profile
    const { data: existingProfile, error: fetchError } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', userId)
      .maybeSingle(); // 使用 maybeSingle() 而不是 single()，避免在無資料時拋出錯誤

    // 如果查詢時發生錯誤（不是無資料的情況）
    if (fetchError) {
      console.error('❌ 查詢profile時發生錯誤:', fetchError);
      return false;
    }

    if (existingProfile) {
      console.log('✅ 用戶profile已存在:', existingProfile.id);
      return true;
    }

    // 如果不存在，創建profile
    console.log('🔄 正在創建用戶profile...');
    const { error: profileError } = await supabase
      .from('profiles')
      .insert([
        {
          id: userId,
          updated_at: new Date().toISOString(),
          role: 'adopter', // 預設角色為領養者
        }
      ]);

    if (profileError) {
      console.error('❌ 創建profile失敗:', profileError);
      return false;
    }

    console.log('✅ 用戶profile創建成功');
    return true;
  } catch (error) {
    console.error('❌ 檢查/創建profile時發生錯誤:', error);
    return false;
  }
};

export const createPet = async (userId: string, petData: PetData) => {
  try {
    // 檢查當前認證狀態
    const { data: { user: currentUser }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !currentUser) {
      console.error('認證錯誤:', authError);
      return { data: null, error: new Error('用戶未正確認證') };
    }
    
    if (currentUser.id !== userId) {
      console.error('用戶ID不匹配:', { currentUserId: currentUser.id, requestedUserId: userId });
      return { data: null, error: new Error('用戶ID不匹配') };
    }

    // 確保用戶有profile記錄
    const hasProfile = await ensureUserProfile(userId);
    if (!hasProfile) {
      return { data: null, error: new Error('無法創建或檢查用戶profile') };
    }
    
    console.log('📝 準備創建寵物:', {
      userId: currentUser.id,
      userEmail: currentUser.email,
      petData: petData
    });

    // 先嘗試直接插入所有欄位
    const fullData = {
      user_id: userId,
      name: petData.name,
      type: petData.type || '狗', // 提供預設值
      breed: petData.breed,
      birth_date: petData.birth_date,
      weight: petData.weight,
      location: petData.location,
      photos: petData.photos,
    };

    const { data, error } = await supabase
      .from('pets')
      .insert([fullData])
      .select();

    if (error) {
      console.error('💥 插入寵物資料失敗:', error);
      
      // 如果發生 schema cache 錯誤，嘗試只插入必要欄位
      if (error.code === 'PGRST204' && error.message.includes('type')) {
        console.warn('Schema cache 問題，嘗試替代方案');
        
        const basicData = {
          user_id: userId,
          name: petData.name,
          breed: petData.breed,
          birth_date: petData.birth_date,
          weight: petData.weight,
          location: petData.location,
          photos: petData.photos,
        };

        const { data: basicResult, error: basicError } = await supabase
          .from('pets')
          .insert([basicData])
          .select();

        if (basicError) {
          throw basicError;
        }

        // 如果基本插入成功，嘗試更新 type 欄位
        if (basicResult && basicResult.length > 0 && petData.type) {
          await supabase
            .from('pets')
            .update({ type: petData.type })
            .eq('id', basicResult[0].id);
        }

        return { data: basicResult, error: null };
      }
      
      throw error;
    }

    console.log('✅ 寵物創建成功:', data);
    return { data, error: null };
  } catch (error) {
    console.error('創建寵物時發生錯誤:', error);
    return { data: null, error };
  }
};

export const updatePet = async (petId: string, petData: PetData) => {
  try {
    const updateData: Record<string, unknown> = {
      name: petData.name,
      breed: petData.breed,
      birth_date: petData.birth_date,
      weight: petData.weight,
      location: petData.location,
    };

    if (petData.type) {
      updateData.type = petData.type;
    }

    if (petData.photos) {
      updateData.photos = petData.photos;
    }

    const { data, error } = await supabase
      .from('pets')
      .update(updateData)
      .eq('id', petId)
      .select();

    if (error) {
      throw error;
    }

    return { data, error: null };
  } catch (error) {
    console.error('更新寵物時發生錯誤:', error);
    return { data: null, error };
  }
};
