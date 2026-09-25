-- نفّذ هذا الأمر مرة واحدة فقط في SQL Editor داخل مشروع Supabase الخاص بكم

create table kv_store (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);

alter table kv_store enable row level security;

-- سياسة تسمح بالقراءة والكتابة لأي زائر يملك المفتاح العام (anon key)
-- التطبيق نفسه لديه نظام تسجيل دخول خاص به (إدارة/مناديب)، لذا هذا مناسب لأداة داخلية
create policy "allow all for anon" on kv_store
  for all
  to anon
  using (true)
  with check (true);
