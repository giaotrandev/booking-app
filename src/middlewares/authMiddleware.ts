import { Request, Response, NextFunction } from 'express';
import * as TokenHandler from '#utils/tokenHandler';
import { sendUnauthorized, sendForbidden, sendServerError } from '#utils/apiResponse';
import { prisma } from '#src/config/db';
import { TokenPayload } from '#src/types/auth';
import ms from 'ms';

export const authenticateToken = async (req: Request, res: Response, next: NextFunction) => {
  const language = (req.query.lang as string) || process.env.DEFAULT_LANGUAGE || 'en';

  try {
    // const accessTokenCookieName = process.env.NODE_ENV === 'production' ? '__Host-at' : 'at';
    // const refreshTokenCookieName = process.env.NODE_ENV === 'production' ? '__Host-rt' : 'rt';
    const accessTokenCookieName = 'at';
    const refreshTokenCookieName = 'rt';

    const authHeader = req.headers['authorization'];
    const headerToken = authHeader && authHeader.split(' ')[1];

    const cookieToken = req.cookies[accessTokenCookieName];
    const refreshToken = req.cookies[refreshTokenCookieName];

    // Determine which token to use
    const token = headerToken || cookieToken;

    // No tokens present
    if (!token && !refreshToken) {
      return sendUnauthorized(res, 'auth.noToken', null, language);
    }

    // Attempt to verify access token first
    try {
      if (token) {
        const decoded = TokenHandler.verifyToken(token) as TokenPayload;

        // Verify session
        const session = await prisma.loginSession.findUnique({
          where: {
            id: decoded.sessionId,
            isActive: true,
            userId: decoded.userId,
          },
        });

        if (!session) {
          return sendUnauthorized(res, 'auth.invalidSession', null, language);
        }

        // Set user and proceed
        req.user = decoded;
        return next();
      }
    } catch (tokenError) {
      // Token verification failed, proceed to refresh token logic
      if (!(tokenError instanceof Error && tokenError.name === 'TokenExpiredError')) {
        return sendUnauthorized(res, 'auth.invalidToken', null, language);
      }
    }

    // If no valid access token, try refresh token
    if (refreshToken) {
      try {
        // Verify refresh token
        const decodedRefresh = TokenHandler.verifyToken(refreshToken, 'refresh') as TokenPayload;

        // Check refresh token in database
        const storedToken = await prisma.refreshToken.findFirst({
          where: {
            token: refreshToken,
            isRevoked: false,
            expiresAt: { gt: new Date() },
          },
          include: {
            session: {
              include: {
                user: {
                  include: {
                    role: true,
                  },
                },
              },
            },
          },
        });

        if (!storedToken) {
          return sendUnauthorized(res, 'auth.invalidRefreshToken', null, language);
        }

        // Parse token expiration from environment variables
        const ACCESS_TOKEN_EXPIRATION = process.env.ACCESS_TOKEN_EXPIRATION || '1d';
        const accessTokenExpirationMs = ms(ACCESS_TOKEN_EXPIRATION as ms.StringValue);

        // Generate new access token
        const newAccessToken = TokenHandler.generateAccessToken({
          userId: storedToken.session.userId,
          role: storedToken.session.user.role.name,
          sessionId: storedToken.sessionId,
        });

        // Update session activity
        await prisma.loginSession.update({
          where: { id: storedToken.sessionId },
          data: { lastActivityAt: new Date() },
        });

        // Prepare cookie options
        const cookieOptions = {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: process.env.NODE_ENV === 'production' ? ('strict' as const) : ('lax' as const),
          expires: new Date(Date.now() + accessTokenExpirationMs),
          path: '/',
        };

        // Set new access token cookie
        res.cookie(accessTokenCookieName, newAccessToken, {
          ...cookieOptions,
          ...(process.env.NODE_ENV === 'production' && {
            secure: true,
          }),
        });

        // Set user and proceed
        req.user = {
          userId: storedToken.session.userId,
          role: storedToken.session.user.role.name,
          sessionId: storedToken.sessionId,
        };

        return next();
      } catch (refreshError) {
        console.log('Refresh token verification error:', refreshError);
        // Refresh token expired or invalid
        return sendUnauthorized(res, 'auth.refreshTokenExpired', null, language);
      }
    }

    // If we reach here, no valid authentication method was found
    return sendUnauthorized(res, 'auth.noValidToken', null, language);
  } catch (error) {
    // Unexpected server error
    sendServerError(res, 'common.serverError', error instanceof Error ? { message: error.message } : null, language);
  }
};

// export const checkRole = (roles: string[]) => {
//   return (req: Request, res: Response, next: NextFunction) => {
//     if (!req.user || !roles.includes(req.user.role)) {
//       return sendForbidden(res, 'auth.insufficientPermissions');
//     }
//     next();
//   };
// };
