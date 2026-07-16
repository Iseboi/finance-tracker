-- Finance Tracker schema — run this once in the Supabase SQL Editor
create table users (
    id uuid primary key default gen_random_uuid(),
    email text unique not null,
    password_hash text not null,
    created_at timestamptz not null default now()
);

create table expenses (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references users(id) on delete cascade,
    amount numeric(12,2) not null check (amount > 0),
    category text not null,
    description text,
    kind text not null default 'expense' check (kind in ('expense','income')),
    spent_at date not null default current_date,
    created_at timestamptz not null default now()
);

-- Matches the app's hottest query: "this user's entries, newest first"
create index idx_expenses_user_date on expenses (user_id, spent_at desc);
