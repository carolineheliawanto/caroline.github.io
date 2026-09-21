export { default } from 'next-auth/middleware';

export const config = {
  matcher: ['/today/:path*', '/onboarding/:path*', '/profile/:path*', '/progress/:path*'],
};
