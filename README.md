# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Environment Configuration

Create a local environment file (for example `.env.local`) and add your Supabase credentials:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-public-anon-key
SUPABASE_SERVICE_ROLE=your-service-role-key
```

- `VITE_SUPABASE_URL` dan `VITE_SUPABASE_PUBLISHABLE_KEY` digunakan oleh aplikasi frontend.
- `SUPABASE_SERVICE_ROLE` hanya boleh digunakan di server-side (misalnya Vercel function) dan tidak boleh dikirimkan ke browser.

For safe reference, you can keep `.env.example` in the repo with placeholders and never commit your real `.env` file.

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.
