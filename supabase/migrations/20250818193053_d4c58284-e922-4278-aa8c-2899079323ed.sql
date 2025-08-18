-- Create database schema for Spider Test Annotation Platform
-- CRITICAL: Supabase stores app data, Snowflake stores live Spider2 data

-- Test sessions storage
CREATE TABLE public.test_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_name TEXT NOT NULL,
  database TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  custom_prompt TEXT,
  total_questions INTEGER NOT NULL DEFAULT 0,
  success_rates JSONB DEFAULT '{"baseline": 0, "schema_only": 0, "full_context": 0}'::jsonb,
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Test results storage
CREATE TABLE public.test_results (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES public.test_sessions(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  baseline_sql TEXT NOT NULL,
  schema_only_sql TEXT NOT NULL,
  full_context_sql TEXT NOT NULL,
  baseline_execution JSONB DEFAULT '{}'::jsonb,
  schema_only_execution JSONB DEFAULT '{}'::jsonb,
  full_context_execution JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Annotation files storage (JSON)
CREATE TABLE public.annotation_files (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  database_name TEXT NOT NULL,
  sample_rows INTEGER NOT NULL DEFAULT 3,
  file_name TEXT NOT NULL,
  annotations_data JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  file_size INTEGER DEFAULT 0
);

-- Schema files storage (JSON)
CREATE TABLE public.schema_files (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  database_name TEXT NOT NULL,
  sample_rows INTEGER NOT NULL DEFAULT 3,
  file_name TEXT NOT NULL,
  schema_data JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  extraction_duration INTEGER DEFAULT 0
);

-- Enable Row Level Security for all tables
ALTER TABLE public.test_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.test_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.annotation_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.schema_files ENABLE ROW LEVEL SECURITY;

-- Create policies for public access (since this is a single-user system initially)
-- For production multi-user, these would be user-specific

CREATE POLICY "Public access to test_sessions" 
ON public.test_sessions 
FOR ALL 
USING (true);

CREATE POLICY "Public access to test_results" 
ON public.test_results 
FOR ALL 
USING (true);

CREATE POLICY "Public access to annotation_files" 
ON public.annotation_files 
FOR ALL 
USING (true);

CREATE POLICY "Public access to schema_files" 
ON public.schema_files 
FOR ALL 
USING (true);

-- Create indexes for performance
CREATE INDEX idx_test_sessions_database ON public.test_sessions(database);
CREATE INDEX idx_test_sessions_created_at ON public.test_sessions(created_at DESC);

CREATE INDEX idx_test_results_session_id ON public.test_results(session_id);
CREATE INDEX idx_test_results_created_at ON public.test_results(created_at DESC);

CREATE INDEX idx_annotation_files_database ON public.annotation_files(database_name);
CREATE INDEX idx_annotation_files_sample_rows ON public.annotation_files(sample_rows);

CREATE INDEX idx_schema_files_database ON public.schema_files(database_name);
CREATE INDEX idx_schema_files_sample_rows ON public.schema_files(sample_rows);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
NEW.updated_at = now();
RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add updated_at columns where needed
ALTER TABLE public.test_sessions ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT now();
ALTER TABLE public.annotation_files ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT now();
ALTER TABLE public.schema_files ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT now();

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_test_sessions_updated_at
BEFORE UPDATE ON public.test_sessions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_annotation_files_updated_at
BEFORE UPDATE ON public.annotation_files
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_schema_files_updated_at
BEFORE UPDATE ON public.schema_files
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();