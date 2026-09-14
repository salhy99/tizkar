@echo off
if "%1"=="--version" (echo pg_restore ^(PostgreSQL^) 17.6) else (echo ; Archive created at 2026-09-14 15:43:24
echo 123; 1259 3456 TABLE public profiles my_role
echo 125; 1259 3456 TABLE public invitations my_role
echo 126; 1259 3456 TABLE public invitation_versions my_role
echo 127; 1259 3456 TABLE public orders my_role
echo 128; 0 3456 TABLE DATA public profiles my_role
echo 130; 0 3456 TABLE DATA public invitations my_role
echo 131; 0 3456 TABLE DATA public invitation_versions my_role
echo 132; 0 3456 TABLE DATA public orders my_role
echo 133; 1259 3456 SEQUENCE public some_seq my_role
echo 134; 0 3456 SEQUENCE SET public some_seq my_role
echo 135; 1259 3456 CONSTRAINT public profiles profiles_pkey
echo 136; 1259 3456 FK CONSTRAINT public profiles profiles_user_id_fkey
echo 137; 1259 3456 INDEX public profiles_id_idx
echo 138; 1259 3456 TABLE auth users auth
echo 139; 1259 3456 TABLE auth identities auth
echo 140; 1259 3456 TABLE storage buckets storage
echo 141; 1259 3456 TABLE storage objects storage
echo 142; 1259 3456 TABLE supabase_migrations schema_migrations supabase_admin
echo 143; 1259 3456 SCHEMA auth auth
echo 144; 1259 3456 SCHEMA storage storage)
