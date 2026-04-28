import NextAuth, { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
    }),
  ],
  callbacks: {
    async jwt({ token, account }) {
      // 최초 로그인 시 account 객체가 존재하며 id_token을 포함합니다.
      if (account && account.id_token) {
        try {
          const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
          const res = await fetch(`${apiUrl}/api/auth/google`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id_token: account.id_token }),
          });
          const data = await res.json();
          if (res.ok) {
            token.accessToken = data.access_token;
            token.user_id = data.user.id;
          } else {
            console.error("Backend auth failed:", data);
          }
        } catch (error) {
          console.error("Backend auth request error:", error);
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session?.user) {
        // @ts-ignore
        session.accessToken = token.accessToken;
        // @ts-ignore
        session.user.id = token.user_id;
      }
      return session;
    },
  },
  session: {
    strategy: "jwt",
  },
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
