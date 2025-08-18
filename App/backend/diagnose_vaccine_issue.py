#!/usr/bin/env python3
"""
疫苗記錄問題診斷工具
檢查資料庫結構和權限設定
"""

import psycopg2
from psycopg2.extras import RealDictCursor
import os
from dotenv import load_dotenv

# 載入環境變數
load_dotenv()

DATABASE_URL = "postgresql://postgres:LaRLgZWac1t3NHFh@db.hkjclbdisriyqsvcpmnp.supabase.co:5432/postgres?sslmode=require"

def check_database_structure():
    """檢查資料庫結構"""
    print("🔍 檢查資料庫結構...")
    print("=" * 50)
    
    try:
        conn = psycopg2.connect(DATABASE_URL)
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            
            # 檢查 vaccine_records 表結構
            print("📋 vaccine_records 表結構:")
            cur.execute("""
                SELECT column_name, data_type, is_nullable, column_default
                FROM information_schema.columns
                WHERE table_name = 'vaccine_records'
                ORDER BY ordinal_position;
            """)
            
            columns = cur.fetchall()
            if not columns:
                print("❌ vaccine_records 表不存在")
                return False
            
            for col in columns:
                print(f"  - {col['column_name']}: {col['data_type']} "
                      f"({'NULL' if col['is_nullable'] == 'YES' else 'NOT NULL'})")
            
            # 檢查 RLS 政策
            print("\n🔒 檢查 RLS 政策:")
            cur.execute("""
                SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
                FROM pg_policies
                WHERE tablename = 'vaccine_records';
            """)
            
            policies = cur.fetchall()
            if policies:
                for policy in policies:
                    print(f"  - {policy['policyname']}: {policy['cmd']}")
            else:
                print("❌ 沒有找到 RLS 政策")
            
            # 檢查是否啟用 RLS
            cur.execute("""
                SELECT relname, relrowsecurity
                FROM pg_class
                WHERE relname = 'vaccine_records';
            """)
            
            rls_status = cur.fetchone()
            if rls_status:
                print(f"🔐 RLS 狀態: {'啟用' if rls_status['relrowsecurity'] else '停用'}")
            
            # 檢查 pets 表是否存在
            print("\n🐾 檢查 pets 表:")
            cur.execute("""
                SELECT COUNT(*) as count FROM information_schema.tables
                WHERE table_name = 'pets';
            """)
            
            pets_exists = cur.fetchone()['count'] > 0
            print(f"pets 表存在: {'是' if pets_exists else '否'}")
            
            if pets_exists:
                cur.execute("SELECT COUNT(*) as count FROM pets;")
                pets_count = cur.fetchone()['count']
                print(f"寵物記錄數量: {pets_count}")
            
            return True
            
    except Exception as e:
        print(f"❌ 資料庫檢查失敗: {e}")
        return False
    finally:
        if 'conn' in locals():
            conn.close()

def check_user_permissions():
    """檢查使用者權限"""
    print("\n👤 檢查使用者權限...")
    print("=" * 30)
    
    try:
        conn = psycopg2.connect(DATABASE_URL)
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            
            # 檢查目前使用者
            cur.execute("SELECT current_user, current_database();")
            user_info = cur.fetchone()
            print(f"目前使用者: {user_info['current_user']}")
            print(f"目前資料庫: {user_info['current_database']}")
            
            # 檢查對 vaccine_records 的權限
            cur.execute("""
                SELECT privilege_type
                FROM information_schema.role_table_grants
                WHERE table_name = 'vaccine_records'
                AND grantee = current_user;
            """)
            
            permissions = cur.fetchall()
            if permissions:
                print("vaccine_records 權限:", [p['privilege_type'] for p in permissions])
            else:
                print("❌ 沒有 vaccine_records 的直接權限")
            
    except Exception as e:
        print(f"❌ 權限檢查失敗: {e}")
    finally:
        if 'conn' in locals():
            conn.close()

def test_insert_operation():
    """測試插入操作"""
    print("\n🧪 測試插入操作...")
    print("=" * 30)
    
    try:
        conn = psycopg2.connect(DATABASE_URL)
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            
            # 檢查是否有寵物記錄
            cur.execute("SELECT id, name FROM pets LIMIT 1;")
            pet = cur.fetchone()
            
            if not pet:
                print("❌ 沒有寵物記錄可供測試")
                return
            
            print(f"使用測試寵物: {pet['name']} (ID: {pet['id']})")
            
            # 嘗試插入測試疫苗記錄
            test_data = {
                'pet_id': pet['id'],
                'vaccine_name': '測試疫苗',
                'date': '2024-01-01',
                'next_due_date': '2025-01-01'
            }
            
            print("嘗試插入測試記錄...")
            cur.execute("""
                INSERT INTO vaccine_records (pet_id, vaccine_name, date, next_due_date)
                VALUES (%(pet_id)s, %(vaccine_name)s, %(date)s, %(next_due_date)s)
                RETURNING *;
            """, test_data)
            
            result = cur.fetchone()
            print(f"✅ 插入成功: {result['id']}")
            
            # 清理測試資料
            cur.execute("DELETE FROM vaccine_records WHERE id = %s;", (result['id'],))
            conn.commit()
            print("✅ 測試資料已清理")
            
    except Exception as e:
        print(f"❌ 插入測試失敗: {e}")
        if 'conn' in locals():
            conn.rollback()
    finally:
        if 'conn' in locals():
            conn.close()

def main():
    """主程式"""
    print("🐾 PawsConnect 疫苗記錄問題診斷工具")
    print("=" * 60)
    
    # 檢查資料庫結構
    if not check_database_structure():
        print("\n❌ 資料庫結構檢查失敗，請檢查 migration 是否已執行")
        return
    
    # 檢查使用者權限
    check_user_permissions()
    
    # 測試插入操作
    test_insert_operation()
    
    print("\n" + "=" * 60)
    print("📋 診斷完成！")
    print("\n💡 如果發現問題，請:")
    print("1. 確保所有 migration 檔案已執行")
    print("2. 檢查 Supabase RLS 設定")
    print("3. 確認使用者已登入且有正確的 JWT token")

if __name__ == "__main__":
    main()
