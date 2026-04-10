import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center text-center px-4">
      <p className="text-6xl font-bold text-gray-200 mb-4">404</p>
      <h1 className="text-xl font-semibold text-gray-900 mb-2">Страница не найдена</h1>
      <p className="text-sm text-gray-500 mb-6">Запрошенная страница не существует.</p>
      <Link href="/leads" className="text-sm text-primary-600 hover:underline">← На главную</Link>
    </div>
  )
}
