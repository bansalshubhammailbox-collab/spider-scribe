-- Create test_sessions table
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

-- Create test_results table
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

-- Create annotation_files table
CREATE TABLE public.annotation_files (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  database_name TEXT NOT NULL,
  sample_rows INTEGER NOT NULL,
  file_name TEXT NOT NULL,
  annotations_data JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  file_size INTEGER NOT NULL DEFAULT 0
);

-- Create schema_files table
CREATE TABLE public.schema_files (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  database_name TEXT NOT NULL,
  sample_rows INTEGER NOT NULL,
  file_name TEXT NOT NULL,
  schema_data JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  extraction_duration INTEGER NOT NULL DEFAULT 0
);

-- Enable Row Level Security
ALTER TABLE public.test_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.test_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.annotation_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.schema_files ENABLE ROW LEVEL SECURITY;

-- Create RLS policies (allowing all operations for now - can be restricted later for multi-user)
CREATE POLICY "Allow all operations on test_sessions" ON public.test_sessions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on test_results" ON public.test_results FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on annotation_files" ON public.annotation_files FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on schema_files" ON public.schema_files FOR ALL USING (true) WITH CHECK (true);

-- Create indexes for performance
CREATE INDEX idx_test_results_session_id ON public.test_results(session_id);
CREATE INDEX idx_test_sessions_database ON public.test_sessions(database);
CREATE INDEX idx_test_sessions_created_at ON public.test_sessions(created_at);
CREATE INDEX idx_annotation_files_database_name ON public.annotation_files(database_name);
CREATE INDEX idx_annotation_files_sample_rows ON public.annotation_files(sample_rows);
CREATE INDEX idx_schema_files_database_name ON public.schema_files(database_name);
CREATE INDEX idx_schema_files_sample_rows ON public.schema_files(sample_rows);