import { apiClient } from '../axios'
import type { CompensationModel, SalaryCalculation } from '@/types/lms'
import type { SetCompensationDto } from '@/types/lms'

export const compensationApi = {
  list: () =>
    apiClient.get<CompensationModel[]>('/lms/compensation').then((r) => r.data),

  getByTeacher: (teacherId: string) =>
    apiClient.get<CompensationModel>(`/lms/compensation/${teacherId}`).then((r) => r.data),

  set: (teacherId: string, data: SetCompensationDto) =>
    apiClient.put<CompensationModel>(`/lms/compensation/${teacherId}`, data).then((r) => r.data),

  getSalaries: (params?: Record<string, string>) =>
    apiClient.get<SalaryCalculation[]>('/lms/salaries', { params }).then((r) => r.data),

  calculateSalary: (teacherId: string, period: string) =>
    apiClient.post<SalaryCalculation>('/lms/salaries/calculate', { teacherId, period }).then((r) => r.data),
}
