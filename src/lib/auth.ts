import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { supabaseAdmin } from "@/lib/supabase";
import bcrypt from "bcryptjs";

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          console.log("Auth: Missing credentials");
          return null;
        }

        const db = supabaseAdmin();
        const { data: user, error } = await db
          .from("usuarios")
          .select("*")
          .eq("email", credentials.email)
          .eq("activo", true)
          .single();

        if (error) {
          console.error("Auth: Error looking up user:", error);
        }

        if (!user) {
          console.log("Auth: User not found or inactive:", credentials.email);
          return null;
        }

        console.log("Auth: User found, checking password...");
        const valid = await bcrypt.compare(
          credentials.password as string,
          user.password_hash
        );
        
        if (!valid) {
          console.log("Auth: Invalid password for:", credentials.email);
          return null;
        }

        console.log("Auth: Login successful for:", credentials.email);

        return {
          id: user.id,
          email: user.email,
          name: user.nombre,
          role: user.rol,
        };
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) token.role = (user as { role: string }).role;
      return token;
    },
    session({ session, token }) {
      if (session.user) session.user.role = token.role as string;
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
  session: { strategy: "jwt" },
});
