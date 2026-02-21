-- 1. profiles 테이블에 리얼타임 기능 활성화
ALTER TABLE public.profiles REPLICA IDENTITY FULL;

-- 2. supabase_realtime 발행물(publication)에 profiles 테이블 추가
-- 이미 존재할 경우 무시하도록 처리
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
        AND schemaname = 'public' 
        AND tablename = 'profiles'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;
    END IF;
END $$;
