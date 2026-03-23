import { NextAuthOptions } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';

export const authOptions: NextAuthOptions = {
    providers: [
        GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID!,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
            authorization: {
                params: {
                    scope: [
                        'openid',
                        'email',
                        'profile',
                        'https://www.googleapis.com/auth/drive',
                        'https://www.googleapis.com/auth/spreadsheets',
                        'https://www.googleapis.com/auth/cloud-platform',
                    ].join(' '),
                    access_type: 'offline',
                    prompt: 'consent',
                },
            },
        }),
    ],
    secret: process.env.NEXTAUTH_SECRET,
    callbacks: {
        async jwt({ token, account }) {
            // On first sign-in, store access & refresh tokens
            if (account) {
                token.accessToken = account.access_token;
                token.refreshToken = account.refresh_token;
                token.expiresAt = account.expires_at; // seconds since epoch
                return token;
            }

            // Return token if still valid (with 60s buffer)
            const expiresAt = token.expiresAt as number | undefined;
            if (!expiresAt || Date.now() / 1000 < expiresAt - 60) {
                return token;
            }

            // Token expired — refresh it
            console.log('[auth] Access token expired, refreshing...');
            try {
                const res = await fetch('https://oauth2.googleapis.com/token', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                    body: new URLSearchParams({
                        client_id: process.env.GOOGLE_CLIENT_ID!,
                        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
                        grant_type: 'refresh_token',
                        refresh_token: token.refreshToken as string,
                    }),
                });
                const refreshed = await res.json();
                if (!res.ok) throw new Error(JSON.stringify(refreshed));
                console.log('[auth] Token refreshed successfully');
                return {
                    ...token,
                    accessToken: refreshed.access_token,
                    expiresAt: Math.floor(Date.now() / 1000) + refreshed.expires_in,
                };
            } catch (err) {
                console.error('[auth] Token refresh failed:', err);
                // Force re-login by marking token as invalid
                return { ...token, error: 'RefreshAccessTokenError' };
            }
        },
        async session({ session, token }) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (session as any).accessToken = token.accessToken;
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (session as any).error = token.error;
            return session;
        },
    },
};
