# Studyroom workspace notes

- This is a vanilla HTML, CSS, and JavaScript app built with Vite and Supabase.
- Keep Supabase authorization in SQL Row Level Security policies; browser code uses only the anon/public key.
- Never add the service-role key to frontend code or `VITE_` variables.
- Put database changes in new files under `supabase/migrations/`.
- Do not add invented study resources, accounts, or message examples.
- Keep the four existing subject labels as editable placeholders until their real names are provided.