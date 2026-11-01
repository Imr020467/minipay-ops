import NextAuth from "next-auth";
import Google from "next-auth/providers/google";

const API = process.env.GO_API_URL ?? "http://localhost:8080";

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [Google],
  pages: { signIn: "/login" },
  callbacks: {
    async jwt({ token, account, profile }) {
      // Runs at sign-in: register or find this person in our database.
      if (account && profile) {
        if (!profile.email_verified) throw new Error("Email not verified");

        const res = await fetch(`${API}/api/internal/users/sync`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Internal-Secret": process.env.INTERNAL_API_SECRET,
          },
          body: JSON.stringify({
            sub: profile.sub,
            email: profile.email,
            name: profile.name,
            picture: profile.picture,
          }),
        });
        if (!res.ok) throw new Error("Could not sync user");

        const data = await res.json();
        token.userId = data.user_id;
      }
      return token;
    },
    async session({ session, token }) {
      session.user.id = token.userId;
      return session;
    },
  },
});