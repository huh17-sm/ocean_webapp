-- Add is_completed column to classes table
ALTER TABLE public.classes 
ADD COLUMN IF NOT EXISTS is_completed BOOLEAN DEFAULT false;

-- Add comment to the column
COMMENT ON COLUMN public.classes.is_completed IS 'Indicates if the class is completed and ready for debriefing';
