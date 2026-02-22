-- courses 테이블에 required_skills 컬럼 추가 (JSONB 배열)
-- 스킬 종류와 기준치를 함께 저장 (예: [{"type": "static", "requirement": "2분"}])
ALTER TABLE public.courses
ADD COLUMN IF NOT EXISTS required_skills JSONB DEFAULT '[]'::jsonb;
