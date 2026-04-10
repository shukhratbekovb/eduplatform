import { apiClient } from '@/lib/api/axios'
import type { User } from '@/types/crm'

export interface LoginDto {
  email: string
  password: string
}

export interface LoginResponse {
  user: User
  accessToken: string
  refreshToken: string
}

export const authApi = {
  login: (dto: LoginDto) =>
    apiClient.post<LoginResponse>('/auth/login', dto).then((r) => r.data),

  me: () =>
    apiClient.get<User>('/auth/me').then((r) => r.data),

  logout: () =>
    apiClient.post('/auth/logout'),
}
