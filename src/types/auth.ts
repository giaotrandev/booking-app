export interface TokenPayload {
  userId: string;
  role?: string;
  sessionId?: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface UserTokenResponse {
  id: string;
  email: string;
  name?: string;
  role?: string;
  accessToken: string;
}
