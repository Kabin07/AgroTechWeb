// Picks the backend: Supabase when keys are configured, otherwise the on-device demo.
import { supabase } from "../../lib/supabaseClient";
import { createLocalBackend } from "./localBackend";
import { createSupabaseBackend } from "./supabaseBackend";

export const backend = supabase ? createSupabaseBackend(supabase) : createLocalBackend();
export { BackendError } from "./errors";
