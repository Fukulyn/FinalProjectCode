-- 創建核心疫苗狀態表
create table if not exists public.core_vaccine_status (
  id uuid not null default gen_random_uuid(),
  pet_id uuid not null references public.pets(id) on delete cascade,
  vaccine_id text not null,
  completed boolean not null default false,
  completed_at timestamp with time zone,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  constraint core_vaccine_status_pkey primary key (id),
  constraint core_vaccine_status_pet_vaccine_unique unique (pet_id, vaccine_id)
);

-- 設置 RLS 政策
alter table public.core_vaccine_status enable row level security;

-- 允許用戶查看自己寵物的核心疫苗狀態
create policy "Users can view their pets core vaccine status" on public.core_vaccine_status
  for select using (
    exists (
      select 1 from public.pets
      where pets.id = core_vaccine_status.pet_id
      and pets.user_id = auth.uid()
    )
  );

-- 允許用戶插入自己寵物的核心疫苗狀態
create policy "Users can insert their pets core vaccine status" on public.core_vaccine_status
  for insert with check (
    exists (
      select 1 from public.pets
      where pets.id = core_vaccine_status.pet_id
      and pets.user_id = auth.uid()
    )
  );

-- 允許用戶更新自己寵物的核心疫苗狀態
create policy "Users can update their pets core vaccine status" on public.core_vaccine_status
  for update using (
    exists (
      select 1 from public.pets
      where pets.id = core_vaccine_status.pet_id
      and pets.user_id = auth.uid()
    )
  );

-- 允許用戶刪除自己寵物的核心疫苗狀態
create policy "Users can delete their pets core vaccine status" on public.core_vaccine_status
  for delete using (
    exists (
      select 1 from public.pets
      where pets.id = core_vaccine_status.pet_id
      and pets.user_id = auth.uid()
    )
  );

-- 創建索引
create index if not exists idx_core_vaccine_status_pet_id on public.core_vaccine_status(pet_id);
create index if not exists idx_core_vaccine_status_vaccine_id on public.core_vaccine_status(vaccine_id);
