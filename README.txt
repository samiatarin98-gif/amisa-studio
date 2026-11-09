AMISA STUDIO — CONNECTED WEBSITE PACKAGE

WHAT THIS PACKAGE CONTAINS
- index.html: public affiliate product website
- admin.html: private admin login and product manager at /admin.html (also available at /admin)
- config.js: your Supabase project connection details (placeholders for now)
- schema.sql: database and secure access rules
- app.js / admin.js / style.css: website functionality and styling

IMPORTANT: THIS PACKAGE IS READY TO CONNECT, BUT IT IS NOT CONNECTED TO YOUR PRIVATE DATABASE YET.
You must create your own Supabase project and paste its Project URL and anon/public key into config.js. Do NOT put a service_role key or password in config.js or share secret keys in chat.

SETUP
1. Create a Supabase account and a new project at https://supabase.com/dashboard.
2. In the project, open SQL Editor > New query. Open schema.sql from this package, copy all its contents and run it.
3. In Supabase, open Project Settings > API (or API Keys). Copy the Project URL and anon/public key. Put them into config.js, replacing the two PASTE_... placeholders. Only use the anon/public key.
4. In Supabase Authentication > Users, add your own user with your email and a strong password. Confirm the user if the dashboard asks you to.
5. Copy that user's UUID from the Users list. In SQL Editor, run this one statement, replacing the sample UUID:
   insert into public.admin_users (user_id) values ('YOUR-USER-UUID-HERE');
6. Upload the CONTENTS of this folder to Netlify (drag the folder or a ZIP containing index.html at its top level to https://app.netlify.com/drop).
7. Your public site is the Netlify URL. Your admin page is that URL plus /admin or /admin.html.
8. Sign in at /admin with the email and password you created in Supabase Authentication > Users.

ADDING PRODUCTS
- Sign in to /admin.html.
- Enter product name, category, optional price, description and affiliate link.
- Choose a product photo (JPG, PNG or WebP, maximum 5 MB).
- Click Save product. It will appear on the public website for all visitors.
- Use Edit or Delete to manage products.

SECURITY NOTES
- Public visitors can only read product listings and images.
- Only a user whose UUID is added to public.admin_users can add, edit or delete products and upload images.
- Never share your Supabase password or service_role/secret key.
- Do not enable public user signups. Create admin users yourself in the Supabase dashboard and add only trusted UUIDs to admin_users.

The website uses Supabase's hosted JavaScript client from jsDelivr, so visitors need an internet connection. This setup requires a Supabase account and a Netlify deployment. The Netlify website is not published automatically by this package.
