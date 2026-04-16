import { apiClient } from '../axios'
import type { LoginRequest, LoginResponse } from '@/types/lms'
import type { User } from '@/types/lms'

export const authApi = {
  login:  (data: LoginRequest) =>
    apiClient.post<LoginResponse>('/auth/login', data).then((r) => r.data),

  me:     () =>
    apiClient.get<User>('/auth/me').then((r) => r.data),

  logout: () =>
    apiClient.post('/auth/logout').then((r) => r.data),
}
