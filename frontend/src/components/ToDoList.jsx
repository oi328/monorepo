export const ToDoList = () => {
  const todos = [
    { text: 'Your work should be done', done: true },
    { text: 'Call follow-up leads', done: false },
  ]

  return (
    <div className="bg-white dark:bg-gray-800 p-4 rounded-md">
      <h3 className="text-lg font-semibold mb-3 text-transparent bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 bg-clip-text">To Do list</h3>
      <ul className="space-y-2">
        {todos.map((t, i) => (
          <li key={i} className="flex items-center justify-between">
            <span className="text-sm text-gray-700 dark:text-gray-300">{t.text}</span>
            <span className={`w-3 h-3 rounded-full ${t.done ? 'bg-green-500' : 'bg-gray-400'}`} />
          </li>
        ))}
      </ul>
    </div>
  )
}