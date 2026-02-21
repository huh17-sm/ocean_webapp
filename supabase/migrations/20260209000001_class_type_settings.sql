-- 수업 타입별 크레딧 설정 테이블 생성
CREATE TABLE IF NOT EXISTS public.class_type_settings (
  type TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  credit_cost INTEGER DEFAULT 1 NOT NULL,
  is_active BOOLEAN DEFAULT true NOT NULL,
  sort_order INTEGER DEFAULT 0 NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 초기 데이터 삽입
INSERT INTO public.class_type_settings (type, label, credit_cost, sort_order) VALUES
  ('theory', '이론 교육', 0, 1),
  ('pool', '풀장 교육', 1, 2),
  ('training', '트레이닝', 2, 3)
ON CONFLICT (type) DO NOTHING;

-- RLS 정책 설정 (모든 사용자 읽기 가능, 관리자만 수정 가능)
ALTER TABLE public.class_type_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view class type settings" ON public.class_type_settings;
CREATE POLICY "Anyone can view class type settings"
  ON public.class_type_settings
  FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Only admins can modify class type settings" ON public.class_type_settings;
CREATE POLICY "Only admins can modify class type settings"
  ON public.class_type_settings
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- classes 테이블에서 credit_cost 컬럼 제거
ALTER TABLE public.classes DROP COLUMN IF EXISTS credit_cost;
