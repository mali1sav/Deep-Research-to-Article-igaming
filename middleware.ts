export const config = {
  matcher: '/:path*',
};

export default function middleware(request: Request): Response | undefined {
  const authHeader = request.headers.get('authorization');

  if (authHeader) {
    const base64Credentials = authHeader.split(' ')[1];
    const credentials = atob(base64Credentials);
    const [username, password] = credentials.split(':');

    const validUsername = process.env.BASIC_AUTH_USER;
    const validPassword = process.env.BASIC_AUTH_PASSWORD;

    if (username === validUsername && password === validPassword) {
      return undefined; // Allow the request to proceed
    }
  }

  return new Response('Authentication required', {
    status: 401,
    headers: {
      'WWW-Authenticate': 'Basic realm="Secure Area"',
    },
  });
}
