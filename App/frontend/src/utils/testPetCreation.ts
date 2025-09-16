// 測試寵物創建功能和資料庫狀態
import { supabase } from '../lib/supabase';

export async function testDatabaseConnection() {
  try {
    console.log('測試 Supabase 連接...');
    const { data, error } = await supabase.from('pets').select('*').limit(1);
    
    if (error) {
      console.error('資料庫連接錯誤:', error);
      return { success: false, error };
    }
    
    console.log('資料庫連接成功');
    return { success: true, data };
  } catch (error) {
    console.error('連接測試失敗:', error);
    return { success: false, error };
  }
}

export async function checkPetsTableSchema() {
  try {
    console.log('檢查 pets 表結構...');
    
    // 嘗試查詢表的所有欄位
    const { error } = await supabase
      .from('pets')
      .select('*')
      .limit(0); // 只獲取結構，不獲取資料
    
    if (error) {
      console.error('Schema 檢查錯誤:', error);
      return { success: false, error };
    }
    
    console.log('Pets 表結構檢查成功');
    return { success: true };
  } catch (error) {
    console.error('Schema 檢查失敗:', error);
    return { success: false, error };
  }
}

export async function testPetInsertion(userId: string) {
  try {
    console.log('測試寵物資料插入...');
    
    const testPetData = {
      user_id: userId,
      name: '測試寵物',
      type: '狗',
      breed: '黃金獵犬',
      birth_date: '2023-01-01',
      weight: 25.5,
      location: '台北市'
    };
    
    const { data, error } = await supabase
      .from('pets')
      .insert([testPetData])
      .select();
    
    if (error) {
      console.error('插入測試失敗:', error);
      return { success: false, error };
    }
    
    console.log('測試插入成功:', data);
    
    // 清理測試資料
    if (data && data[0]) {
      await supabase
        .from('pets')
        .delete()
        .eq('id', data[0].id);
      console.log('測試資料已清理');
    }
    
    return { success: true, data };
  } catch (error) {
    console.error('插入測試錯誤:', error);
    return { success: false, error };
  }
}

export async function runFullDiagnostic(userId: string) {
  console.log('=== 開始完整診斷 ===');
  
  const connectionTest = await testDatabaseConnection();
  const schemaTest = await checkPetsTableSchema();
  const insertionTest = await testPetInsertion(userId);
  
  console.log('=== 診斷結果 ===');
  console.log('資料庫連接:', connectionTest.success ? '✅ 成功' : '❌ 失敗');
  console.log('表結構檢查:', schemaTest.success ? '✅ 成功' : '❌ 失敗');
  console.log('資料插入測試:', insertionTest.success ? '✅ 成功' : '❌ 失敗');
  
  return {
    connection: connectionTest,
    schema: schemaTest,
    insertion: insertionTest,
    overall: connectionTest.success && schemaTest.success && insertionTest.success
  };
}
