-- Convites de cadastro (Supabase próprio do projeto "capgo", não o Lovable Cloud).
-- Um admin gera um link com o papel de acesso; o papel é aplicado quando a pessoa
-- confirma o e-mail. Uso único, com validade. Rode uma vez no SQL Editor do Supabase.

create table public.convites (
  id uuid primary key default gen_random_uuid(),
  role public.app_role not null,
  email text check (email is null or email = lower(trim(email))),
  expira_em timestamptz not null default now() + interval '7 days',
  criado_por uuid references auth.users(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  usado_por uuid references auth.users(id) on delete set null,
  usado_em timestamptz,
  revogado boolean not null default false
);

alter table public.convites enable row level security;

create policy "convites: admin gerencia" on public.convites
  for all to authenticated
  using (private.has_role(auth.uid(), 'admin'))
  with check (private.has_role(auth.uid(), 'admin'));

grant select, insert, update, delete on public.convites to authenticated;

-- Página de cadastro: mostra para que papel é o convite, sem expor a tabela.
create or replace function public.ver_convite(_id uuid)
returns table (role public.app_role, email text, valido boolean)
language sql stable security definer set search_path = ''
as $$
  select c.role, c.email,
         (not c.revogado and c.usado_em is null and c.expira_em > now()) as valido
  from public.convites c where c.id = _id;
$$;
revoke all on function public.ver_convite(uuid) from public;
grant execute on function public.ver_convite(uuid) to anon, authenticated;

-- Aplica o convite quando o e-mail é confirmado (mesmo momento de grant_initial_admin).
create or replace function public.aplicar_convite()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  v_txt text := new.raw_user_meta_data->>'convite';
  v_id uuid;
  v_conv public.convites%rowtype;
begin
  if v_txt is null
     or new.email_confirmed_at is null
     or not (tg_op = 'INSERT' or old.email_confirmed_at is null)
     or v_txt !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
    return new;
  end if;
  v_id := v_txt::uuid;

  select * into v_conv from public.convites
  where id = v_id and not revogado and usado_em is null and expira_em > now()
  for update;
  if not found then return new; end if;
  if v_conv.email is not null and v_conv.email <> lower(new.email) then return new; end if;

  insert into public.user_roles (user_id, role) values (new.id, v_conv.role) on conflict do nothing;
  update public.convites set usado_por = new.id, usado_em = now() where id = v_id;
  return new;
end $$;
revoke all on function public.aplicar_convite() from public, anon, authenticated;

create trigger on_auth_user_confirmed_convite
  after update of email_confirmed_at on auth.users
  for each row execute function public.aplicar_convite();

create trigger on_auth_user_created_convite
  after insert on auth.users
  for each row execute function public.aplicar_convite();
