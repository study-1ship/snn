# Studyroom

Studyroom is a responsive student library for browsing class resources, preparing for exams, and messaging accepted friends. It uses plain HTML, CSS, JavaScript, Vite, and Supabase. The app starts in clearly labeled demo mode when Supabase credentials are not configured; it does not invent notes, accounts, or conversations.

## Run locally

1. Install Node.js 18 or newer.
2. Install dependencies from this folder:

   ```powershell
   npm install
   ```

3. Copy `.env.example` to `.env.local`.
4. For browsing-only demo mode, leave the two values empty. For a connected app, add the Supabase project URL and anon/public key as described below.
5. Start the development server:

   ```powershell
   npm run dev
   ```

6. Open http://localhost:5173. Run `npm run build` to create the static production site in `dist/`.

## Connect Supabase

1. Go to [supabase.com](https://supabase.com), sign in, and create a project. Save the database password somewhere secure; Studyroom does not need that password in its frontend.
2. In the Supabase project, open **SQL Editor** and create a new query. Open `supabase/migrations/202610200001_studyroom.sql`, paste its full contents into the query, and click **Run**. This creates the tables, RLS policies, Realtime publication entry, and Storage bucket.
3. Create a second SQL Editor query. Paste the contents of `supabase/migrations/202610200002_pba_links.sql` and click **Run**. This renames the three requested subjects and adds only the two supplied Computer Science links. Chemistry and Physics stay empty until you add your notes.
4. In **Project Settings > API**, copy the **Project URL** and **anon/public key** (sometimes labeled publishable key) into `.env.local`, in the project root beside `package.json`:

   ```dotenv
   VITE_SUPABASE_URL=https://your-project-ref.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-public-key
   ```

   `.env.example` shows the two variable names. Copy it to `.env.local` first, then fill in the values. The anon/public key is intended for browser use because RLS enforces access. Never use the service-role/secret key in this app. Restart Vite after editing `.env.local`.

5. In **Authentication > URL Configuration**, set **Site URL** to `http://localhost:5173` and add it under **Redirect URLs**. Add your production site URL there too after deployment.
6. Run `npm run dev`, open `http://localhost:5173`, choose **Sign in > Create an account**, and register with an email, password, and unique username. Confirm the email if Supabase asks you to.
7. To make your account an administrator, find the username you registered and run this in Supabase **SQL Editor**, replacing the example username:

   ```sql
   update public.profiles
   set role = 'admin'
   where username = 'your_admin_username';
   ```

   Run this only in the trusted dashboard SQL Editor. Users cannot change their own role. Sign out and back in after promoting the account. **Admin tools** appears in the app sidebar; the direct page is `http://localhost:5173/admin.html`. The upload form writes to Supabase Storage and resource metadata. RLS and Storage policies independently enforce admin-only writes.

The `study-resources` public-read bucket has a 25 MB limit for PDFs, images, Word documents, and PowerPoint documents. Only admins can upload or remove files. Friend/conversation rows and messages are protected by RLS; only the two accepted friends in a conversation can read or send its messages. Realtime delivers incoming messages.

## Subjects and resources

The subject list starts with PBA Chemistry, PBA Physics, and PBA Computer Science, followed by four editable `Existing subject` placeholders. Change the placeholder labels in the migration before applying it, or update the matching `public.subjects` rows later. The second migration adds the two user-supplied Computer Science PBA note links. No Chemistry or Physics notes are seeded.

For demo mode, edit the `subjectFallback` array in `src/main.js`. Class/grade labels are entered with each resource and need no schema change. Empty subjects show a helpful empty state until an administrator publishes material.

Resource types are `notes`, `pba`, `past_paper`, and `exam_prep`. Admins can publish an uploaded file or an external URL from **Admin tools**. `class_grade` and subjects are text/data labels, so the displayed labels can be changed without changing the resource format.

## Deploy

1. Push the project to a Git repository and import it into Vercel, or use another static host.
2. Set the build command to `npm run build` and the output directory to `dist`.
3. Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` to the host's build environment settings. These `VITE_` values are included in browser code; use only the anon/public key.
4. Deploy, then add the production domain under Supabase **Authentication > URL Configuration > Redirect URLs** and set it as the Site URL.
5. Apply future SQL migrations to the same Supabase project before deploying app changes that depend on them.

## Project checks

```powershell
npm run build
```