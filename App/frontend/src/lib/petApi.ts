// 寵物資料管理的輔助函數
import { supabase } from '../lib/supabase';
import { PetData } from '../types';

export const createPet = async (userId: string, petData: PetData) => {
  try {
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
