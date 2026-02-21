-- Add credit_cost column to classes table
ALTER TABLE public.classes 
ADD COLUMN IF NOT EXISTS credit_cost integer DEFAULT 1;

-- Add comment for clarity
COMMENT ON COLUMN public.classes.credit_cost IS '수업 참여 시 소모되는 크레딧(횟수) 점수';
