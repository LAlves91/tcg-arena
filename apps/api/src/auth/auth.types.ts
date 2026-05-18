export interface JwtPayload {
  sub: string;
  sid: string;
  iat?: number;
  exp?: number;
}

export interface AuthenticatedUser {
  userId: string;
  sessionId: string;
}
